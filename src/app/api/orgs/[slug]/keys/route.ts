import { errors, route } from "@/lib/http";
import { getOrgPublicView } from "@/server/org.service";

export const GET = route<{ slug: string }>(async (_req, { params }) => {
  const view = await getOrgPublicView(params.slug);
  if (!view) throw errors.notFound("Organisation");
  return Response.json({
    algorithm: "Ed25519",
    format: "spki-der-base64",
    keys: view.org.keys.map((k) => ({ keyId: k.id, publicKey: k.publicKey, active: k.active, createdAt: k.createdAt })),
  });
});
