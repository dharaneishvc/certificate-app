"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function ProfileForm({ name, bio, profileVisibility }: { name: string; bio: string; profileVisibility: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const res = await api("/api/me", "PATCH", Object.fromEntries(new FormData(e.currentTarget)));
        setPending(false);
        setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
        if (res.ok) router.refresh();
      }}
    >
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input className="input" id="name" name="name" defaultValue={name} required minLength={2} maxLength={80} />
        <p className="mt-1 text-xs text-slate-500">Already-issued credentials keep the name they were signed with.</p>
      </div>
      <div>
        <label className="label" htmlFor="bio">Bio</label>
        <textarea className="input" id="bio" name="bio" rows={3} maxLength={500} defaultValue={bio} />
      </div>
      <div>
        <label className="label" htmlFor="profileVisibility">Profile visibility</label>
        <select className="input" id="profileVisibility" name="profileVisibility" defaultValue={profileVisibility}>
          <option value="PUBLIC">Public — anyone with the link sees your public credentials</option>
          <option value="PRIVATE">Private — profile hidden; individual credential links still work</option>
        </select>
      </div>
      {msg && <p className={msg.ok ? "success-box" : "error-box"}>{msg.text}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
