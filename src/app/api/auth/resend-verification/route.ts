import { route } from "@/lib/http";
import { requireUser } from "@/lib/session";
import { resendVerification } from "@/server/auth.service";

export const POST = route(async () => {
  const user = await requireUser();
  await resendVerification(user);
  return Response.json({ ok: true });
});
