"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="text-slate-500 hover:text-slate-900"
      onClick={async () => {
        await api("/api/auth/logout");
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
