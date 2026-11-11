import Link from "next/link";
import { formatDate, humanize } from "@/lib/format";
import { StatusPill } from "./Badges";

export interface CredentialListItem {
  id: string;
  title: string;
  type: string;
  status: "ACTIVE" | "REVOKED";
  issuedAt: Date;
  expiresAt: Date | null;
  org: { name: string; slug: string; domainStatus: string };
}

export function CredentialCard({ c, children }: { c: CredentialListItem; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/c/${c.id}`} className="font-semibold text-slate-900">
            {c.title}
          </Link>
          <StatusPill status={c.status} expiresAt={c.expiresAt} />
        </div>
        <p className="muted mt-1">
          <Link href={`/orgs/${c.org.slug}`}>{c.org.name}</Link>
          {c.org.domainStatus === "VERIFIED" && <span title="Verified organisation"> ✓</span>} · {humanize(c.type)} ·{" "}
          {formatDate(c.issuedAt)}
        </p>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}
