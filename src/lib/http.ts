import type { z, ZodTypeAny } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  validation: (message = "Invalid input", details?: unknown) => new ApiError(400, "VALIDATION_ERROR", message, details),
  unauthenticated: () => new ApiError(401, "UNAUTHENTICATED", "Please sign in"),
  forbidden: (message = "You do not have permission to do this") => new ApiError(403, "FORBIDDEN", message),
  notFound: (what = "Resource") => new ApiError(404, "NOT_FOUND", `${what} not found`),
  conflict: (message: string) => new ApiError(409, "CONFLICT", message),
  rateLimited: () => new ApiError(429, "RATE_LIMITED", "Too many attempts. Please try again later."),
};

type Handler<P> = (req: Request, ctx: { params: P }) => Promise<Response>;

/** Wraps a route handler with uniform error responses. */
export function route<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      return await handler(req, { params: await ctx.params });
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json(
          { error: { code: err.code, message: err.message, details: err.details } },
          { status: err.status },
        );
      }
      console.error(err);
      return Response.json({ error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
    }
  };
}

const MAX_BODY_BYTES = 1_000_000;

export async function parseJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.output<S>> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Expected application/json");
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body too large");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw errors.validation("Malformed JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const message = first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid input";
    throw errors.validation(message, result.error.flatten());
  }
  return result.data;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
