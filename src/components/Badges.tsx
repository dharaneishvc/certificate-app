import type { Trust, VerificationState } from "@/lib/types";

const STATE_STYLE: Record<VerificationState, { label: string; cls: string; icon: string }> = {
  VALID: { label: "Valid", cls: "bg-green-100 text-green-800", icon: "✓" },
  REVOKED: { label: "Revoked", cls: "bg-red-100 text-red-800", icon: "⛔" },
  EXPIRED: { label: "Expired", cls: "bg-amber-100 text-amber-800", icon: "⌛" },
  TAMPERED: { label: "Tampered", cls: "bg-red-100 text-red-800", icon: "⚠" },
  UNKNOWN_KEY: { label: "Unknown issuer key", cls: "bg-red-100 text-red-800", icon: "?" },
};

export function StateBadge({ state }: { state: VerificationState }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`pill ${s.cls}`}>
      <span aria-hidden>{s.icon}</span> {s.label}
    </span>
  );
}

export function StatusPill({ status, expiresAt }: { status: "ACTIVE" | "REVOKED"; expiresAt?: Date | string | null }) {
  if (status === "REVOKED") return <span className="pill bg-red-100 text-red-800">Revoked</span>;
  if (expiresAt && new Date(expiresAt) < new Date()) return <span className="pill bg-amber-100 text-amber-800">Expired</span>;
  return <span className="pill bg-green-100 text-green-800">Active</span>;
}

export function TrustBadge({ trust }: { trust: Trust | null }) {
  if (!trust?.verified) {
    return (
      <span className="pill bg-slate-100 text-slate-600" title="This organisation has not verified a domain">
        Unverified organisation
      </span>
    );
  }
  return (
    <span
      className="pill bg-blue-100 text-blue-800"
      title={trust.inherited ? `Trust inherited from ${trust.via}` : `Domain ${trust.domain} verified`}
    >
      ✓ Verified {trust.domain ? `· ${trust.domain}` : ""}
      {trust.inherited ? ` (via ${trust.via})` : ""}
    </span>
  );
}
