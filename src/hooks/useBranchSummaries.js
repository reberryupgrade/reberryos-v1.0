"use client";
import { useState, useEffect } from "react";
import { loadBranch } from "@/src/lib/api";

// 관리자 대시보드 카드용 지점별 요약 (키워드 수, 유튜브 조회수, 월 비용)
export function summarizeBranch(d) {
  const off = [...(d.offline?.elevator || []), ...(d.offline?.subway || []), ...(d.offline?.other || [])]
    .filter((a) => a.status === "집행중")
    .reduce((a, x) => a + (+x.cost || 0), 0);
  const kwC = Object.values(d.keywordCosts || {}).reduce((a, x) => a + (+x || 0), 0);
  const commC = Object.values(d.community || {}).reduce((a, p) => a + (+p.cost || 0), 0);
  const inhC = (+d.inhouse?.messagesCost || 0) + (+d.inhouse?.reviewsCost || 0) + (+d.inhouse?.photosCost || 0) + (+d.inhouse?.videosCost || 0);
  return {
    keywords: d.keywords?.length || 0,
    ytViews: d.youtube?.reduce((a, x) => a + (+x.views || 0), 0) || 0,
    cost: kwC + (+d.mapsCost || 0) + (+d.experienceCost || 0) + (+d.cafesCost || 0) + (+d.youtubeCost || 0) + (+d.shortformCost || 0) + (+d.autocompleteCost || 0) + (+d.seoCost || 0) + commC + inhC + off,
  };
}

export function useBranchSummaries(branches) {
  const [summaries, setSummaries] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sums = {};
      for (const b of branches || []) {
        const d = (await loadBranch(b.id))?.value;
        if (d) sums[b.id] = summarizeBranch(d);
      }
      if (!cancelled) setSummaries(sums);
    })();
    return () => { cancelled = true; };
  }, [branches]);
  return summaries;
}
