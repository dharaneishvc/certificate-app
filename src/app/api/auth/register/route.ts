import { parseJson, route } from "@/lib/http";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validators";
import { register } from "@/server/auth.service";

export const POST = route(async (req) => {
  const input = await parseJson(req, registerSchema);
  const user = await register(input);
  await createSession(user.id);
  return Response.json({ user }, { status: 201 });
});
