import { errors, route } from "@/lib/http";
import { getCurrentUser } from "@/lib/session";
import { verifyById } from "@/server/verification.service";

export const GET = route<{ id: string }>(async (req, { params }) => {
  const viewer = await getCurrentUser();
  const result = await verifyById(params.id, viewer?.id ?? null);
  if (!result) throw errors.notFound("Credential");

  const { state, checks, trust, payload, proof, revokedAt, revokedReason } = result;
  const download = new URL(req.url).searchParams.get("download") === "1";
  const body = download ? { payload, proof } : { state, checks, trust, payload, proof, revokedAt, revokedReason };
  return Response.json(body, {
    headers: download
      ? { "Content-Disposition": `attachment; filename="credential-${result.payload.id}.json"` }
      : { "Cache-Control": "no-store" },
  });
});
