"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { ORG_ROLES } from "@/lib/validators";

type Role = (typeof ORG_ROLES)[number];

interface Member {
  id: string;
  userId: string;
  name: string;
  handle: string;
  email: string;
  roles: Role[];
  title: string;
}

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "manage org, members, sub-orgs",
  ISSUER: "create templates, issue & revoke",
  SIGNATORY: "can appear as signer on certificates",
};

function RoleCheckboxes({ value, onChange }: { value: Role[]; onChange: (r: Role[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ORG_ROLES.map((r) => (
        <label key={r} className="flex items-center gap-1.5 text-sm" title={ROLE_HELP[r]}>
          <input
            type="checkbox"
            checked={value.includes(r)}
            onChange={(e) => onChange(e.target.checked ? [...value, r] : value.filter((x) => x !== r))}
          />
          {r.charAt(0) + r.slice(1).toLowerCase()}
        </label>
      ))}
    </div>
  );
}

function MemberRow({ slug, member, isSelf }: { slug: string; member: Member; isSelf: boolean }) {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>(member.roles);
  const [title, setTitle] = useState(member.title);
  const [error, setError] = useState<string | null>(null);
  const dirty = title !== member.title || roles.slice().sort().join() !== member.roles.slice().sort().join();

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {member.name} {isSelf && <span className="text-xs font-normal text-slate-500">(you)</span>}
          </p>
          <p className="muted font-mono">
            {member.handle} · {member.email}
          </p>
        </div>
        <button
          className="btn-danger"
          onClick={async () => {
            if (!confirm(`Remove ${member.name} from this organisation?`)) return;
            const res = await api(`/api/orgs/${slug}/members/${member.id}`, "DELETE");
            if (res.ok) router.refresh();
            else setError(res.error);
          }}
        >
          Remove
        </button>
      </div>
      <RoleCheckboxes value={roles} onChange={setRoles} />
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Title shown on certificates, e.g. Head of HR"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="btn shrink-0"
          disabled={!dirty || roles.length === 0}
          onClick={async () => {
            setError(null);
            const res = await api(`/api/orgs/${slug}/members/${member.id}`, "PATCH", { roles, title });
            if (res.ok) router.refresh();
            else setError(res.error);
          }}
        >
          Save
        </button>
      </div>
      {error && <p className="error-box">{error}</p>}
    </div>
  );
}

export function MemberManager({ slug, members, currentUserId }: { slug: string; members: Member[]; currentUserId: string }) {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>(["ISSUER"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <h2>Members ({members.length})</h2>
        {members.map((m) => (
          <MemberRow key={m.id} slug={slug} member={m} isSelf={m.userId === currentUserId} />
        ))}
      </div>
      <form
        className="card h-fit space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
          setPending(true);
          setError(null);
          const res = await api(`/api/orgs/${slug}/members`, "POST", { ...data, roles });
          setPending(false);
          if (!res.ok) return setError(res.error);
          form.reset();
          router.refresh();
        }}
      >
        <h2>Add member</h2>
        <p className="muted">The person must already have a Credora account.</p>
        <div>
          <label className="label" htmlFor="identifier">Credora ID or email</label>
          <input className="input" id="identifier" name="identifier" required maxLength={254} />
        </div>
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input className="input" id="title" name="title" placeholder="e.g. Faculty Advisor" maxLength={80} />
        </div>
        <div>
          <span className="label">Roles</span>
          <RoleCheckboxes value={roles} onChange={setRoles} />
        </div>
        {error && <p className="error-box">{error}</p>}
        <button className="btn w-full" disabled={pending || roles.length === 0}>
          {pending ? "Adding…" : "Add member"}
        </button>
      </form>
    </div>
  );
}
