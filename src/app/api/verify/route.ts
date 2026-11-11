import { parseJson, route } from "@/lib/http";
import { verifyDocumentSchema } from "@/lib/validators";
import { verifyDocument } from "@/server/verification.service";

export const POST = route(async (req) => {
  const doc = await parseJson(req, verifyDocumentSchema);
  return Response.json(await verifyDocument(doc));
});
