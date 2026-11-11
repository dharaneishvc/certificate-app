import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { CredentialCard } from "@/components/CredentialCard";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { listProfileCredentials } from "@/server/credential.service";

type Props = { params: Promise<{ handle: string }> };

async function loadUser(handle: string) {
  return db.user.findUnique({
    where: { handle: handle.toUpperCase() },
    select: { id: true, handle: true, name: true, bio: true, profileVisibility: true, createdAt: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await loadUser((await params).handle);
  if (!user || user.profileVisibility !== "PUBLIC") return { title: "Profile" };
  return { title: user.name, description: `Verified credentials of ${user.name} on Credora` };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const [user, viewer] = await Promise.all([loadUser(handle), getCurrentUser()]);
  if (!user) notFound();

  const isOwner = viewer?.id === user.id;
  if (user.profileVisibility === "PRIVATE" && !isOwner) {
    return (
      <div className="container-page max-w-xl text-center">
        <h1>This profile is private</h1>
        <p className="muted mt-2">Individual credentials may still be verified via their direct link.</p>
      </div>
    );
  }

  const credentials = await listProfileCredentials(user.id);

  return (
    <div className="container-page max-w-3xl space-y-6">
      <section className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1>{user.name}</h1>
            <p className="muted">
              Credora ID <span className="font-mono">{user.handle}</span>
            </p>
          </div>
        </div>
        <CopyButton value={`/u/${user.handle}`} label="Share profile" />
      </section>
      {user.bio && <p className="text-slate-700">{user.bio}</p>}
      {isOwner && user.profileVisibility === "PRIVATE" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Only you can see this profile.</p>
      )}

      <section className="space-y-3">
        <h2>Credentials ({credentials.length})</h2>
        {credentials.length === 0 && <p className="card muted">No public credentials.</p>}
        {credentials.map((c) => (
          <CredentialCard key={c.id} c={c} />
        ))}
      </section>
    </div>
  );
}
