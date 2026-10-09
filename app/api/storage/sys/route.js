import { requireSession } from "@/lib/server/session";
import { writeStorage, SYS_KEY } from "@/lib/server/supabase";
import { publicSystem, validateUsers, normalizeUsers } from "@/lib/server/users";

const bad = (status, error) => Response.json({ error }, { status });

// 시스템 설정(지점 목록, 사용자 목록). 비밀번호 해시는 절대 내려주지 않는다.
export async function GET(req) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;
  return Response.json({ value: publicSystem(auth.system.value, auth.user.role), updatedAt: auth.system.updated_at });
}

export async function PUT(req) {
  const auth = await requireSession(req, { roles: ["admin"] });
  if (!auth.ok) return auth.response;

  let body;
  try { body = await req.json(); } catch { return bad(400, "invalid body"); }
  const incoming = body?.value;
  if (!incoming || typeof incoming !== "object" || !Array.isArray(incoming.branches)) return bad(400, "invalid system payload");

  let users;
  try {
    validateUsers(incoming.users);
    users = await normalizeUsers(incoming.users, auth.system.value.users);
  } catch (e) {
    return bad(400, e.message);
  }

  // 지금 로그인한 관리자가 스스로를 지우거나 강등해 잠기는 것 방지
  const me = users.find((u) => String(u.id) === String(auth.user.id));
  if (!me || me.role !== "admin") return bad(400, "현재 로그인한 관리자 계정은 삭제하거나 역할을 바꿀 수 없습니다.");

  const value = { ...incoming, users };
  const updatedAt = await writeStorage(SYS_KEY, value);
  return Response.json({ value: publicSystem(value, "admin"), updatedAt });
}
