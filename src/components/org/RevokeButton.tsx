"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn-danger"
      disabled={pending}
      onClick={async () => {
        const reason = prompt("Reason for revoking this credential (visible to verifiers):");
        if (!reason) return;
        setPending(true);
        const res = await api(`/api/credentials/${id}/revoke`, "POST", { reason });
        setPending(false);
        if (res.ok) router.refresh();
        else alert(res.error);
      }}
    >
      Revoke
    </button>
  );
}
