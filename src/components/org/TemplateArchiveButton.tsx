"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function TemplateArchiveButton({ slug, id, archived }: { slug: string; id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn-secondary px-3 py-1 text-xs"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const res = await api(`/api/orgs/${slug}/templates/${id}`, "PATCH", { archived: !archived });
        setPending(false);
        if (res.ok) router.refresh();
        else alert(res.error);
      }}
    >
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
