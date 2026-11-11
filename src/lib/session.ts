import { cache } from "react";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { db } from "./db";
import { env } from "./env";
import { errors } from "./http";

const COOKIE_NAME = "credora_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export const sessionUserSelect = {
  id: true,
  handle: true,
  email: true,
  name: true,
  bio: true,
  emailVerifiedAt: true,
  profileVisibility: true,
} as const;

export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: sessionUserSelect });
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw errors.unauthenticated();
  return user;
}

export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) throw errors.forbidden("Please verify your email address first");
  return user;
}
