import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";

export async function Navbar() {
  const user = await getCurrentUser();
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:no-underline">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">C</span>
          Credora
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/verify">Verify</Link>
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href={`/u/${user.handle}`} className="hidden sm:inline">
                {user.name}
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login">Log in</Link>
              <Link href="/register" className="btn">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
