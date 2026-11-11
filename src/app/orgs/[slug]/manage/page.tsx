import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusPill, TrustBadge } from "@/components/Badges";
import { IssueForm } from "@/components/org/IssueForm";
import { MemberManager } from "@/components/org/MemberManager";
import { OrgSettingsForm } from "@/components/org/OrgSettingsForm";
import { RevokeButton } from "@/components/org/RevokeButton";
import { TemplateArchiveButton } from "@/components/org/TemplateArchiveButton";
import { TemplateForm } from "@/components/org/TemplateForm";
import { formatDate, formatDateTime, humanize } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { listOrgCredentials } from "@/server/credential.service";
import { DOMAIN_TXT_PREFIX, getOrgPublicView, listMembers, listRecentAudit } from "@/server/org.service";
import { getEffectiveRoles } from "@/server/permissions";
import { listTemplates } from "@/server/template.service";

export const metadata: Metadata = { title: "Manage organisation" };

const TABS = [
  { id: "issue", label: "Issue", admin: false },
  { id: "credentials", label: "Credentials", admin: false },
  { id: "templates", label: "Templates", admin: false },
  { id: "members", label: "Members", admin: true },
  { id: "settings", label: "Settings", admin: true },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> };

export default async function ManageOrgPage({ params, searchParams }: Props) {
  const [{ slug }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const view = await getOrgPublicView(slug);
  if (!view) notFound();
  const { org, trust } = view;

  const roles = await getEffectiveRoles(user.id, org.id);
  const isAdmin = roles.has("ADMIN");
  if (!isAdmin && !roles.has("ISSUER")) notFound();

  const visibleTabs = TABS.filter((t) => !t.admin || isAdmin);
  const tab: TabId = visibleTabs.some((t) => t.id === rawTab) ? (rawTab as TabId) : "issue";

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>
            <Link href={`/orgs/${org.slug}`} className="text-slate-900">
              {org.name}
            </Link>
          </h1>
          <div className="mt-1">
            <TrustBadge trust={trust} />
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {visibleTabs.map((t) => (
          <Link
            key={t.id}
            href={`/orgs/${org.slug}/manage?tab=${t.id}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium hover:no-underline ${
              tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "issue" && <IssueTab orgId={org.id} slug={org.slug} />}
      {tab === "credentials" && <CredentialsTab orgId={org.id} />}
      {tab === "templates" && <TemplatesTab orgId={org.id} slug={org.slug} />}
      {tab === "members" && <MembersTab orgId={org.id} slug={org.slug} currentUserId={user.id} />}
      {tab === "settings" && (
        <div className="space-y-6">
          <OrgSettingsForm
            slug={org.slug}
            name={org.name}
            description={org.description ?? ""}
            website={org.website ?? ""}
            domain={org.domain ?? ""}
            domainStatus={org.domainStatus}
            txtRecord={`${DOMAIN_TXT_PREFIX}${org.domainToken}`}
          />
          <section className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2>Sub-organisations</h2>
              <Link href={`/orgs/new?parent=${org.slug}`} className="btn-secondary">
                + Add sub-organisation
              </Link>
            </div>
            {org.children.length === 0 ? (
              <p className="muted">None yet. Create departments, chapters, clubs or teams that issue their own credentials.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {org.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/orgs/${c.slug}/manage`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <AuditTab orgId={org.id} />
        </div>
      )}
    </div>
  );
}

async function IssueTab({ orgId, slug }: { orgId: string; slug: string }) {
  const templates = (await listTemplates(orgId)).filter((t) => !t.archived);
  if (templates.length === 0) {
    return (
      <p className="card muted">
        Create a <Link href={`/orgs/${slug}/manage?tab=templates`}>template</Link> first.
      </p>
    );
  }
  return (
    <IssueForm
      slug={slug}
      templates={templates.map((t) => ({ id: t.id, name: t.name, type: t.type, fields: t.fields }))}
    />
  );
}

async function CredentialsTab({ orgId }: { orgId: string }) {
  const credentials = await listOrgCredentials(orgId);
  if (credentials.length === 0) return <p className="card muted">No credentials issued yet.</p>;
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Recipient</th>
            <th>Credential</th>
            <th>Issued</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {credentials.map((c) => (
            <tr key={c.id}>
              <td className="font-mono text-xs">
                <Link href={`/c/${c.id}`}>{c.id}</Link>
              </td>
              <td>
                {c.recipientName}
                <div className="text-xs text-slate-500">
                  {c.recipientEmail} {c.recipientId ? "· claimed" : "· unclaimed"}
                </div>
              </td>
              <td>{c.title}</td>
              <td className="whitespace-nowrap">{formatDate(c.issuedAt)}</td>
              <td>
                <StatusPill status={c.status} expiresAt={c.expiresAt} />
              </td>
              <td>{c.status === "ACTIVE" && <RevokeButton id={c.id} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {credentials.length === 100 && <p className="muted mt-3">Showing the latest 100.</p>}
    </div>
  );
}

async function TemplatesTab({ orgId, slug }: { orgId: string; slug: string }) {
  const [templates, members] = await Promise.all([listTemplates(orgId), listMembers(orgId)]);
  const signatories = members
    .filter((m) => m.roles.includes("SIGNATORY"))
    .map((m) => ({ id: m.id, name: m.user.name, title: m.title }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h2>Templates</h2>
        {templates.length === 0 && <p className="card muted">No templates yet.</p>}
        {templates.map((t) => (
          <div key={t.id} className={`card space-y-2 ${t.archived ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: t.accentColor }} />
                  {t.name}
                </p>
                <p className="muted">
                  {humanize(t.type)} · {t._count.credentials} issued {t.archived && "· archived"}
                </p>
              </div>
              <TemplateArchiveButton slug={slug} id={t.id} archived={t.archived} />
            </div>
            {t.fields.length > 0 && (
              <p className="text-xs text-slate-500">
                Fields: {t.fields.map((f) => `${f.label}${f.required ? "*" : ""}`).join(", ")}
              </p>
            )}
            {t.signatories.length > 0 && (
              <p className="text-xs text-slate-500">
                Signed by:{" "}
                {t.signatories
                  .map((s) => `${s.membership.user.name}${s.membership.title ? ` (${s.membership.title})` : ""}`)
                  .join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h2>New template</h2>
        <TemplateForm slug={slug} signatories={signatories} />
      </div>
    </div>
  );
}

async function MembersTab({ orgId, slug, currentUserId }: { orgId: string; slug: string; currentUserId: string }) {
  const members = await listMembers(orgId);
  return (
    <MemberManager
      slug={slug}
      currentUserId={currentUserId}
      members={members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        handle: m.user.handle,
        email: m.user.email,
        roles: m.roles,
        title: m.title ?? "",
      }))}
    />
  );
}

async function AuditTab({ orgId }: { orgId: string }) {
  const logs = await listRecentAudit(orgId);
  return (
    <section className="card">
      <h2>Recent activity</h2>
      {logs.length === 0 ? (
        <p className="muted mt-2">No activity yet.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap gap-x-2">
              <span className="text-slate-400">{formatDateTime(l.createdAt)}</span>
              <span className="font-medium">{humanize(l.action)}</span>
              <span className="text-slate-500">by {l.actor?.name ?? "system"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
