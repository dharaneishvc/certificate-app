import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StateBadge, TrustBadge } from "@/components/Badges";
import { CopyButton } from "@/components/CopyButton";
import { CredentialView } from "@/components/CredentialView";
import { EmailHashCheck } from "@/components/EmailHashCheck";
import { RevokeButton } from "@/components/org/RevokeButton";
import { formatDate, formatDateTime } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getEffectiveRoles } from "@/server/permissions";
import { verifyById } from "@/server/verification.service";

type Props = { params: Promise<{ id: string }> };

const STATE_MESSAGE = {
  VALID: "This credential is authentic and was issued by the organisation shown.",
  REVOKED: "This credential was revoked by the issuer and is no longer valid.",
  EXPIRED: "This credential was authentic but has passed its expiry date.",
  TAMPERED: "The content does not match the issuer's signature. Do not trust this credential.",
  UNKNOWN_KEY: "The signing key is not registered with Credora.",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verify ${id.toUpperCase()}`, robots: { index: false } };
}

export default async function CredentialPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const result = await verifyById(id, viewer?.id ?? null);
  if (!result) notFound();

  const { payload, state, trust, checks } = result;
  const canRevoke =
    !!viewer && state !== "REVOKED" && (await getEffectiveRoles(viewer.id, payload.issuer.id)).has("ISSUER");
  const valid = state === "VALID";

  return (
    <div className="container-page max-w-3xl space-y-6">
      <section
        className={`card border-l-4 ${valid ? "border-l-green-500" : state === "EXPIRED" ? "border-l-amber-500" : "border-l-red-500"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <StateBadge state={state} />
          <TrustBadge trust={trust} />
        </div>
        <p className="mt-2 text-sm text-slate-700">{STATE_MESSAGE[state]}</p>
        {state === "REVOKED" && result.revokedAt && (
          <p className="mt-1 text-sm text-red-700">
            Revoked {formatDateTime(result.revokedAt)}
            {result.revokedReason && <> — “{result.revokedReason}”</>}
          </p>
        )}
        <ul className="mt-3 grid grid-cols-2 gap-1 text-xs text-slate-500 sm:grid-cols-4">
          <li>{checks.signature ? "✓" : "✗"} Signature</li>
          <li>{checks.hash ? "✓" : "✗"} Integrity hash</li>
          <li>{checks.notRevoked ? "✓" : "✗"} Not revoked</li>
          <li>{checks.notExpired ? "✓" : "✗"} Not expired</li>
        </ul>
      </section>

      <CredentialView payload={payload} accentColor={result.accentColor} />

      <section className="flex flex-wrap gap-2">
        <CopyButton value={`/c/${payload.id}`} label="Copy verification link" />
        <a className="btn-secondary" href={`/api/credentials/${payload.id}/pdf`} target="_blank" rel="noreferrer">
          Download PDF
        </a>
        <a className="btn-secondary" href={`/api/credentials/${payload.id}?download=1`}>
          Download signed JSON
        </a>
        <Link className="btn-secondary" href={`/orgs/${payload.issuer.slug}`}>
          About issuer
        </Link>
        {result.holderHandle && (
          <Link className="btn-secondary" href={`/u/${result.holderHandle}`}>
            Holder profile
          </Link>
        )}
        {canRevoke && <RevokeButton id={payload.id} />}
      </section>

      <section className="card space-y-3">
        <h2>Confirm the recipient</h2>
        <p className="muted">
          Credora never shows the recipient&apos;s email. Enter the email the candidate gave you to check it matches.
        </p>
        <EmailHashCheck credentialId={payload.id} emailHash={payload.recipient.emailHash} />
      </section>

      <details className="card text-sm">
        <summary className="cursor-pointer font-medium">Technical details</summary>
        <dl className="mt-3 space-y-2 break-all font-mono text-xs text-slate-600">
          <div><dt className="font-sans font-semibold text-slate-800">Algorithm</dt><dd>Ed25519 over canonical JSON</dd></div>
          <div><dt className="font-sans font-semibold text-slate-800">Key ID</dt><dd>{result.proof.keyId}</dd></div>
          <div><dt className="font-sans font-semibold text-slate-800">SHA-256</dt><dd>{result.proof.hash}</dd></div>
          <div><dt className="font-sans font-semibold text-slate-800">Signature</dt><dd>{result.proof.signature}</dd></div>
          <div><dt className="font-sans font-semibold text-slate-800">Issued</dt><dd>{formatDate(payload.issuedAt)}</dd></div>
          <div>
            <dt className="font-sans font-semibold text-slate-800">Public key</dt>
            <dd><a href={`/api/orgs/${payload.issuer.slug}/keys`}>/api/orgs/{payload.issuer.slug}/keys</a></dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
