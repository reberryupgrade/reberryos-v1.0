import { SignJWT, jwtVerify } from "jose";
import { readStorage, SYS_KEY } from "./supabase";

export const COOKIE_NAME = "reberry_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7일

function keyFrom(secret) {
  const s = secret ?? process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET missing or shorter than 32 chars");
  return new TextEncoder().encode(s);
}

// 세션 토큰 발급. secret/expiresIn 은 테스트용 주입 지점.
export async function signSession(user, { secret, expiresIn = `${SESSION_MAX_AGE_SEC}s` } = {}) {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(keyFrom(secret));
}

export async function verifySession(token, { secret } = {}) {
  const { payload } = await jwtVerify(token, keyFrom(secret), { algorithms: ["HS256"] });
  return payload; // { sub, username, role, iat, exp }
}

export function parseCookies(header) {
  const out = {};
  for (const part of (header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function getToken(req) {
  return parseCookies(req.headers.get("cookie")) [COOKIE_NAME] || null;
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}${secure}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

const deny = (status, error) => ({ ok: false, response: Response.json({ error }, { status }) });

// 요청의 세션 쿠키를 검증하고, 시스템 사용자 목록에서 현재 레코드를 다시 읽어
// 역할/소속 지점을 최신 상태로 돌려준다 (삭제된 사용자는 즉시 차단).
export async function requireSession(req, { roles } = {}) {
  const token = getToken(req);
  if (!token) return deny(401, "unauthorized");
  let payload;
  try {
    payload = await verifySession(token);
  } catch {
    return deny(401, "unauthorized");
  }
  const sys = await readStorage(SYS_KEY);
  const u = (sys?.value?.users || []).find((x) => String(x.id) === String(payload.sub));
  if (!u) return deny(401, "unauthorized");
  const user = { id: u.id, username: u.username, name: u.name, role: u.role, branchId: u.branchId ?? null };
  if (roles && !roles.includes(user.role)) return deny(403, "forbidden");
  return { ok: true, user, system: sys };
}
