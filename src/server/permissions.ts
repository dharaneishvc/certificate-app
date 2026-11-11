import type { DomainStatus, OrgRole } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/http";
import type { Trust } from "@/lib/types";

const MAX_DEPTH = 10;

export interface ChainOrg {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  domain: string | null;
  domainStatus: DomainStatus;
}

/** Returns the org and its ancestors, root first. */
export async function getChain(orgId: string): Promise<ChainOrg[]> {
  const chain: ChainOrg[] = [];
  let currentId: string | null = orgId;
  while (currentId && chain.length < MAX_DEPTH) {
    const org: ChainOrg | null = await db.organization.findUnique({
      where: { id: currentId },
      select: { id: true, slug: true, name: true, parentId: true, domain: true, domainStatus: true },
    });
    if (!org) break;
    chain.unshift(org);
    currentId = org.parentId;
  }
  return chain;
}

export function getTrust(chain: ChainOrg[]): Trust {
  for (let i = chain.length - 1; i >= 0; i--) {
    const org = chain[i];
    if (org.domainStatus === "VERIFIED") {
      return { verified: true, via: org.name, domain: org.domain, inherited: i !== chain.length - 1 };
    }
  }
  return { verified: false, via: null, domain: null, inherited: false };
}

/** Direct roles in the org, plus ADMIN+ISSUER inherited from being ADMIN of any ancestor. */
export async function getEffectiveRoles(userId: string, orgId: string): Promise<Set<OrgRole>> {
  const chain = await getChain(orgId);
  const memberships = await db.membership.findMany({
    where: { userId, orgId: { in: chain.map((o) => o.id) } },
    select: { orgId: true, roles: true },
  });

  const roles = new Set<OrgRole>();
  for (const m of memberships) {
    if (m.orgId === orgId) m.roles.forEach((r) => roles.add(r));
    else if (m.roles.includes("ADMIN")) {
      roles.add("ADMIN");
      roles.add("ISSUER");
    }
  }
  return roles;
}

export async function requireRole(userId: string, orgId: string, role: OrgRole): Promise<Set<OrgRole>> {
  const roles = await getEffectiveRoles(userId, orgId);
  if (!roles.has(role)) throw errors.forbidden(`This action requires the ${role} role`);
  return roles;
}
