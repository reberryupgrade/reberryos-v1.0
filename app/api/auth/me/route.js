import { requireSession } from "@/lib/server/session";

// 로그인 여부 조회. 세션이 없는 것은 오류가 아니므로 200 + user:null 로 답한다.
export async function GET(req) {
  const auth = await requireSession(req);
  return Response.json({ user: auth.ok ? auth.user : null });
}
