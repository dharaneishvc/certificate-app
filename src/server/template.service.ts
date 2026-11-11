import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "@/lib/db";
import { errors } from "@/lib/http";
import type { SessionUser } from "@/lib/session";
import type { createTemplateSchema, TemplateField } from "@/lib/validators";
import { audit } from "./audit";
import { getOrgBySlug } from "./org.service";
import { requireRole } from "./permissions";

export async function createTemplate(actor: SessionUser, slug: string, input: z.infer<typeof createTemplateSchema>) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ISSUER");

  const signatoryIds = [...new Set(input.signatoryIds)];
  if (signatoryIds.length) {
    const valid = await db.membership.count({
      where: { id: { in: signatoryIds }, orgId: org.id, roles: { has: "SIGNATORY" } },
    });
    if (valid !== signatoryIds.length) throw errors.validation("Signatories must be members with the SIGNATORY role");
  }

  const template = await db.template.create({
    data: {
      orgId: org.id,
      name: input.name,
      type: input.type,
      description: input.description || null,
      accentColor: input.accentColor,
      fields: input.fields as Prisma.InputJsonValue,
      signatories: { create: signatoryIds.map((membershipId, position) => ({ membershipId, position })) },
    },
  });
  await audit({ orgId: org.id, actorId: actor.id, action: "TEMPLATE_CREATED", targetType: "Template", targetId: template.id });
  return template;
}

export async function setTemplateArchived(actor: SessionUser, slug: string, templateId: string, archived: boolean) {
  const org = await getOrgBySlug(slug);
  await requireRole(actor.id, org.id, "ISSUER");

  const template = await db.template.findFirst({ where: { id: templateId, orgId: org.id } });
  if (!template) throw errors.notFound("Template");

  const updated = await db.template.update({ where: { id: templateId }, data: { archived } });
  await audit({
    orgId: org.id,
    actorId: actor.id,
    action: archived ? "TEMPLATE_ARCHIVED" : "TEMPLATE_RESTORED",
    targetType: "Template",
    targetId: templateId,
  });
  return updated;
}

export async function listTemplates(orgId: string) {
  const templates = await db.template.findMany({
    where: { orgId },
    include: {
      signatories: {
        orderBy: { position: "asc" },
        include: { membership: { select: { id: true, title: true, user: { select: { name: true } } } } },
      },
      _count: { select: { credentials: true } },
    },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });
  return templates.map((t) => ({ ...t, fields: t.fields as unknown as TemplateField[] }));
}
