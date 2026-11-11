"use client";

import { useState } from "react";

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lets a verifier confirm the recipient's email without the platform ever revealing it. */
export function EmailHashCheck({ credentialId, emailHash }: { credentialId: string; emailHash: string }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setResult((await sha256Hex(`${email.trim().toLowerCase()}:${credentialId}`)) === emailHash);
      }}
    >
      <input
        className="input"
        type="email"
        placeholder="candidate@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setResult(null);
        }}
        required
      />
      <button className="btn-secondary shrink-0">Check email</button>
      {result !== null && (
        <span className={`self-center text-sm font-medium ${result ? "text-green-700" : "text-red-700"}`}>
          {result ? "✓ Matches recipient" : "✗ Does not match"}
        </span>
      )}
    </form>
  );
}
