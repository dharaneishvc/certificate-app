import type { Metadata } from "next";
import { VerifyById, VerifyFile } from "@/components/VerifyTools";

export const metadata: Metadata = { title: "Verify" };

export default function VerifyPage() {
  return (
    <div className="container-page max-w-2xl space-y-6">
      <h1>Verify a credential</h1>
      <div className="card space-y-3">
        <h2>By credential ID</h2>
        <p className="muted">The 12-character ID printed on the certificate, next to the QR code.</p>
        <VerifyById />
      </div>
      <div className="card space-y-3">
        <h2>By signed JSON file</h2>
        <p className="muted">
          Upload a <code>credential-XXXX.json</code> exported from Credora. The signature is checked against the
          issuer&apos;s registered public key.
        </p>
        <VerifyFile />
      </div>
    </div>
  );
}
