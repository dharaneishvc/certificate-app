"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";

export function VisibilitySelect({ id, value }: { id: string; value: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

  return (
    <select
      aria-label="Visibility"
      className="input w-auto py-1.5"
      value={current}
      disabled={saving}
      onChange={async (e) => {
        const next = e.target.value;
        setSaving(true);
        const res = await api(`/api/me/credentials/${id}`, "PATCH", { visibility: next });
        setSaving(false);
        if (res.ok) {
          setCurrent(next);
          router.refresh();
        } else alert(res.error);
      }}
    >
      <option value="PUBLIC">Public — on profile</option>
      <option value="UNLISTED">Unlisted — link only</option>
      <option value="PRIVATE">Private — only me</option>
    </select>
  );
}
