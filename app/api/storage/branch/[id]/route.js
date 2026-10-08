import { requireSession } from "@/lib/server/session";
import { canReadBranch, canWriteBranch } from "@/lib/server/authz";
import { readStorage, writeStorage, deleteStorage, branchKey } from "@/lib/server/supabase";

const bad = (status, error) => Response.json({ error }, { status });
const sameTime = (a, b) => new Date(a).getTime() === new Date(b).getTime();

async function idOf(ctx) {
  const p = await ctx.params;
  return String(p?.id || "").trim();
}

export async function GET(req, ctx) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;
  const id = await idOf(ctx);
  if (!id || !canReadBranch(auth.user, id)) return bad(403, "forbidden");
  const row = await readStorage(branchKey(id));
  if (!row) return bad(404, "not found");
  return Response.json({ value: row.value, updatedAt: row.updated_at });
}

export async function PUT(req, ctx) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;
  const id = await idOf(ctx);
  if (!id || !canWriteBranch(auth.user, id)) return bad(403, "forbidden");

  let body;
  try { body = await req.json(); } catch { return bad(400, "invalid body"); }
  const value = body?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return bad(400, "invalid branch payload");

  // 충돌 감지: 클라이언트가 읽었을 때의 updatedAt 과 현재 저장본이 다르면 409 + 현재 값
  if (body.baseUpdatedAt !== undefined && !body.force) {
    const cur = await readStorage(branchKey(id));
    if (cur && !(body.baseUpdatedAt && sameTime(cur.updated_at, body.baseUpdatedAt))) {
      return Response.json({ error: "conflict", value: cur.value, updatedAt: cur.updated_at }, { status: 409 });
    }
  }

  const updatedAt = await writeStorage(branchKey(id), value);
  return Response.json({ updatedAt });
}

export async function DELETE(req, ctx) {
  const auth = await requireSession(req, { roles: ["admin"] });
  if (!auth.ok) return auth.response;
  const id = await idOf(ctx);
  if (!id) return bad(400, "id required");
  await deleteStorage(branchKey(id));
  return Response.json({ ok: true });
}
