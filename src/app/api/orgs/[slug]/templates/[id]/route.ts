import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { updateTemplateSchema } from "@/lib/validators";
import { setTemplateArchived } from "@/server/template.service";

export const PATCH = route<{ slug: string; id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const { archived } = await parseJson(req, updateTemplateSchema);
  await setTemplateArchived(user, params.slug, params.id, archived);
  return Response.json({ ok: true });
});
