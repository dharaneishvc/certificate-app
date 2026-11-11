import { clientIp, parseJson, route } from "@/lib/http";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import { login } from "@/server/auth.service";

export const POST = route(async (req) => {
  const input = await parseJson(req, loginSchema);
  const user = await login(input, clientIp(req));
  await createSession(user.id);
  return Response.json({ user });
});
