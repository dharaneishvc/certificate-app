import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { CredentialCard } from "@/components/CredentialCard";
import { ResendVerification } from "@/components/ResendVerification";
import { VisibilitySelect } from "@/components/VisibilitySelect";
import { humanize } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { listHolderCredentials } from "@/server/credential.service";
import { listUserOrgs } from "@/server/org.service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { verified } = await searchParams;

  const [credentials, memberships] = await Promise.all([listHolderCredentials(user.id), listUserOrgs(user.id)]);

  return (
    <div className="container-page space-y-8">
      {verified === "1" && <p className="success-box">Email verified. Any credentials sent to it are now in your profile.</p>}
      {verified === "0" && <p className="error-box">That verification link is invalid or has expired.</p>}
      {!user.emailVerifiedAt && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Verify <strong>{user.email}</strong> to claim credentials and create organisations. <ResendVerification />
        </p>
      )}

      <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>{user.name}</h1>
          <p className="muted mt-1">
            Credora ID <span className="font-mono font-semibold text-slate-800">{user.handle}</span> · Profile{" "}
            {user.profileVisibility === "PUBLIC" ? "public" : "private"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={`/u/${user.handle}`} label="Copy profile link" />
          <Link href={`/u/${user.handle}`} className="btn-secondary">
            View profile
          </Link>
          <Link href="/settings" className="btn-secondary">
            Settings
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2>My credentials ({credentials.length})</h2>
        {credentials.length === 0 && (
          <p className="card muted">
            No credentials yet. When an organisation issues one to <strong>{user.email}</strong>, it will appear here.
          </p>
        )}
        {credentials.map((c) => (
          <CredentialCard key={c.id} c={c}>
            <VisibilitySelect id={c.id} value={c.visibility} />
            <a className="btn-secondary px-3 py-1.5" href={`/api/credentials/${c.id}/pdf`} target="_blank" rel="noreferrer">
              PDF
            </a>
          </CredentialCard>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>My organisations</h2>
          {user.emailVerifiedAt && (
            <Link href="/orgs/new" className="btn">
              + New organisation
            </Link>
          )}
        </div>
        {memberships.length === 0 && <p className="card muted">You are not a member of any organisation.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <div key={m.id} className="card">
              <Link href={`/orgs/${m.org.slug}`} className="font-semibold text-slate-900">
                {m.org.name}
              </Link>
              {m.org.domainStatus === "VERIFIED" && <span title="Verified"> ✓</span>}
              <p className="muted mt-1">
                {m.title ? `${m.title} · ` : ""}
                {m.roles.map(humanize).join(", ")}
              </p>
              {(m.roles.includes("ADMIN") || m.roles.includes("ISSUER")) && (
                <Link href={`/orgs/${m.org.slug}/manage`} className="mt-3 inline-block text-sm">
                  Manage →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
