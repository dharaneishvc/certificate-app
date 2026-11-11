import { route } from "@/lib/http";
import { destroySession } from "@/lib/session";

export const POST = route(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
