import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-md text-center">
      <h1>Not found</h1>
      <p className="muted mt-2">
        This page doesn&apos;t exist, or the credential is private. Check the ID and try again.
      </p>
      <Link href="/verify" className="btn mt-6">
        Verify a credential
      </Link>
    </div>
  );
}
