import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustBadge } from "@/components/Badges";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { getOrgPublicView } from "@/server/org.service";
import { getEffectiveRoles } from "@/server/permissions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const view = await getOrgPublicView((await params).slug);
  return { title: view?.org.name ?? "Organisation" };
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const [view, viewer] = await Promise.all([getOrgPublicView(slug), getCurrentUser()]);
  if (!view) notFound();
  const { org, chain, trust } = view;

  const roles = viewer ? await getEffectiveRoles(viewer.id, org.id) : new Set<string>();
  const canManage = roles.has("ADMIN") || roles.has("ISSUER");

  return (
    <div className="container-page max-w-3xl space-y-6">
      {chain.length > 1 && (
        <nav className="text-sm text-slate-500">
          {chain.slice(0, -1).map((o) => (
            <span key={o.id}>
              <Link href={`/orgs/${o.slug}`}>{o.name}</Link> /{" "}
            </span>
          ))}
        </nav>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>{org.name}</h1>
            <div className="mt-2">
              <TrustBadge trust={trust} />
            </div>
          </div>
          {canManage && (
            <Link href={`/orgs/${org.slug}/manage`} className="btn">
              Manage
            </Link>
          )}
        </div>
        {org.description && <p className="text-slate-700">{org.description}</p>}
        <p className="muted">
          {org.website && (
            <>
              <a href={org.website} target="_blank" rel="noopener noreferrer nofollow">
                {org.website}
              </a>{" "}
              ·{" "}
            </>
          )}
          {org._count.credentials} credentials issued · on Credora since {formatDate(org.createdAt)}
        </p>
      </section>

      {org.children.length > 0 && (
        <section className="card">
          <h2>Sub-organisations</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {org.children.map((c) => (
              <li key={c.slug}>
                <Link href={`/orgs/${c.slug}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Signing keys</h2>
        <p className="muted mt-1">
          Credentials from this organisation are signed with these Ed25519 public keys (
          <a href={`/api/orgs/${org.slug}/keys`}>JSON</a>).
        </p>
        <ul className="mt-3 space-y-2">
          {org.keys.map((k) => (
            <li key={k.id} className="break-all rounded-lg bg-slate-50 p-3 font-mono text-xs">
              <span className="font-semibold">{k.id}</span> {k.active ? "(active)" : "(retired)"}
              <br />
              {k.publicKey}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
