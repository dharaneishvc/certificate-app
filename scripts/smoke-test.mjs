// End-to-end smoke test against a running server with seed data.
// Usage: npm run db:seed && npm run dev, then: node scripts/smoke-test.mjs [baseUrl]
const BASE = process.argv[2] ?? "http://localhost:3000";
let failures = 0;

function check(name, ok, info = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? `  — ${info}` : ""}`);
  if (!ok) failures++;
}

async function call(path, { method = "GET", body, cookie, contentType = "application/json" } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(body !== undefined ? { "Content-Type": contentType } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await res.json() : type.includes("pdf") ? await res.arrayBuffer() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

async function login(email) {
  const res = await call("/api/auth/login", { method: "POST", body: { email, password: "password123" } });
  check(`login ${email}`, res.status === 200, String(res.status));
  return res.headers.get("set-cookie")?.split(";")[0];
}

const home = await call("/");
check("GET / 200", home.status === 200);
check("CSP header", !!home.headers.get("content-security-policy"));
check("X-Frame-Options DENY", home.headers.get("x-frame-options") === "DENY");

const bad = await call("/api/auth/login", { method: "POST", body: { email: "ravi@demo.dev", password: "nope" } });
check("wrong password → 401", bad.status === 401, bad.data?.error?.code);

const ravi = await login("ravi@demo.dev");
const manage = await call("/orgs/demo-coding-club/manage?tab=credentials", { cookie: ravi });
const ids = [...new Set([...manage.data.matchAll(/\/c\/([0-9A-Z]{12})/g)].map((m) => m[1]))];
check("issuer sees credentials", ids.length > 0, ids.join(","));
const id = ids[0];

const cred = await call(`/api/credentials/${id}`);
check("credential VALID", cred.data.state === "VALID", cred.data.state);
check("trust inherited", cred.data.trust?.verified && cred.data.trust?.inherited, JSON.stringify(cred.data.trust));
check("email not leaked", !JSON.stringify(cred.data).includes("@demo.dev"));

const pdf = await call(`/api/credentials/${id}/pdf`);
check("PDF renders", pdf.status === 200 && pdf.data.byteLength > 1000, `${pdf.data.byteLength} bytes`);

const doc = (await call(`/api/credentials/${id}?download=1`)).data;
const v1 = await call("/api/verify", { method: "POST", body: doc });
check("exported JSON verifies", v1.data.state === "VALID", v1.data.state);
const tampered = structuredClone(doc);
tampered.payload.fields[0].value = "2nd";
const v2 = await call("/api/verify", { method: "POST", body: tampered });
check("tampered JSON detected", v2.data.state === "TAMPERED", v2.data.state);
const v3 = await call("/api/verify", { method: "POST", body: JSON.stringify(doc), contentType: "text/plain" });
check("non-JSON content type → 415", v3.status === 415);

const foreign = await call("/api/orgs/acme-labs/members", {
  method: "POST",
  cookie: ravi,
  body: { identifier: "asha@demo.dev", roles: ["ISSUER"] },
});
check("cross-org action → 403", foreign.status === 403, String(foreign.status));

const asha = await login("asha@demo.dev");
const priv = await call(`/api/me/credentials/${id}`, { method: "PATCH", cookie: asha, body: { visibility: "PRIVATE" } });
check("holder sets PRIVATE", priv.status === 200);
check("private hidden from public", (await call(`/api/credentials/${id}`)).status === 404);
check("private visible to holder", (await call(`/api/credentials/${id}`, { cookie: asha })).status === 200);
await call(`/api/me/credentials/${id}`, { method: "PATCH", cookie: asha, body: { visibility: "PUBLIC" } });

const revoke = await call(`/api/credentials/${id}/revoke`, { method: "POST", cookie: ravi, body: { reason: "Smoke test" } });
check("issuer revokes", revoke.status === 200, String(revoke.status));
check("state REVOKED", (await call(`/api/credentials/${id}`)).data.state === "REVOKED");

const email = `smoke${Date.now()}@example.com`;
const reg = await call("/api/auth/register", { method: "POST", body: { name: "Smoke Tester", email, password: "password123" } });
check("register", reg.status === 201, reg.data?.user?.handle);
const fresh = reg.headers.get("set-cookie")?.split(";")[0];
const org = await call("/api/orgs", { method: "POST", cookie: fresh, body: { name: "Nope Org", slug: `nope-${Date.now()}` } });
check("unverified user cannot create org", org.status === 403, String(org.status));

for (const path of ["/verify", "/orgs/demo-coding-club", `/c/${ids[1] ?? id}`]) {
  check(`GET ${path}`, (await call(path)).status === 200);
}
check("GET /dashboard (auth)", (await call("/dashboard", { cookie: asha })).status === 200);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
