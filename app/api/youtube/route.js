import { requireSession } from "@/lib/server/session";
import { buildYoutubeUrl } from "@/lib/server/youtube";

// 브라우저 -> /api/youtube?endpoint=videos&part=...&id=...
// 서버가 YOUTUBE_API_KEY 를 붙여 Google 에 대신 요청한다.
export async function GET(req) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return Response.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });

  let target;
  try {
    target = buildYoutubeUrl(new URL(req.url).searchParams, apiKey);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const res = await fetch(target);
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
}
