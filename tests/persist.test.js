import { describe, it, expect } from "vitest";
import { stripDebug } from "../src/lib/persist.js";

describe("stripDebug", () => {
  it("removes rank/map debug payloads but keeps titles and ranks", () => {
    const data = {
      keywords: [
        { id: 1, keyword: "a", myBlogRank: "3위", _rankDetail: { blog: ["t1"], _tabDebug: { html: "..." }, _placeDebug: "x" }, _kakaoInfo: { titles: ["k"], rank: 2, debug: { big: "y" } } },
        { id: 2, keyword: "b" },
      ],
      maps: [{ id: 1, _mapDetail: { place: ["p"], _placeDebug: 1, _kakaoDebug: 2, _googleDebug: 3 } }],
      other: { untouched: true },
    };
    const out = stripDebug(data);
    expect(out.keywords[0]._rankDetail).toEqual({ blog: ["t1"] });
    expect(out.keywords[0]._kakaoInfo).toEqual({ titles: ["k"], rank: 2 });
    expect(out.keywords[0].myBlogRank).toBe("3위");
    expect(out.keywords[1]).toBe(data.keywords[1]);
    expect(out.maps[0]._mapDetail).toEqual({ place: ["p"] });
    expect(out.other).toBe(data.other);
    // 원본은 바뀌지 않는다
    expect(data.keywords[0]._rankDetail._tabDebug).toBeDefined();
  });
  it("returns the same object when there is nothing to strip", () => {
    const data = { keywords: [{ id: 1, _rankDetail: { blog: [] } }], maps: [] };
    expect(stripDebug(data)).toBe(data);
    expect(stripDebug(null)).toBeNull();
  });
});
