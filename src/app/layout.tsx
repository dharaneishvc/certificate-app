import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Credora — verifiable credentials", template: "%s · Credora" },
  description: "Issue tamper-proof certificates for courses, events, jobs and degrees. Verify any credential in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          Credora · Ed25519-signed credentials ·{" "}
          <Link href="/verify">Verify a credential</Link>
        </footer>
      </body>
    </html>
  );
}
