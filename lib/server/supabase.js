import { createClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트.
// SUPABASE_SERVICE_ROLE_KEY 가 있으면 그것을 쓰고, 없으면 anon 키로 동작한다
// (anon 키는 allow_all 정책이 남아 있는 동안만 쓰기가 가능하다).
let cached = null;

export function getServerSupabase() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[supabase] SUPABASE_SERVICE_ROLE_KEY not set; falling back to anon key");
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export const SYS_KEY = "reberryos-v1-sys";
export const branchKey = (id) => `reberryos-v1-b-${id}`;

export async function readStorage(key) {
  const { data, error } = await getServerSupabase()
    .from("app_storage")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data; // null | { value, updated_at }
}

export async function writeStorage(key, value) {
  const updated_at = new Date().toISOString();
  const { data, error } = await getServerSupabase()
    .from("app_storage")
    .upsert({ key, value, updated_at })
    .select("updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data.updated_at; // DB 가 돌려주는 표기 그대로 (충돌 비교에 쓰므로)
}

export async function deleteStorage(key) {
  const { error } = await getServerSupabase().from("app_storage").delete().eq("key", key);
  if (error) throw new Error(error.message);
}
