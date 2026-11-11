export interface CredentialPayload {
  v: 1;
  id: string;
  type: string;
  title: string;
  description: string | null;
  issuer: { id: string; slug: string; name: string; chain: string[] };
  recipient: { name: string; emailHash: string };
  fields: { label: string; value: string }[];
  signatories: { name: string; title: string | null }[];
  issuedAt: string;
  expiresAt: string | null;
  keyId: string;
}

export interface CredentialProof {
  type: "Ed25519Signature";
  keyId: string;
  hash: string;
  signature: string;
}

export type VerificationState = "VALID" | "REVOKED" | "EXPIRED" | "TAMPERED" | "UNKNOWN_KEY";

export interface Trust {
  verified: boolean;
  via: string | null;
  domain: string | null;
  inherited: boolean;
}

export interface VerificationResult {
  state: VerificationState;
  checks: { hash: boolean; signature: boolean; notRevoked: boolean; notExpired: boolean };
  trust: Trust | null;
  payload: CredentialPayload;
  proof: CredentialProof;
  revokedAt: string | null;
  revokedReason: string | null;
}
