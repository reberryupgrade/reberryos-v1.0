export async function GET(req) {
  const url = new URL(req.url);
  const testKeyword = url.searchParams.get("q") || "강남 피부과";
  const results = {};
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const headers = { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9", "Referer": "https://www.naver.com/" };

  // 환경변수
  results.env = {
    KAKAO: process.env.KAKAO_REST_API_KEY ? "✅" : "❌",
    NAVER_AD_KEY: process.env.NAVER_AD_API_KEY ? "✅" : "❌",
    NAVER_AD_SECRET: process.env.NAVER_AD_SECRET ? "✅" : "❌",
    NAVER_AD_CID: process.env.NAVER_AD_CUSTOMER_ID || "❌",
  };

  // 탭 순서 감지 디버그
  try {
    const res = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(testKeyword)}`, { headers });
    const html = await res.text();

    // main_pack 위치 확인
    const mainPackIdx = html.indexOf('id="main_pack"');
    const contentIdx = html.indexOf('id="content"');
    const contentWrapIdx = html.indexOf('class="content_wrap"');

    let mainStart = mainPackIdx >= 0 ? mainPackIdx : contentIdx >= 0 ? contentIdx : contentWrapIdx >= 0 ? contentWrapIdx : Math.floor(html.length * 0.3);
    const mainHtml = html.slice(mainStart);

    // 방법1: data-module-name
    const moduleMap = { "powerlink":"파워링크","nx_brand_search":"브랜드검색","place":"플레이스","local":"플레이스","blog":"블로그","cafe":"카페","kin":"지식인","news":"뉴스","image":"이미지","video":"동영상","vod":"동영상","shop":"쇼핑","webkr":"웹사이트","populartopic":"인기글","homepage":"홈페이지","related_query":"함께찾는" };
    const m1 = [];
    const modRe = /data-module-name="(\w+)"/g;
    let mm; while ((mm = modRe.exec(mainHtml)) !== null) { m1.push({ raw: mm[1], mapped: moduleMap[mm[1]] || mm[1], pos: mm.index }); }

    // 방법2: sc_new sp_*
    const m2 = [];
    const scRe = /class="[^"]*sc_new\s+sp_(\w+)/g;
    while ((mm = scRe.exec(mainHtml)) !== null) { m2.push({ raw: mm[1], pos: mm.index }); }

    // mainHtml 첫 500자 샘플
    const mainSample = mainHtml.slice(0, 500).replace(/</g, "[").replace(/>/g, "]");

    results.tabDetection = {
      htmlLength: html.length,
      mainPackIdx,
      contentIdx,
      contentWrapIdx,
      mainStart,
      mainHtmlLength: mainHtml.length,
      method1_modules: m1.slice(0, 15),
      method2_scNew: m2.slice(0, 10),
      mainHtmlSample: mainSample,
    };

    // 최종 탭 순서 (route.js와 동일 로직)
    const tabOrder = [];
    const seen = new Set();
    for (const item of m1) {
      const name = item.mapped;
      if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
    }
    results.tabDetection.finalOrder = tabOrder;

  } catch (e) { results.tabDetection = { error: e.message }; }

  // 네이버 검색광고 API
  try {
    const adApiKey = process.env.NAVER_AD_API_KEY;
    const adSecret = process.env.NAVER_AD_SECRET;
    const adCustomerId = process.env.NAVER_AD_CUSTOMER_ID;
    if (adApiKey && adSecret && adCustomerId) {
      const crypto = await import("crypto");
      const timestamp = String(Date.now());
      const hmac = crypto.createHmac("sha256", adSecret);
      hmac.update(timestamp + ".GET./keywordstool");
      const signature = hmac.digest("base64");
      const apiUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURIComponent(testKeyword)}&showDetail=1`;
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: { "X-Timestamp": timestamp, "X-API-KEY": adApiKey, "X-API-SECRET": adSecret, "X-Customer": String(adCustomerId), "X-Signature": signature }
      });
      const text = await res.text();
      if (res.status === 200) {
        try {
          const data = JSON.parse(text);
          const first = data?.keywordList?.[0];
          results.naverAd = { status: 200, keyword: first?.relKeyword, pc: first?.monthlyPcQcCnt, mobile: first?.monthlyMobileQcCnt, competition: first?.compIdx };
        } catch { results.naverAd = { status: 200, raw: text.slice(0, 300) }; }
      } else {
        results.naverAd = { status: res.status, response: text.slice(0, 300) };
      }
    }
  } catch (e) { results.naverAd = { error: e.message }; }

  // 카카오맵
  try {
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (kakaoKey) {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(testKeyword)}&size=5`, {
        headers: { "Authorization": `KakaoAK ${kakaoKey}` }
      });
      const data = await res.json();
      results.kakao = { status: res.status, places: (data?.documents || []).map(d => d.place_name) };
    }
  } catch (e) { results.kakao = { error: e.message }; }

  return Response.json({ test: "REBERRYOS 진단 v3", keyword: testKeyword, timestamp: new Date().toISOString(), results });
}
