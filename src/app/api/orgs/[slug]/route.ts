import { errors, parseJson, route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { updateOrgSchema } from "@/lib/validators";
import { getOrgPublicView, updateOrg } from "@/server/org.service";

export const GET = route<{ slug: string }>(async (_req, { params }) => {
  const view = await getOrgPublicView(params.slug);
  if (!view) throw errors.notFound("Organisation");
  const { org, chain, trust } = view;
  return Response.json({
    org: {
      slug: org.slug,
      name: org.name,
      description: org.description,
      website: org.website,
      domain: org.domainStatus === "VERIFIED" ? org.domain : null,
      createdAt: org.createdAt,
      credentialsIssued: org._count.credentials,
    },
    chain: chain.map((o) => ({ slug: o.slug, name: o.name })),
    children: org.children,
    trust,
  });
});

export const PATCH = route<{ slug: string }>(async (req, { params }) => {
  const user = await requireUser();
  const input = await parseJson(req, updateOrgSchema);
  const org = await updateOrg(user, params.slug, input);
  return Response.json({ org: { slug: org.slug, domain: org.domain, domainStatus: org.domainStatus } });
});
