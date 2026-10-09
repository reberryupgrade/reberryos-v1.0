// API 라우트 통합 테스트: Supabase 저장소를 메모리 Map 으로 대체해 핸들러를 직접 호출한다.
import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

const store = new Map();
let tick = 0;
vi.mock("@/lib/server/supabase", () => ({
  SYS_KEY: "reberryos-v1-sys",
  branchKey: (id) => `reberryos-v1-b-${id}`,
  readStorage: async (k) => store.get(k) ?? null,
  writeStorage: async (k, value) => {
    const updated_at = new Date(1_800_000_000_000 + (tick += 1000)).toISOString();
    store.set(k, { value, updated_at });
    return updated_at;
  },
  deleteStorage: async (k) => { store.delete(k); },
}));

process.env.AUTH_SECRET = "route-test-secret-".padEnd(48, "z");
process.env.CRON_SECRET = "cron-secret-for-tests";

const login = (await import("@/app/api/auth/login/route.js")).POST;
const me = (await import("@/app/api/auth/me/route.js")).GET;
const sysRoute = await import("@/app/api/storage/sys/route.js");
const branchRoute = await import("@/app/api/storage/branch/[id]/route.js");
const collect = await import("@/app/api/keyword-research/collect/route.js");

const SYS = "reberryos-v1-sys";
let ipSeq = 0;
function req(method, path, { body, cookie, headers = {} } = {}) {
  return new Request("http://localhost" + path, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ipSeq}`, ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
const ctx = (id) => ({ params: Promise.resolve({ id: String(id) }) });

function seed() {
  store.clear();
  store.set(SYS, {
    value: {
      users: [
        { id: 1, username: "admin", password: "admin", role: "admin", name: "관리자", branchId: null },
        { id: 2, username: "mgr", password: "pw1234", role: "manager", name: "매니저", branchId: 5 },
        { id: 3, username: "cli", password: "pw1234", role: "client", name: "원장", branchId: 5 },
      ],
      branches: [{ id: 5, name: "강남점", clinicName: "강남 피부과" }],
    },
    updated_at: "2026-01-01T00:00:00+00:00",
  });
}
async function loginAs(username, password) {
  const res = await login(req("POST", "/api/auth/login", { body: { username, password } }));
  return { res, cookie: cookieOf(res), body: await res.json() };
}

beforeEach(seed);

describe("POST /api/auth/login", () => {
  it("logs in a legacy plaintext user, sets an httpOnly cookie and migrates every password to a hash", async () => {
    const { res, cookie, body } = await loginAs("admin", "admin");
    expect(res.status).toBe(200);
    expect(cookie).toMatch(/^reberry_session=/);
    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(body.user).toEqual({ id: 1, username: "admin", role: "admin", name: "관리자", branchId: null });
    const users = store.get(SYS).value.users;
    expect(users.every((u) => u.password === undefined && typeof u.passwordHash === "string")).toBe(true);
    // 이전된 해시로도 다시 로그인된다
    expect((await loginAs("mgr", "pw1234")).res.status).toBe(200);
  });
  it("rejects wrong credentials without leaking which part was wrong", async () => {
    const a = await loginAs("admin", "nope");
    const b = await loginAs("ghost", "admin");
    expect(a.res.status).toBe(400 + 1);
    expect(b.res.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });
  it("reports a configuration error instead of a generic failure when AUTH_SECRET is unusable", async () => {
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    try {
      const { res, body } = await loginAs("admin", "admin");
      expect(res.status).toBe(500);
      expect(body.error).toContain("AUTH_SECRET");
    } finally {
      process.env.AUTH_SECRET = saved;
    }
  });
  it("blocks an IP after repeated failures", async () => {
    const ip = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 5; i++) {
      await login(req("POST", "/api/auth/login", { body: { username: "admin", password: "bad" }, headers: ip }));
    }
    const res = await login(req("POST", "/api/auth/login", { body: { username: "admin", password: "admin" }, headers: ip }));
    expect(res.status).toBe(429);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user with a valid cookie and user:null without one", async () => {
    const { cookie } = await loginAs("mgr", "pw1234");
    const ok = await me(req("GET", "/api/auth/me", { cookie }));
    expect((await ok.json()).user).toMatchObject({ username: "mgr", role: "manager", branchId: 5 });
    const anon = await me(req("GET", "/api/auth/me"));
    expect(anon.status).toBe(200);
    expect((await anon.json()).user).toBeNull();
    expect((await (await me(req("GET", "/api/auth/me", { cookie: "reberry_session=garbage" }))).json()).user).toBeNull();
  });
  it("kicks out a user that was deleted after the cookie was issued", async () => {
    const { cookie } = await loginAs("mgr", "pw1234");
    const sys = store.get(SYS).value;
    store.set(SYS, { ...store.get(SYS), value: { ...sys, users: sys.users.filter((u) => u.username !== "mgr") } });
    expect((await (await me(req("GET", "/api/auth/me", { cookie }))).json()).user).toBeNull();
    // 다른 보호 API 는 여전히 401
    expect((await sysRoute.GET(req("GET", "/api/storage/sys", { cookie }))).status).toBe(401);
  });
});

describe("/api/storage/sys", () => {
  it("never returns password hashes, and hides the user list from non-admins", async () => {
    const admin = await loginAs("admin", "admin");
    const a = await (await sysRoute.GET(req("GET", "/api/storage/sys", { cookie: admin.cookie }))).json();
    expect(a.value.users).toHaveLength(3);
    expect(a.value.users.every((u) => u.passwordHash === undefined && u.password === undefined)).toBe(true);
    const mgr = await loginAs("mgr", "pw1234");
    const m = await (await sysRoute.GET(req("GET", "/api/storage/sys", { cookie: mgr.cookie }))).json();
    expect(m.value.users).toEqual([]);
    expect(m.value.branches).toHaveLength(1);
  });
  it("lets only admins write, hashes new passwords and keeps existing hashes", async () => {
    const mgr = await loginAs("mgr", "pw1234");
    const forbidden = await sysRoute.PUT(req("PUT", "/api/storage/sys", { cookie: mgr.cookie, body: { value: store.get(SYS).value } }));
    expect(forbidden.status).toBe(403);

    const admin = await loginAs("admin", "admin");
    const current = (await (await sysRoute.GET(req("GET", "/api/storage/sys", { cookie: admin.cookie }))).json()).value;
    const value = { ...current, users: [...current.users, { id: 4, username: "new", password: "secret9", role: "manager", name: "신규", branchId: 5 }] };
    const res = await sysRoute.PUT(req("PUT", "/api/storage/sys", { cookie: admin.cookie, body: { value } }));
    expect(res.status).toBe(200);
    const saved = store.get(SYS).value.users;
    expect(saved).toHaveLength(4);
    expect(saved.find((u) => u.username === "new").passwordHash).toMatch(/^\$2/);
    expect(saved.find((u) => u.username === "mgr").passwordHash).toBeDefined();
    expect((await res.json()).value.users.every((u) => u.passwordHash === undefined)).toBe(true);
    expect((await loginAs("new", "secret9")).res.status).toBe(200);
  });
  it("rejects a new user without a password and refuses to drop the current admin", async () => {
    const admin = await loginAs("admin", "admin");
    const current = (await (await sysRoute.GET(req("GET", "/api/storage/sys", { cookie: admin.cookie }))).json()).value;
    const noPw = await sysRoute.PUT(req("PUT", "/api/storage/sys", { cookie: admin.cookie, body: { value: { ...current, users: [...current.users, { id: 9, username: "x", role: "client" }] } } }));
    expect(noPw.status).toBe(400);
    const dropSelf = await sysRoute.PUT(req("PUT", "/api/storage/sys", { cookie: admin.cookie, body: { value: { ...current, users: current.users.filter((u) => u.id !== 1) } } }));
    expect(dropSelf.status).toBe(400);
  });
});

describe("/api/storage/branch/[id]", () => {
  it("enforces role and branch ownership", async () => {
    const admin = await loginAs("admin", "admin");
    const mgr = await loginAs("mgr", "pw1234");
    const cli = await loginAs("cli", "pw1234");
    const put = (cookie, id, body) => branchRoute.PUT(req("PUT", `/api/storage/branch/${id}`, { cookie, body }), ctx(id));
    const get = (cookie, id) => branchRoute.GET(req("GET", `/api/storage/branch/${id}`, { cookie }), ctx(id));

    expect((await get(mgr.cookie, 5)).status).toBe(404); // 아직 데이터 없음
    expect((await put(admin.cookie, 5, { value: { keywords: [] } })).status).toBe(200);
    expect((await get(mgr.cookie, 5)).status).toBe(200);
    expect((await get(cli.cookie, 5)).status).toBe(200);
    expect((await get(mgr.cookie, 6)).status).toBe(403);
    expect((await put(cli.cookie, 5, { value: { keywords: [] } })).status).toBe(403);
    expect((await put(mgr.cookie, 6, { value: {} })).status).toBe(403);
    expect((await put(mgr.cookie, 5, { value: [] })).status).toBe(400);
    expect((await get(undefined, 5)).status).toBe(401);
  });
  it("detects concurrent edits with baseUpdatedAt and allows a forced overwrite", async () => {
    const admin = await loginAs("admin", "admin");
    const mgr = await loginAs("mgr", "pw1234");
    const put = (cookie, body) => branchRoute.PUT(req("PUT", "/api/storage/branch/5", { cookie, body }), ctx(5));

    const first = await (await put(admin.cookie, { value: { v: 1 }, baseUpdatedAt: null })).json();
    const second = await put(mgr.cookie, { value: { v: 2 }, baseUpdatedAt: first.updatedAt });
    expect(second.status).toBe(200);
    const stale = await put(admin.cookie, { value: { v: 3 }, baseUpdatedAt: first.updatedAt });
    expect(stale.status).toBe(409);
    expect((await stale.json()).value).toEqual({ v: 2 });
    const forced = await put(admin.cookie, { value: { v: 3 }, baseUpdatedAt: first.updatedAt, force: true });
    expect(forced.status).toBe(200);
    expect(store.get("reberryos-v1-b-5").value).toEqual({ v: 3 });
  });
  it("lets only admins delete", async () => {
    const admin = await loginAs("admin", "admin");
    const mgr = await loginAs("mgr", "pw1234");
    store.set("reberryos-v1-b-5", { value: { v: 1 }, updated_at: "2026-01-01T00:00:00+00:00" });
    expect((await branchRoute.DELETE(req("DELETE", "/api/storage/branch/5", { cookie: mgr.cookie }), ctx(5))).status).toBe(403);
    expect((await branchRoute.DELETE(req("DELETE", "/api/storage/branch/5", { cookie: admin.cookie }), ctx(5))).status).toBe(200);
    expect(store.has("reberryos-v1-b-5")).toBe(false);
  });
});

describe("/api/keyword-research/collect auth", () => {
  it("rejects anonymous calls but accepts the CRON_SECRET bearer token or an admin session", async () => {
    expect((await collect.GET(req("GET", "/api/keyword-research/collect?all=true"))).status).toBe(401);
    const mgr = await loginAs("mgr", "pw1234");
    expect((await collect.GET(req("GET", "/api/keyword-research/collect?all=true", { cookie: mgr.cookie }))).status).toBe(403);
    const viaCron = await collect.GET(req("GET", "/api/keyword-research/collect?all=true", { headers: { authorization: "Bearer cron-secret-for-tests" } }));
    expect([401, 403]).not.toContain(viaCron.status);
    const admin = await loginAs("admin", "admin");
    const viaAdmin = await collect.GET(req("GET", "/api/keyword-research/collect?all=true", { cookie: admin.cookie }));
    expect([401, 403]).not.toContain(viaAdmin.status);
  });
});
