import { formatDate, humanize } from "@/lib/format";
import type { CredentialPayload } from "@/lib/types";

/** Certificate-style rendering of a signed payload. Shared by server and client components. */
export function CredentialView({ payload, accentColor = "#4f46e5" }: { payload: CredentialPayload; accentColor?: string }) {
  return (
    <div className="rounded-xl border-4 bg-white p-6 text-center shadow-sm sm:p-10" style={{ borderColor: accentColor }}>
      {payload.issuer.chain.length > 1 && (
        <p className="text-xs text-slate-500">{payload.issuer.chain.join(" / ")}</p>
      )}
      <p className="mt-1 text-lg font-bold" style={{ color: accentColor }}>
        {payload.issuer.name}
      </p>
      <p className="text-xs uppercase tracking-widest text-slate-400">{humanize(payload.type)}</p>

      <h1 className="mt-6 text-2xl sm:text-3xl">{payload.title}</h1>
      <p className="mt-4 italic text-slate-500">This is to certify that</p>
      <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: accentColor }}>
        {payload.recipient.name}
      </p>
      {payload.description && <p className="mx-auto mt-4 max-w-xl text-slate-600">{payload.description}</p>}

      {payload.fields.length > 0 && (
        <dl className="mx-auto mt-6 grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-sm">
          {payload.fields.map((f) => (
            <div key={f.label} className="contents">
              <dt className="font-medium text-slate-500">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {payload.signatories.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-10">
          {payload.signatories.map((s, i) => (
            <div key={i} className="min-w-36 border-t border-slate-300 pt-2">
              <p className="text-sm font-semibold">{s.name}</p>
              {s.title && <p className="text-xs text-slate-500">{s.title}</p>}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-slate-500">
        Issued {formatDate(payload.issuedAt)}
        {payload.expiresAt && <> · Valid until {formatDate(payload.expiresAt)}</>} · ID{" "}
        <span className="font-mono">{payload.id}</span>
      </p>
    </div>
  );
}
