import { compare, hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { randomId, randomToken, sha256Hex } from "@/lib/crypto";
import { ApiError, errors } from "@/lib/http";
import { escapeHtml, sendMail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { sessionUserSelect, type SessionUser } from "@/lib/session";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "@/lib/validators";

const BCRYPT_COST = 12;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
// Compared against when the email is unknown, so response time doesn't reveal account existence.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Q7wXo5u2JwJr8rV8l3Hq2Ow5h5Qm4K";

export async function register(input: z.infer<typeof registerSchema>): Promise<SessionUser> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw errors.conflict("An account with this email already exists");

  const passwordHash = await hash(input.password, BCRYPT_COST);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const user = await db.user.create({
        data: { name: input.name, email: input.email, passwordHash, handle: randomId(8) },
        select: sessionUserSelect,
      });
      await sendVerificationEmail(user);
      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = String(err.meta?.target ?? "");
        if (target.includes("email")) throw errors.conflict("An account with this email already exists");
        continue; // handle collision — retry
      }
      throw err;
    }
  }
  throw new Error("Could not allocate a unique handle");
}

export async function login(input: z.infer<typeof loginSchema>, ip: string): Promise<SessionUser> {
  if (!rateLimit(`login:${ip}:${input.email}`, 10, 15 * 60 * 1000)) throw errors.rateLimited();

  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

  return {
    id: user.id,
    handle: user.handle,
    email: user.email,
    name: user.name,
    bio: user.bio,
    emailVerifiedAt: user.emailVerifiedAt,
    profileVisibility: user.profileVisibility,
  };
}

export async function sendVerificationEmail(user: Pick<SessionUser, "id" | "email" | "name">) {
  const token = randomToken();
  await db.$transaction([
    db.emailToken.deleteMany({ where: { userId: user.id } }),
    db.emailToken.create({
      data: { userId: user.id, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    }),
  ]);

  const link = `${env.APP_URL}/api/auth/verify-email?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Verify your Credora email",
    text: `Hi ${user.name},\n\nConfirm your email to start receiving credentials:\n${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Confirm your email to start receiving credentials:</p><p><a href="${link}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function resendVerification(user: SessionUser) {
  if (user.emailVerifiedAt) throw errors.conflict("Email already verified");
  if (!rateLimit(`resend:${user.id}`, 3, 60 * 60 * 1000)) throw errors.rateLimited();
  await sendVerificationEmail(user);
}

/** Marks the email verified and links any credentials previously issued to it. */
export async function verifyEmail(token: string): Promise<boolean> {
  const record = await db.emailToken.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!record || record.expiresAt < new Date()) return false;

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    db.emailToken.deleteMany({ where: { userId: record.userId } }),
    db.credential.updateMany({
      where: { recipientEmail: record.user.email, recipientId: null },
      data: { recipientId: record.userId },
    }),
  ]);
  return true;
}
