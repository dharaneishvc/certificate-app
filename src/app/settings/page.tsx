import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="container-page max-w-xl space-y-4">
      <h1>Settings</h1>
      <p className="muted">
        Email: {user.email} {user.emailVerifiedAt ? "(verified)" : "(not verified)"} · Credora ID{" "}
        <span className="font-mono">{user.handle}</span>
      </p>
      <ProfileForm name={user.name} bio={user.bio ?? ""} profileVisibility={user.profileVisibility} />
    </div>
  );
}
