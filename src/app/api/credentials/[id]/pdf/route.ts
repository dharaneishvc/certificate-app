import { env } from "@/lib/env";
import { errors, route } from "@/lib/http";
import { renderCredentialPdf } from "@/lib/pdf";
import { getCurrentUser } from "@/lib/session";
import { verifyById } from "@/server/verification.service";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const viewer = await getCurrentUser();
  const result = await verifyById(params.id, viewer?.id ?? null);
  if (!result) throw errors.notFound("Credential");

  const pdf = await renderCredentialPdf({
    payload: result.payload,
    verifyUrl: `${env.APP_URL}/c/${result.payload.id}`,
    accentColor: result.accentColor,
    state: result.state,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="credential-${result.payload.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});
