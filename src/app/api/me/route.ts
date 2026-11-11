import { db } from "@/lib/db";
import { parseJson, route } from "@/lib/http";
import { requireUser, sessionUserSelect } from "@/lib/session";
import { updateProfileSchema } from "@/lib/validators";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ user });
});

export const PATCH = route(async (req) => {
  const current = await requireUser();
  const input = await parseJson(req, updateProfileSchema);
  const user = await db.user.update({
    where: { id: current.id },
    data: { name: input.name, bio: input.bio, profileVisibility: input.profileVisibility },
    select: sessionUserSelect,
  });
  return Response.json({ user });
});
