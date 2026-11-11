import { z } from "zod";

// Plain constants (not Prisma enums) so this file is safe to import in client components.
export const CREDENTIAL_TYPES = [
  "COURSE",
  "EVENT",
  "PARTICIPATION",
  "ACHIEVEMENT",
  "EMPLOYMENT",
  "INTERNSHIP",
  "DEGREE",
  "MEMBERSHIP",
  "OTHER",
] as const;
export const ORG_ROLES = ["ADMIN", "ISSUER", "SIGNATORY"] as const;
export const CREDENTIAL_VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export const PROFILE_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;

export const MAX_BULK_RECIPIENTS = 500;

const name = z.string().trim().min(1, "Required").max(120);
const email = z.string().trim().toLowerCase().email("Invalid email").max(254);

const httpUrl = z
  .string()
  .trim()
  .max(200)
  .url("Invalid URL")
  .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://");

const optionalUrl = z
  .union([z.literal(""), httpUrl])
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

const hostname = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .regex(/^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/, "Enter a domain like example.com");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "3–40 chars: lowercase letters, numbers, hyphens");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(80),
  email,
  password: z.string().min(8, "At least 8 characters").max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Required").max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  profileVisibility: z.enum(PROFILE_VISIBILITIES).optional(),
});

export const credentialVisibilitySchema = z.object({
  visibility: z.enum(CREDENTIAL_VISIBILITIES),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slugSchema,
  description: z.string().trim().max(1000).optional(),
  website: optionalUrl,
  parentSlug: slugSchema.optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  website: optionalUrl,
  domain: z
    .union([z.literal(""), hostname])
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null)),
});

export const addMemberSchema = z.object({
  identifier: z.string().trim().min(1, "Enter a handle or email").max(254),
  roles: z.array(z.enum(ORG_ROLES)).min(1, "Pick at least one role"),
  title: z.string().trim().max(80).optional(),
});

export const updateMemberSchema = z.object({
  roles: z.array(z.enum(ORG_ROLES)).min(1).optional(),
  title: z.string().trim().max(80).optional(),
});

export const templateFieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Field key: lowercase letters, numbers, underscore"),
  label: z.string().trim().min(1).max(60),
  required: z.boolean(),
});
export type TemplateField = z.infer<typeof templateFieldSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(CREDENTIAL_TYPES),
  description: z.string().trim().max(1000).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Hex colour like #4f46e5")
    .default("#4f46e5"),
  fields: z
    .array(templateFieldSchema)
    .max(12)
    .refine((f) => new Set(f.map((x) => x.key)).size === f.length, "Field keys must be unique"),
  signatoryIds: z.array(z.string().min(1)).max(5).default([]),
});

export const updateTemplateSchema = z.object({ archived: z.boolean() });

export const issueSchema = z.object({
  templateId: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  recipients: z
    .array(
      z.object({
        name,
        email,
        fields: z.record(z.string().max(500)).default({}),
      }),
    )
    .min(1, "Add at least one recipient")
    .max(MAX_BULK_RECIPIENTS, `At most ${MAX_BULK_RECIPIENTS} recipients per batch`),
});
export type IssueInput = z.infer<typeof issueSchema>;

export const revokeSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

export const verifyDocumentSchema = z.object({
  payload: z
    .object({
      id: z.string().min(1).max(64),
      issuer: z.object({ id: z.string().min(1) }).passthrough(),
      expiresAt: z.string().nullable().optional(),
    })
    .passthrough(),
  proof: z.object({
    keyId: z.string().min(1).max(64),
    hash: z.string().min(1).max(128),
    signature: z.string().min(1).max(256),
  }),
});
