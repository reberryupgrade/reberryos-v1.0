// YouTube Data API v3 프록시용 URL 생성 (순수 함수)
// endpoint 와 파라미터를 화이트리스트로 제한하고 서버 키를 붙인다.
const ALLOWED = {
  videos: ["part", "id"],
  commentThreads: ["part", "videoId", "maxResults", "order"],
  channels: ["part", "id"],
  search: ["part", "q", "type", "maxResults"],
  playlistItems: ["part", "playlistId", "maxResults"],
};

export function buildYoutubeUrl(searchParams, apiKey) {
  const endpoint = searchParams.get("endpoint");
  const allowed = ALLOWED[endpoint];
  if (!allowed) throw new Error("invalid endpoint");
  if (!apiKey) throw new Error("api key missing");
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const k of allowed) {
    const v = searchParams.get(k);
    if (v != null && v !== "") url.searchParams.set(k, v);
  }
  url.searchParams.set("key", apiKey);
  return url.toString();
}
