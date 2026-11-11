import { route } from "@/lib/http";
import { verifyEmail } from "@/server/auth.service";

export const GET = route(async (req) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = /^[a-f0-9]{64}$/.test(token) && (await verifyEmail(token));
  return Response.redirect(new URL(ok ? "/dashboard?verified=1" : "/dashboard?verified=0", req.url), 302);
});
