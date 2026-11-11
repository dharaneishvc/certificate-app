import { parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { createTemplateSchema } from "@/lib/validators";
import { createTemplate } from "@/server/template.service";

export const POST = route<{ slug: string }>(async (req, { params }) => {
  const user = await requireUser();
  const input = await parseJson(req, createTemplateSchema);
  const template = await createTemplate(user, params.slug, input);
  return Response.json({ template: { id: template.id } }, { status: 201 });
});
