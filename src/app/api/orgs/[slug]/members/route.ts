import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { addMemberSchema } from "@/lib/validators";
import { addMember } from "@/server/org.service";

export const POST = route<{ slug: string }>(async (req, { params }) => {
  const user = await requireUser();
  const input = await parseJson(req, addMemberSchema);
  const membership = await addMember(user, params.slug, input);
  return Response.json({ membership: { id: membership.id } }, { status: 201 });
});
