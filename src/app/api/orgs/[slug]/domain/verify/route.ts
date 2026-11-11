import { route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { verifyDomain } from "@/server/org.service";

export const POST = route<{ slug: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const org = await verifyDomain(user, params.slug);
  return Response.json({ domainStatus: org.domainStatus });
});
