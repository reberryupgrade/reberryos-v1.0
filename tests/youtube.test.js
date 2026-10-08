import { describe, it, expect } from "vitest";
import { buildYoutubeUrl } from "../lib/server/youtube.js";

const sp = (q) => new URLSearchParams(q);

describe("buildYoutubeUrl", () => {
  it("builds a videos url with server key only", () => {
    const u = new URL(buildYoutubeUrl(sp("endpoint=videos&part=snippet,statistics&id=abc&key=CLIENTKEY"), "SERVERKEY"));
    expect(u.origin + u.pathname).toBe("https://www.googleapis.com/youtube/v3/videos");
    expect(u.searchParams.get("part")).toBe("snippet,statistics");
    expect(u.searchParams.get("id")).toBe("abc");
    expect(u.searchParams.get("key")).toBe("SERVERKEY");
  });
  it("drops params that are not whitelisted for the endpoint", () => {
    const u = new URL(buildYoutubeUrl(sp("endpoint=channels&part=snippet&id=UC1&q=injected&fields=*"), "K"));
    expect(u.searchParams.has("q")).toBe(false);
    expect(u.searchParams.has("fields")).toBe(false);
  });
  it("rejects unknown endpoints and missing key", () => {
    expect(() => buildYoutubeUrl(sp("endpoint=../oauth2&part=snippet"), "K")).toThrow("invalid endpoint");
    expect(() => buildYoutubeUrl(sp("endpoint=videos&part=snippet"), "")).toThrow("api key missing");
  });
});
