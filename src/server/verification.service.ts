import type { CredentialStatus, OrgKey } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import { canonicalize } from "@/lib/canonical";
import { sha256Hex, verifyData } from "@/lib/crypto";
import type { CredentialPayload, CredentialProof, VerificationResult, VerificationState } from "@/lib/types";
import type { verifyDocumentSchema } from "@/lib/validators";
import { getChain, getEffectiveRoles, getTrust } from "./permissions";

interface StatusInfo {
  status: CredentialStatus;
  revokedAt: Date | null;
  revokedReason: string | null;
}

async function evaluate(
  payload: CredentialPayload,
  proof: CredentialProof,
  key: Pick<OrgKey, "orgId" | "publicKey"> | null,
  statusInfo: StatusInfo | null,
): Promise<VerificationResult> {
  const notRevoked = statusInfo?.status !== "REVOKED";
  const notExpired = !payload.expiresAt || new Date(payload.expiresAt) > new Date();

  let hash = false;
  let signature = false;
  // Never trust a key supplied by the caller — only keys registered to the claimed issuer.
  if (key && key.orgId === payload.issuer?.id) {
    const canonical = canonicalize(payload);
    hash = sha256Hex(canonical) === proof.hash;
    signature = verifyData(key.publicKey, canonical, proof.signature);
  }

  let state: VerificationState = "VALID";
  if (!key) state = "UNKNOWN_KEY";
  else if (!hash || !signature) state = "TAMPERED";
  else if (!notRevoked) state = "REVOKED";
  else if (!notExpired) state = "EXPIRED";

  const trust = key ? getTrust(await getChain(key.orgId)) : null;

  return {
    state,
    checks: { hash, signature, notRevoked, notExpired },
    trust,
    payload,
    proof,
    revokedAt: statusInfo?.revokedAt?.toISOString() ?? null,
    revokedReason: statusInfo?.revokedReason ?? null,
  };
}

/** Returns null when the credential doesn't exist or is PRIVATE and the viewer may not see it. */
export async function verifyById(
  id: string,
  viewerId: string | null,
): Promise<(VerificationResult & { accentColor: string; holderHandle: string | null }) | null> {
  const credential = await db.credential.findUnique({
    where: { id: id.toUpperCase() },
    include: {
      key: { select: { orgId: true, publicKey: true } },
      template: { select: { accentColor: true } },
      recipient: { select: { handle: true, profileVisibility: true } },
    },
  });
  if (!credential) return null;

  if (credential.visibility === "PRIVATE") {
    const isHolder = !!viewerId && viewerId === credential.recipientId;
    const isIssuer = !!viewerId && !isHolder && (await getEffectiveRoles(viewerId, credential.orgId)).has("ISSUER");
    if (!isHolder && !isIssuer) return null;
  }

  const proof: CredentialProof = {
    type: "Ed25519Signature",
    keyId: credential.keyId,
    hash: credential.payloadHash,
    signature: credential.signature,
  };
  const result = await evaluate(credential.payload as unknown as CredentialPayload, proof, credential.key, credential);
  return {
    ...result,
    accentColor: credential.template.accentColor,
    holderHandle: credential.recipient?.profileVisibility === "PUBLIC" ? credential.recipient.handle : null,
  };
}

export async function verifyDocument(doc: z.infer<typeof verifyDocumentSchema>): Promise<VerificationResult> {
  const [key, credential] = await Promise.all([
    db.orgKey.findUnique({ where: { id: doc.proof.keyId }, select: { orgId: true, publicKey: true } }),
    db.credential.findUnique({
      where: { id: doc.payload.id },
      select: { status: true, revokedAt: true, revokedReason: true },
    }),
  ]);
  return evaluate(
    doc.payload as unknown as CredentialPayload,
    { type: "Ed25519Signature", ...doc.proof },
    key,
    credential,
  );
}
