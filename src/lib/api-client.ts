export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function api<T = unknown>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "POST",
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `Request failed (${res.status})` };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
