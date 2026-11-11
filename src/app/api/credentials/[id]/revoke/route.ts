import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { revokeSchema } from "@/lib/validators";
import { revokeCredential } from "@/server/credential.service";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { reason } = await parseJson(req, revokeSchema);
  await revokeCredential(user, params.id, reason);
  return Response.json({ ok: true });
});
