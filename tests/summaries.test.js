import { describe, it, expect } from "vitest";
import { summarizeBranch } from "../src/hooks/useBranchSummaries.js";

describe("summarizeBranch", () => {
  it("adds up every channel cost, counts keywords and sums youtube views", () => {
    const d = {
      keywords: [{}, {}, {}],
      youtube: [{ views: 100 }, { views: 250 }],
      keywordCosts: { 블로그: 1000, 카페: 500 },
      mapsCost: 10, experienceCost: 20, cafesCost: 30, youtubeCost: 40, shortformCost: 50, autocompleteCost: 60, seoCost: 70,
      community: { 당근마켓: { cost: 5 }, 맘카페: { cost: 6 } },
      inhouse: { messagesCost: 1, reviewsCost: 2, photosCost: 3, videosCost: 4 },
      offline: {
        elevator: [{ status: "집행중", cost: 1000 }, { status: "종료", cost: 9999 }],
        subway: [{ status: "집행중", cost: "200" }],
        other: [],
      },
    };
    expect(summarizeBranch(d)).toEqual({ keywords: 3, ytViews: 350, cost: 1500 + 280 + 11 + 10 + 1200 });
  });
  it("tolerates missing sections", () => {
    expect(summarizeBranch({})).toEqual({ keywords: 0, ytViews: 0, cost: 0 });
  });
});
