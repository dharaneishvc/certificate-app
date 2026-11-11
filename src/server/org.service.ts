import { resolveTxt } from "node:dns/promises";
import { Prisma, type OrgRole } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import { encryptSecret, generateSigningKeyPair, randomId, randomToken } from "@/lib/crypto";
import { ApiError, errors } from "@/lib/http";
import type { SessionUser } from "@/lib/session";
import type { addMemberSchema, createOrgSchema, updateMemberSchema, updateOrgSchema } from "@/lib/validators";
import { audit } from "./audit";
import { getChain, getTrust, requireRole } from "./permissions";

export const DOMAIN_TXT_PREFIX = "credora-verify=";

export async function getOrgBySlug(slug: string) {
  const org = await db.organization.findUnique({ where: { slug } });
  if (!org) throw errors.notFound("Organisation");
  return org;
}

export async function createOrg(actor: SessionUser, input: z.infer<typeof createOrgSchema>) {
  if (!actor.emailVerifiedAt) throw errors.forbidden("Please verify your email address first");

  let parentId: string | null = null;
  if (input.parentSlug) {
    const parent = await getOrgBySlug(input.parentSlug);
    await requireRole(actor.id, parent.id, "ADMIN");
    parentId = parent.id;
  }

  const { publicKey, privateKey } = generateSigningKeyPair();

  try {
    return await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          slug: input.slug,
          name: input.name,
          description: input.description || null,
          website: input.website,
          parentId,
          createdById: actor.id,
          domainToken: randomToken(16),
          keys: {
            create: { id: `key_${randomId(16)}`, publicKey, encryptedPrivateKey: encryptSecret(privateKey) },
          },
          memberships: {
            create: { userId: actor.id, roles: ["ADMIN", "ISSUER", "SIGNATORY"], title: "Administrator" },
          },
        },
      });
      await audit(
        { orgId: org.id, actorId: actor.id, action: "ORG_CREATED", targetType: "Organization", targetId: org.id, meta: { parentId } },
        tx,
      );
      return org;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw errors.conflict("That slug is already taken");
    }
    throw err;
  }
}

export async function updateOrg(actor: SessionUser, slug: string, input: z.infer<typeof updateOrgSchema>) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ADMIN");

  const data: Prisma.OrganizationUpdateInput = {
    name: input.name,
    description: input.description,
    website: input.website,
  };
  if (input.domain !== undefined && input.domain !== org.domain) {
    data.domain = input.domain;
    data.domainStatus = input.domain ? "PENDING" : "NONE";
    data.domainVerifiedAt = null;
  }

  const updated = await db.organization.update({ where: { id: org.id }, data });
  await audit({ orgId: org.id, actorId: actor.id, action: "ORG_UPDATED", targetType: "Organization", targetId: org.id });
  return updated;
}

export async function verifyDomain(actor: SessionUser, slug: string) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ADMIN");
  if (!org.domain) throw errors.validation("Set a domain first");
  if (org.domainStatus === "VERIFIED") return org;

  let records: string[] = [];
  try {
    records = (await resolveTxt(org.domain)).map((chunks) => chunks.join(""));
  } catch {
    // NXDOMAIN / no TXT records — fall through to the not-found error.
  }
  if (!records.includes(`${DOMAIN_TXT_PREFIX}${org.domainToken}`)) {
    throw new ApiError(400, "DOMAIN_NOT_VERIFIED", `TXT record not found on ${org.domain}. DNS changes can take a few minutes.`);
  }

  const updated = await db.organization.update({
    where: { id: org.id },
    data: { domainStatus: "VERIFIED", domainVerifiedAt: new Date() },
  });
  await audit({
    orgId: org.id,
    actorId: actor.id,
    action: "DOMAIN_VERIFIED",
    targetType: "Organization",
    targetId: org.id,
    meta: { domain: org.domain },
  });
  return updated;
}

export async function getOrgPublicView(slug: string) {
  const org = await db.organization.findUnique({
    where: { slug },
    include: {
      children: { select: { slug: true, name: true }, orderBy: { name: "asc" } },
      keys: { select: { id: true, publicKey: true, active: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { credentials: true } },
    },
  });
  if (!org) return null;
  const chain = await getChain(org.id);
  return { org, chain, trust: getTrust(chain) };
}

export function listUserOrgs(userId: string) {
  return db.membership.findMany({
    where: { userId },
    include: { org: { select: { slug: true, name: true, domainStatus: true, parentId: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listMembers(orgId: string) {
  return db.membership.findMany({
    where: { orgId },
    include: { user: { select: { name: true, handle: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listRecentAudit(orgId: string, take = 30) {
  return db.auditLog.findMany({
    where: { orgId },
    include: { actor: { select: { name: true, handle: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

async function assertNotLastAdmin(orgId: string, membershipId: string, nextRoles: OrgRole[] | null) {
  if (nextRoles?.includes("ADMIN")) return;
  const admins = await db.membership.findMany({
    where: { orgId, roles: { has: "ADMIN" } },
    select: { id: true },
  });
  if (admins.length === 1 && admins[0].id === membershipId) {
    throw errors.conflict("An organisation must keep at least one admin");
  }
}

export async function addMember(actor: SessionUser, slug: string, input: z.infer<typeof addMemberSchema>) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ADMIN");

  const identifier = input.identifier.trim();
  const user = await db.user.findUnique({
    where: identifier.includes("@") ? { email: identifier.toLowerCase() } : { handle: identifier.toUpperCase() },
    select: { id: true },
  });
  if (!user) throw errors.notFound("User with that handle or email");

  try {
    const membership = await db.membership.create({
      data: { orgId: org.id, userId: user.id, roles: [...new Set(input.roles)], title: input.title || null },
    });
    await audit({
      orgId: org.id,
      actorId: actor.id,
      action: "MEMBER_ADDED",
      targetType: "Membership",
      targetId: membership.id,
      meta: { userId: user.id, roles: input.roles },
    });
    return membership;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw errors.conflict("This user is already a member");
    }
    throw err;
  }
}

async function getMembershipInOrg(orgId: string, membershipId: string) {
  const membership = await db.membership.findFirst({ where: { id: membershipId, orgId } });
  if (!membership) throw errors.notFound("Member");
  return membership;
}

export async function updateMember(
  actor: SessionUser,
  slug: string,
  membershipId: string,
  input: z.infer<typeof updateMemberSchema>,
) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ADMIN");
  await getMembershipInOrg(org.id, membershipId);
  if (input.roles) await assertNotLastAdmin(org.id, membershipId, input.roles);

  const membership = await db.membership.update({
    where: { id: membershipId },
    data: { roles: input.roles ? [...new Set(input.roles)] : undefined, title: input.title },
  });
  await audit({
    orgId: org.id,
    actorId: actor.id,
    action: "MEMBER_UPDATED",
    targetType: "Membership",
    targetId: membershipId,
    meta: input,
  });
  return membership;
}

export async function removeMember(actor: SessionUser, slug: string, membershipId: string) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ADMIN");
  await getMembershipInOrg(org.id, membershipId);
  await assertNotLastAdmin(org.id, membershipId, null);

  await db.membership.delete({ where: { id: membershipId } });
  await audit({ orgId: org.id, actorId: actor.id, action: "MEMBER_REMOVED", targetType: "Membership", targetId: membershipId });
}
