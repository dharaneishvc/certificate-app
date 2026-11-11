"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

export function ResendVerification() {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="font-medium underline"
        onClick={async () => {
          const res = await api("/api/auth/resend-verification");
          setMsg(res.ok ? "Sent! Check your inbox." : res.error);
        }}
      >
        Resend email
      </button>
      {msg && <span>{msg}</span>}
    </span>
  );
}
