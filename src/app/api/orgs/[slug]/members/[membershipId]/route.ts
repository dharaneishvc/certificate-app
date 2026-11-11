import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { updateMemberSchema } from "@/lib/validators";
import { removeMember, updateMember } from "@/server/org.service";

type Params = { slug: string; membershipId: string };

export const PATCH = route<Params>(async (req, { params }) => {
  const user = await requireUser();
  const input = await parseJson(req, updateMemberSchema);
  await updateMember(user, params.slug, params.membershipId, input);
  return Response.json({ ok: true });
});

export const DELETE = route<Params>(async (_req, { params }) => {
  const user = await requireUser();
  await removeMember(user, params.slug, params.membershipId);
  return Response.json({ ok: true });
});
