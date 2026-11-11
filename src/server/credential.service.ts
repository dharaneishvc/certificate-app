import type { CredentialVisibility, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { canonicalize } from "@/lib/canonical";
import { decryptSecret, randomId, recipientEmailHash, sha256Hex, signData } from "@/lib/crypto";
import { errors } from "@/lib/http";
import type { SessionUser } from "@/lib/session";
import type { CredentialPayload } from "@/lib/types";
import type { IssueInput, TemplateField } from "@/lib/validators";
import { audit } from "./audit";
import { getOrgBySlug } from "./org.service";
import { getChain, requireRole } from "./permissions";

export async function issueCredentials(actor: SessionUser, slug: string, input: IssueInput) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ISSUER");

  const template = await db.template.findFirst({
    where: { id: input.templateId, orgId: org.id, archived: false },
    include: {
      signatories: {
        orderBy: { position: "asc" },
        include: { membership: { select: { title: true, user: { select: { name: true } } } } },
      },
    },
  });
  if (!template) throw errors.notFound("Template");

  const key = await db.orgKey.findFirst({ where: { orgId: org.id, active: true }, orderBy: { createdAt: "desc" } });
  if (!key) throw new Error(`Organisation ${org.id} has no active signing key`);

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) throw errors.validation("Expiry date must be in the future");

  const fieldDefs = template.fields as unknown as TemplateField[];
  const rowErrors: string[] = [];
  input.recipients.forEach((r, i) => {
    const missing = fieldDefs.filter((f) => f.required && !r.fields[f.key]?.trim()).map((f) => f.label);
    if (missing.length) rowErrors.push(`Row ${i + 1} (${r.email}): missing ${missing.join(", ")}`);
  });
  if (rowErrors.length) throw errors.validation(rowErrors[0], { rows: rowErrors });

  const chain = await getChain(org.id);
  const privateKey = decryptSecret(key.encryptedPrivateKey);
  const signatories = template.signatories.map((s) => ({
    name: s.membership.user.name,
    title: s.membership.title,
  }));
  const issuedAt = new Date();

  const verifiedUsers = await db.user.findMany({
    where: { email: { in: input.recipients.map((r) => r.email) }, emailVerifiedAt: { not: null } },
    select: { id: true, email: true },
  });
  const userIdByEmail = new Map(verifiedUsers.map((u) => [u.email, u.id]));

  const rows: Prisma.CredentialCreateManyInput[] = input.recipients.map((r) => {
    const id = randomId(12);
    const payload: CredentialPayload = {
      v: 1,
      id,
      type: template.type,
      title: template.name,
      description: template.description,
      issuer: { id: org.id, slug: org.slug, name: org.name, chain: chain.map((o) => o.name) },
      recipient: { name: r.name, emailHash: recipientEmailHash(r.email, id) },
      fields: fieldDefs
        .filter((f) => r.fields[f.key]?.trim())
        .map((f) => ({ label: f.label, value: r.fields[f.key].trim() })),
      signatories,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt?.toISOString() ?? null,
      keyId: key.id,
    };
    const canonical = canonicalize(payload);

    return {
      id,
      orgId: org.id,
      templateId: template.id,
      recipientId: userIdByEmail.get(r.email) ?? null,
      recipientEmail: r.email,
      recipientName: r.name,
      title: template.name,
      type: template.type,
      payload: payload as unknown as Prisma.InputJsonValue,
      payloadHash: sha256Hex(canonical),
      signature: signData(privateKey, canonical),
      keyId: key.id,
      issuedAt,
      expiresAt,
      issuedById: actor.id,
    };
  });

  await db.$transaction([
    db.credential.createMany({ data: rows }),
    db.auditLog.create({
      data: {
        orgId: org.id,
        actorId: actor.id,
        action: "CREDENTIALS_ISSUED",
        targetType: "Template",
        targetId: template.id,
        meta: { count: rows.length, ids: rows.slice(0, 50).map((r) => r.id) },
      },
    }),
  ]);

  return rows.map((r) => r.id);
}

export async function revokeCredential(actor: SessionUser, credentialId: string, reason: string) {
  const credential = await db.credential.findUnique({ where: { id: credentialId } });
  if (!credential) throw errors.notFound("Credential");
  await requireRole(actor.id, credential.orgId, "ISSUER");
  if (credential.status === "REVOKED") throw errors.conflict("Credential is already revoked");

  await db.credential.update({
    where: { id: credentialId },
    data: { status: "REVOKED", revokedAt: new Date(), revokedReason: reason },
  });
  await audit({
    orgId: credential.orgId,
    actorId: actor.id,
    action: "CREDENTIAL_REVOKED",
    targetType: "Credential",
    targetId: credentialId,
    meta: { reason },
  });
}

export async function setCredentialVisibility(user: SessionUser, credentialId: string, visibility: CredentialVisibility) {
  const { count } = await db.credential.updateMany({
    where: { id: credentialId, recipientId: user.id },
    data: { visibility },
  });
  if (count === 0) throw errors.notFound("Credential");
}

const listSelect = {
  id: true,
  title: true,
  type: true,
  visibility: true,
  status: true,
  issuedAt: true,
  expiresAt: true,
  org: { select: { name: true, slug: true, domainStatus: true } },
} satisfies Prisma.CredentialSelect;

export function listHolderCredentials(userId: string) {
  return db.credential.findMany({ where: { recipientId: userId }, select: listSelect, orderBy: { issuedAt: "desc" } });
}

export function listProfileCredentials(userId: string) {
  return db.credential.findMany({
    where: { recipientId: userId, visibility: "PUBLIC", status: "ACTIVE" },
    select: listSelect,
    orderBy: { issuedAt: "desc" },
  });
}

export function listOrgCredentials(orgId: string, take = 100) {
  return db.credential.findMany({
    where: { orgId },
    select: {
      id: true,
      title: true,
      recipientName: true,
      recipientEmail: true,
      recipientId: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
    },
    orderBy: { issuedAt: "desc" },
    take,
  });
}
