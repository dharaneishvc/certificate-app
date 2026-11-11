"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api-client";
import { parseCsv } from "@/lib/csv";
import { humanize } from "@/lib/format";
import { MAX_BULK_RECIPIENTS, type TemplateField } from "@/lib/validators";

interface TemplateOption {
  id: string;
  name: string;
  type: string;
  fields: TemplateField[];
}

interface Recipient {
  name: string;
  email: string;
  fields: Record<string, string>;
}

function recipientsFromCsv(text: string, fields: TemplateField[]): { rows: Recipient[]; error: string | null } {
  const table = parseCsv(text.trim());
  if (table.length < 2) return { rows: [], error: "Need a header row and at least one data row" };

  const header = table[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  if (nameIdx < 0 || emailIdx < 0) return { rows: [], error: 'Header must include "name" and "email" columns' };

  const fieldIdx = fields.map((f) => {
    const i = header.indexOf(f.key);
    return i >= 0 ? i : header.indexOf(f.label.toLowerCase());
  });

  const rows = table.slice(1).map((r) => ({
    name: (r[nameIdx] ?? "").trim(),
    email: (r[emailIdx] ?? "").trim(),
    fields: Object.fromEntries(fields.map((f, k) => [f.key, fieldIdx[k] >= 0 ? (r[fieldIdx[k]] ?? "").trim() : ""])),
  }));
  if (rows.length > MAX_BULK_RECIPIENTS) return { rows: [], error: `At most ${MAX_BULK_RECIPIENTS} rows per batch` };
  return { rows, error: null };
}

export function IssueForm({ slug, templates }: { slug: string; templates: TemplateOption[] }) {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);

  const template = templates.find((t) => t.id === templateId)!;
  const parsed = useMemo(() => (csv.trim() ? recipientsFromCsv(csv, template.fields) : null), [csv, template.fields]);
  const csvHeader = ["name", "email", ...template.fields.map((f) => f.key)].join(",");

  async function submit(recipients: Recipient[], expiresOn: string) {
    setPending(true);
    setError(null);
    setIssued(null);
    const res = await api<{ ids: string[] }>(`/api/orgs/${slug}/credentials`, "POST", {
      templateId,
      recipients,
      expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59`).toISOString() : null,
    });
    setPending(false);
    if (!res.ok) return setError(res.error);
    setIssued(res.data.ids);
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form
        className="card space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
          if (mode === "single") {
            const recipient: Recipient = {
              name: data.name,
              email: data.email,
              fields: Object.fromEntries(template.fields.map((f) => [f.key, data[`f_${f.key}`] ?? ""])),
            };
            if (await submit([recipient], data.expiresOn)) form.reset();
          } else {
            if (!parsed || parsed.error) return setError(parsed?.error ?? "Paste or upload a CSV");
            if (await submit(parsed.rows, data.expiresOn)) setCsv("");
          }
        }}
      >
        <div>
          <label className="label" htmlFor="template">Template</label>
          <select className="input" id="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({humanize(t.type)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {(["single", "bulk"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={mode === m ? "btn" : "btn-secondary"}
            >
              {m === "single" ? "Single recipient" : "Bulk (CSV)"}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="rname">Recipient name</label>
                <input className="input" id="rname" name="name" required maxLength={120} />
              </div>
              <div>
                <label className="label" htmlFor="remail">Recipient email</label>
                <input className="input" id="remail" name="email" type="email" required />
              </div>
            </div>
            {template.fields.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={`f_${f.key}`}>
                  {f.label} {f.required && <span className="text-red-600">*</span>}
                </label>
                <input className="input" id={`f_${f.key}`} name={`f_${f.key}`} required={f.required} maxLength={500} />
              </div>
            ))}
          </>
        ) : (
          <div className="space-y-2">
            <label className="label" htmlFor="csv">CSV data</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setCsv(await file.text());
              }}
            />
            <textarea
              className="input font-mono text-xs"
              id="csv"
              rows={8}
              value={csv}
              placeholder={`${csvHeader}\nAsha Rao,asha@example.com,...`}
              onChange={(e) => setCsv(e.target.value)}
            />
            {parsed?.error && <p className="error-box">{parsed.error}</p>}
            {parsed && !parsed.error && <p className="muted">{parsed.rows.length} recipients ready.</p>}
          </div>
        )}

        <div>
          <label className="label" htmlFor="expiresOn">Expires on (optional)</label>
          <input className="input w-auto" id="expiresOn" name="expiresOn" type="date" />
        </div>

        {error && <p className="error-box">{error}</p>}
        {issued && (
          <div className="success-box">
            Issued {issued.length} credential{issued.length > 1 ? "s" : ""}.{" "}
            {issued.slice(0, 5).map((id) => (
              <Link key={id} href={`/c/${id}`} className="mr-2 font-mono">
                {id}
              </Link>
            ))}
          </div>
        )}
        <button className="btn w-full" disabled={pending}>
          {pending ? "Signing & issuing…" : "Issue credential"}
        </button>
      </form>

      <aside className="card h-fit space-y-2 text-sm text-slate-600">
        <h2 className="text-slate-900">How issuing works</h2>
        <p>Each credential is canonicalised, hashed (SHA-256) and signed with your organisation&apos;s Ed25519 key.</p>
        <p>If the recipient already has a verified Credora account with that email, it appears in their profile instantly. Otherwise it&apos;s linked when they sign up and verify the email.</p>
        <p className="font-medium text-slate-800">CSV header for this template:</p>
        <code className="block break-all rounded bg-slate-100 p-2 text-xs">{csvHeader}</code>
      </aside>
    </div>
  );
}
