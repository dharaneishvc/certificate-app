"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function CreateOrgForm({ parents, defaultParent }: { parents: { slug: string; name: string }[]; defaultParent?: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        if (!data.parentSlug) delete data.parentSlug;
        const res = await api<{ org: { slug: string } }>("/api/orgs", "POST", data);
        setPending(false);
        if (!res.ok) return setError(res.error);
        router.push(`/orgs/${res.data.org.slug}/manage`);
        router.refresh();
      }}
    >
      <div>
        <label className="label" htmlFor="name">Organisation name</label>
        <input
          className="input"
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          onChange={(e) => !slugTouched && setSlug(slugify(e.target.value))}
        />
      </div>
      <div>
        <label className="label" htmlFor="slug">URL slug</label>
        <div className="flex items-center gap-1 text-sm text-slate-500">
          /orgs/
          <input
            className="input"
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
        </div>
      </div>
      {parents.length > 0 && (
        <div>
          <label className="label" htmlFor="parentSlug">Parent organisation (optional)</label>
          <select className="input" id="parentSlug" name="parentSlug" defaultValue={defaultParent ?? ""}>
            <option value="">None — top-level organisation</option>
            {parents.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            E.g. a department under a university, or a club under a department. Inherits verified status.
          </p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea className="input" id="description" name="description" rows={3} maxLength={1000} />
      </div>
      <div>
        <label className="label" htmlFor="website">Website</label>
        <input className="input" id="website" name="website" type="url" placeholder="https://" maxLength={200} />
      </div>
      {error && <p className="error-box">{error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Creating…" : "Create organisation"}
      </button>
    </form>
  );
}
