import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="mb-2 text-center">Create your Credora ID</h1>
      <p className="muted mb-6 text-center">One profile for every certificate you earn.</p>
      <AuthForm mode="register" />
    </div>
  );
}
