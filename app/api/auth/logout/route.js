import { clearSessionCookie } from "@/lib/server/session";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
