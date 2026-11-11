import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Client = PrismaClient | Prisma.TransactionClient;

export type AuditAction =
  | "ORG_CREATED"
  | "ORG_UPDATED"
  | "DOMAIN_VERIFIED"
  | "MEMBER_ADDED"
  | "MEMBER_UPDATED"
  | "MEMBER_REMOVED"
  | "TEMPLATE_CREATED"
  | "TEMPLATE_ARCHIVED"
  | "TEMPLATE_RESTORED"
  | "CREDENTIALS_ISSUED"
  | "CREDENTIAL_REVOKED";

export function audit(
  entry: {
    orgId: string | null;
    actorId: string | null;
    action: AuditAction;
    targetType: string;
    targetId: string;
    meta?: Prisma.InputJsonValue;
  },
  client: Client = db,
) {
  return client.auditLog.create({ data: entry });
}
