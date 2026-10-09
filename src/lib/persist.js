// 서버에 저장하기 직전에 지점 데이터에서 일회성 디버그 정보를 걷어낸다.
// 순위 조회 때 붙는 HTML 샘플/추출 로그는 화면에서 "디버그" 패널로만 쓰이고
// 저장 용량의 약 1/3 을 차지하므로, 조회 직후 메모리에서만 유지한다.
const RANK_DETAIL_DROP = ["_tabDebug", "_placeDebug"];
const MAP_DETAIL_DROP = ["_placeDebug", "_kakaoDebug", "_googleDebug"];

function omit(obj, keys) {
  if (!obj || typeof obj !== "object") return obj;
  let changed = false;
  const out = { ...obj };
  for (const k of keys) if (k in out) { delete out[k]; changed = true; }
  return changed ? out : obj;
}

export function stripDebug(data) {
  if (!data || typeof data !== "object") return data;
  let changed = false;
  const out = { ...data };
  if (Array.isArray(data.keywords)) {
    out.keywords = data.keywords.map((k) => {
      const rd = omit(k._rankDetail, RANK_DETAIL_DROP);
      const ki = omit(k._kakaoInfo, ["debug"]);
      if (rd === k._rankDetail && ki === k._kakaoInfo) return k;
      changed = true;
      const n = { ...k };
      if (rd !== k._rankDetail) n._rankDetail = rd;
      if (ki !== k._kakaoInfo) n._kakaoInfo = ki;
      return n;
    });
  }
  if (Array.isArray(data.maps)) {
    out.maps = data.maps.map((m) => {
      const md = omit(m._mapDetail, MAP_DETAIL_DROP);
      if (md === m._mapDetail) return m;
      changed = true;
      return { ...m, _mapDetail: md };
    });
  }
  return changed ? out : data;
}
