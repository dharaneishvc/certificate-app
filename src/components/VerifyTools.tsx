"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { VerificationResult } from "@/lib/types";
import { StateBadge, TrustBadge } from "./Badges";
import { CredentialView } from "./CredentialView";

export function VerifyById() {
  const router = useRouter();
  const [id, setId] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = id.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
        if (clean) router.push(`/c/${clean}`);
      }}
    >
      <input
        className="input font-mono uppercase"
        placeholder="Credential ID e.g. 7KQ2XM9PA3DF"
        value={id}
        onChange={(e) => setId(e.target.value)}
        maxLength={20}
        aria-label="Credential ID"
      />
      <button className="btn shrink-0">Verify</button>
    </form>
  );
}

export function VerifyFile() {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setResult(null);
    setError(null);
    if (file.size > 200_000) return setError("File too large");
    let doc: unknown;
    try {
      doc = JSON.parse(await file.text());
    } catch {
      return setError("Not a valid JSON file");
    }
    const res = await api<VerificationResult>("/api/verify", "POST", doc);
    if (res.ok) setResult(res.data);
    else setError(res.error);
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="application/json,.json"
        className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-brand-700"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {error && <p className="error-box">{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StateBadge state={result.state} />
            <TrustBadge trust={result.trust} />
          </div>
          <ul className="text-sm text-slate-600">
            <li>Hash matches: {result.checks.hash ? "yes" : "no"}</li>
            <li>Signature valid: {result.checks.signature ? "yes" : "no"}</li>
            <li>Not revoked: {result.checks.notRevoked ? "yes" : "no"}</li>
            <li>Not expired: {result.checks.notExpired ? "yes" : "no"}</li>
          </ul>
          {result.state !== "UNKNOWN_KEY" && <CredentialView payload={result.payload} />}
        </div>
      )}
    </div>
  );
}
