import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateOrgForm } from "@/components/org/CreateOrgForm";
import { getCurrentUser } from "@/lib/session";
import { listUserOrgs } from "@/server/org.service";

export const metadata: Metadata = { title: "New organisation" };

export default async function NewOrgPage({ searchParams }: { searchParams: Promise<{ parent?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/dashboard");

  const { parent } = await searchParams;
  const memberships = await listUserOrgs(user.id);
  const parents = memberships.filter((m) => m.roles.includes("ADMIN")).map((m) => m.org);

  return (
    <div className="container-page max-w-xl space-y-4">
      <h1>{parent ? "New sub-organisation" : "New organisation"}</h1>
      <p className="muted">
        You&apos;ll become its admin. A signing key pair is generated automatically for issuing credentials.
      </p>
      <CreateOrgForm parents={parents} defaultParent={parent} />
    </div>
  );
}
