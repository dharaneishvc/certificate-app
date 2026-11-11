import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { createOrgSchema } from "@/lib/validators";
import { createOrg } from "@/server/org.service";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, createOrgSchema);
  const org = await createOrg(user, input);
  return Response.json({ org: { id: org.id, slug: org.slug, name: org.name } }, { status: 201 });
});
