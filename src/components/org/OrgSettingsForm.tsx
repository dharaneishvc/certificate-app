"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { CopyButton } from "../CopyButton";

interface Props {
  slug: string;
  name: string;
  description: string;
  website: string;
  domain: string;
  domainStatus: "NONE" | "PENDING" | "VERIFIED";
  txtRecord: string;
}

export function OrgSettingsForm(props: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(false);

  return (
    <div className="space-y-6">
      <form
        className="card space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          const res = await api(`/api/orgs/${props.slug}`, "PATCH", Object.fromEntries(new FormData(e.currentTarget)));
          setPending(false);
          setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        }}
      >
        <h2>Profile</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" defaultValue={props.name} required minLength={2} maxLength={100} />
          <p className="mt-1 text-xs text-slate-500">Existing credentials keep the name they were signed with.</p>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea className="input" id="description" name="description" rows={3} maxLength={1000} defaultValue={props.description} />
        </div>
        <div>
          <label className="label" htmlFor="website">Website</label>
          <input className="input" id="website" name="website" type="url" defaultValue={props.website} maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="domain">Domain</label>
          <input className="input" id="domain" name="domain" placeholder="example.com" defaultValue={props.domain} />
          <p className="mt-1 text-xs text-slate-500">Changing the domain resets verification.</p>
        </div>
        {msg && <p className={msg.ok ? "success-box" : "error-box"}>{msg.text}</p>}
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      {props.domain && (
        <section className="card space-y-3">
          <h2>Domain verification</h2>
          {props.domainStatus === "VERIFIED" ? (
            <p className="success-box">✓ {props.domain} is verified. Credentials show a verified badge.</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Add this <strong>TXT</strong> record to the DNS of <strong>{props.domain}</strong>, then click verify.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 text-xs">{props.txtRecord}</code>
                <CopyButton value={props.txtRecord} />
              </div>
              <button
                className="btn"
                disabled={checking}
                onClick={async () => {
                  setChecking(true);
                  const res = await api(`/api/orgs/${props.slug}/domain/verify`);
                  setChecking(false);
                  setMsg(res.ok ? { ok: true, text: "Domain verified!" } : { ok: false, text: res.error });
                  if (res.ok) router.refresh();
                }}
              >
                {checking ? "Checking DNS…" : "Verify domain"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
