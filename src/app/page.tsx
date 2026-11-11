import Link from "next/link";
import { VerifyById } from "@/components/VerifyTools";

const FEATURES = [
  { title: "Any organisation", body: "Companies, universities, departments, clubs — nest sub-orgs as deep as you need." },
  { title: "Any credential", body: "Courses, events, internships, employment, degrees, memberships and more." },
  { title: "Tamper-proof", body: "Every credential is signed with the issuer's Ed25519 key. Edits are detected instantly." },
  { title: "One identity", body: "Each person gets a unique Credora ID and a shareable profile they control." },
  { title: "Verified issuers", body: "Organisations prove domain ownership via DNS; sub-orgs inherit that trust." },
  { title: "Bulk issue", body: "Upload a CSV and issue hundreds of certificates with QR-coded PDFs." },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl">
            Certificates anyone can <span className="text-brand-600">verify in seconds</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Credora lets any organisation issue cryptographically signed credentials — and lets every holder keep them
            in one shareable profile.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className="btn px-6 py-3">
              Create free account
            </Link>
            <Link href="/verify" className="btn-secondary px-6 py-3">
              Verify a certificate
            </Link>
          </div>
          <div className="mx-auto mt-10 max-w-md">
            <VerifyById />
          </div>
        </div>
      </section>

      <section className="container-page grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="card">
            <h2>{f.title}</h2>
            <p className="muted mt-2">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="container-page">
        <div className="card">
          <h2>How it works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>An organisation signs up, verifies its domain and adds issuers & signatories.</li>
            <li>Issuers design a template and issue credentials individually or via CSV.</li>
            <li>Recipients get a link, claim it with their Credora ID and choose who can see it.</li>
            <li>Anyone scans the QR or opens the link — Credora checks the signature and revocation status.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
