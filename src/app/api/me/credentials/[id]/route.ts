import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { credentialVisibilitySchema } from "@/lib/validators";
import { setCredentialVisibility } from "@/server/credential.service";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { visibility } = await parseJson(req, credentialVisibilitySchema);
  await setCredentialVisibility(user, params.id, visibility);
  return Response.json({ ok: true });
});
