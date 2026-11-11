import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { issueSchema } from "@/lib/validators";
import { issueCredentials } from "@/server/credential.service";

export const POST = route<{ slug: string }>(async (req, { params }) => {
  const user = await requireUser();
  const input = await parseJson(req, issueSchema);
  const ids = await issueCredentials(user, params.slug, input);
  return Response.json({ issued: ids.length, ids }, { status: 201 });
});
