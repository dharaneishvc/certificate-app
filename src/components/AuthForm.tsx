"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const res = await api(`/api/auth/${mode}`, "POST", form);
    setPending(false);
    if (!res.ok) return setError(res.error);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input className="input" id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
          <p className="mt-1 text-xs text-slate-500">Exactly as it should appear on your certificates.</p>
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : 1}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </div>
      {error && <p className="error-box">{error}</p>}
      <button className="btn w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>No account? <Link href="/register">Create one</Link></>
        ) : (
          <>Already registered? <Link href="/login">Log in</Link></>
        )}
      </p>
    </form>
  );
}
