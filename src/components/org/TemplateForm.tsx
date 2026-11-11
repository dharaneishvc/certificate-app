"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { humanize } from "@/lib/format";
import { CREDENTIAL_TYPES, type TemplateField } from "@/lib/validators";

const PRESETS: Record<string, TemplateField[]> = {
  EMPLOYMENT: [
    { key: "designation", label: "Designation", required: true },
    { key: "department", label: "Department", required: false },
    { key: "start_date", label: "Start date", required: true },
    { key: "end_date", label: "End date", required: false },
  ],
  INTERNSHIP: [
    { key: "role", label: "Role", required: true },
    { key: "duration", label: "Duration", required: true },
  ],
  EVENT: [{ key: "position", label: "Position", required: false }],
  COURSE: [
    { key: "grade", label: "Grade", required: false },
    { key: "hours", label: "Hours", required: false },
  ],
  DEGREE: [
    { key: "programme", label: "Programme", required: true },
    { key: "cgpa", label: "CGPA", required: false },
    { key: "year", label: "Year of graduation", required: true },
  ],
};

function toKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f_$1")
    .slice(0, 40);
}

export function TemplateForm({ slug, signatories }: { slug: string; signatories: { id: string; name: string; title: string | null }[] }) {
  const router = useRouter();
  const [type, setType] = useState<string>("EVENT");
  const [fields, setFields] = useState<TemplateField[]>(PRESETS.EVENT);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
        setPending(true);
        setError(null);
        const res = await api(`/api/orgs/${slug}/templates`, "POST", {
          name: data.name,
          type,
          description: data.description,
          accentColor: data.accentColor,
          fields: fields.map((f) => ({ ...f, key: toKey(f.label) })),
          signatoryIds: selected,
        });
        setPending(false);
        if (!res.ok) return setError(res.error);
        form.reset();
        setSelected([]);
        router.refresh();
      }}
    >
      <div>
        <label className="label" htmlFor="name">Credential title</label>
        <input className="input" id="name" name="name" required minLength={2} maxLength={120} placeholder="e.g. Winner – HackNight 2026" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="label" htmlFor="type">Type</label>
          <select
            className="input"
            id="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setFields(PRESETS[e.target.value] ?? []);
            }}
          >
            {CREDENTIAL_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="accentColor">Colour</label>
          <input className="h-10 w-14 rounded border border-slate-300" id="accentColor" name="accentColor" type="color" defaultValue="#4f46e5" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Description (printed on certificate)</label>
        <textarea className="input" id="description" name="description" rows={2} maxLength={1000} />
      </div>

      <div className="space-y-2">
        <span className="label">Custom fields</span>
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input"
              value={f.label}
              placeholder="Field label"
              maxLength={60}
              required
              onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <label className="flex shrink-0 items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))}
              />
              Required
            </label>
            <button type="button" className="text-sm text-red-600" onClick={() => setFields(fields.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        {fields.length < 12 && (
          <button
            type="button"
            className="text-sm text-brand-600"
            onClick={() => setFields([...fields, { key: "", label: "", required: false }])}
          >
            + Add field
          </button>
        )}
      </div>

      <div className="space-y-2">
        <span className="label">Signatories</span>
        {signatories.length === 0 ? (
          <p className="muted">Give members the Signatory role to list them here.</p>
        ) : (
          signatories.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                disabled={!selected.includes(s.id) && selected.length >= 5}
                onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))}
              />
              {s.name}
              {s.title && <span className="text-slate-500">— {s.title}</span>}
            </label>
          ))
        )}
      </div>

      {error && <p className="error-box">{error}</p>}
      <button className="btn w-full" disabled={pending}>
        {pending ? "Creating…" : "Create template"}
      </button>
    </form>
  );
}
