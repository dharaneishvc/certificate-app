function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// Getters so a missing variable fails at use time, not during `next build`.
export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get APP_URL() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get SESSION_SECRET() {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return secret;
  },
  get MASTER_KEY() {
    return required("MASTER_KEY");
  },
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY || null;
  },
  get MAIL_FROM() {
    return process.env.MAIL_FROM || "Credora <onboarding@resend.dev>";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
