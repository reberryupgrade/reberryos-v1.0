import { readStorage, writeStorage, SYS_KEY } from "@/lib/server/supabase";
import { signSession, sessionCookie } from "@/lib/server/session";
import { BOOTSTRAP_SYSTEM, verifyPassword, hasLegacyPasswords, normalizeUsers, publicUser } from "@/lib/server/users";

// 아주 단순한 IP 별 실패 횟수 제한 (서버리스 인스턴스 메모리 기준, 보조 수단)
const fails = new Map(); // ip -> { count, until }
const LIMIT = 5;
const WINDOW_MS = 60_000;
const ipOf = (req) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
function isBlocked(ip) {
  const f = fails.get(ip);
  if (!f) return false;
  if (Date.now() > f.until) { fails.delete(ip); return false; }
  return f.count >= LIMIT;
}
function recordFail(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() > f.until) fails.set(ip, { count: 1, until: Date.now() + WINDOW_MS });
  else f.count += 1;
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "invalid body" }, { status: 400 }); }
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) return Response.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });

  const ip = ipOf(req);
  if (isBlocked(ip)) return Response.json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요." }, { status: 429 });

  let sys = (await readStorage(SYS_KEY))?.value;
  if (!sys) { sys = BOOTSTRAP_SYSTEM; await writeStorage(SYS_KEY, sys); }

  const user = (sys.users || []).find((u) => u.username === username);
  if (!(await verifyPassword(user, password))) {
    recordFail(ip);
    return Response.json({ error: "아이디 또는 비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  // 레거시 평문 비밀번호가 남아 있으면 이 기회에 전부 해시로 이전
  if (hasLegacyPasswords(sys.users)) {
    const users = await normalizeUsers(sys.users, sys.users);
    await writeStorage(SYS_KEY, { ...sys, users });
  }

  let token;
  try {
    token = await signSession(user);
  } catch (e) {
    // AUTH_SECRET 이 없거나 32자 미만이면 여기서 실패한다. 배포 환경변수 문제임을 화면에 알려준다.
    console.error("[login] signSession failed:", e.message);
    return Response.json({ error: "서버 설정 오류: AUTH_SECRET 환경변수가 없거나 너무 짧습니다. 배포 설정을 확인하세요." }, { status: 500 });
  }
  return Response.json({ user: publicUser(user) }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
