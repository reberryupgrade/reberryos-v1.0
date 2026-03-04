export async function GET() {
  const results = {};

  results.env = {
    KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ? "설정됨 (" + process.env.KAKAO_REST_API_KEY.slice(0, 6) + "...)" : "❌ 미설정",
    NAVER_AD_API_KEY: process.env.NAVER_AD_API_KEY ? "설정됨 (" + process.env.NAVER_AD_API_KEY.slice(0, 6) + "...)" : "❌ 미설정",
    NAVER_AD_SECRET: process.env.NAVER_AD_SECRET ? "설정됨" : "❌ 미설정",
    NAVER_AD_CUSTOMER_ID: process.env.NAVER_AD_CUSTOMER_ID ? "설정됨 (" + process.env.NAVER_AD_CUSTOMER_ID + ")" : "❌ 미설정",
  };

  const testKeyword = "강남 피부과";
  const encoded = encodeURIComponent(testKeyword);
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const headers = { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9", "Referer": "https://www.naver.com/" };

  // 2. 카카오 API 테스트
  try {
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (kakaoKey) {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encoded}&size=3`, {
        headers: { "Authorization": `KakaoAK ${kakaoKey}` }
      });
      const text = await res.text();
      results.kakao = {
        status: res.status,
        results: res.status === 200 ? JSON.parse(text)?.documents?.map(d => d.place_name).slice(0, 3) : text.slice(0, 300)
      };
    } else {
      results.kakao = { error: "KAKAO_REST_API_KEY 미설정" };
    }
  } catch (e) { results.kakao = { error: e.message }; }

  // 3. 네이버 검색광고 API 테스트
  try {
    const adApiKey = process.env.NAVER_AD_API_KEY;
    const adSecret = process.env.NAVER_AD_SECRET;
    const adCustomerId = process.env.NAVER_AD_CUSTOMER_ID;
    if (adApiKey && adSecret && adCustomerId) {
      const timestamp = String(Date.now());
      const crypto = await import("crypto");
      const hmac = crypto.createHmac("sha256", adSecret);
      hmac.update(timestamp + ".GET./keywordstool");
      const signature = hmac.digest("base64");
      const apiUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURIComponent(testKeyword)}&showDetail=1`;
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: { "X-Timestamp": timestamp, "X-API-KEY": adApiKey, "X-Customer": adCustomerId, "X-Signature": signature }
      });
      const text = await res.text();
      if (res.status === 200) {
        try {
          const data = JSON.parse(text);
          const first = data?.keywordList?.[0];
          results.naverAd = { status: 200, keyword: first?.relKeyword, pc: first?.monthlyPcQcCnt, mobile: first?.monthlyMobileQcCnt, total: data?.keywordList?.length + "개 키워드" };
        } catch { results.naverAd = { status: 200, parseError: true, response: text.slice(0, 300) }; }
      } else {
        results.naverAd = { status: res.status, response: text.slice(0, 500) };
      }
    } else {
      results.naverAd = { error: "환경변수 미설정" };
    }
  } catch (e) { results.naverAd = { error: e.message }; }

  // 4. 구글맵 테스트
  try {
    const res = await fetch(`https://www.google.com/search?q=${encoded}&hl=ko&gl=kr&tbm=lcl`, {
      headers: { "User-Agent": ua, "Accept-Language": "ko-KR" }
    });
    results.google = { status: res.status, bodyLength: (await res.text()).length };
  } catch (e) { results.google = { error: e.message }; }

  // 5. 네이버 지도 테스트
  try {
    const res = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all`, {
      headers: { "User-Agent": ua, "Accept": "application/json" }
    });
    const text = await res.text();
    if (text.startsWith("{") || text.startsWith("[")) {
      const data = JSON.parse(text);
      results.naverMap = { status: res.status, placeCount: data?.result?.place?.list?.length || 0, first3: (data?.result?.place?.list || []).slice(0, 3).map(p => p.name) };
    } else {
      results.naverMap = { status: res.status, note: "해외IP - HTML 응답 (통합검색 플레이스로 대체됨)", bodyPreview: text.slice(0, 100) };
    }
  } catch (e) { results.naverMap = { error: e.message }; }

  // 6. 탭 순서 감지 테스트 (핵심 디버그!)
  try {
    const res = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encoded}`, { headers });
    const html = await res.text();
    const tabDebug = { htmlLength: html.length, status: res.status };

    // 방법1: data-module-name
    const moduleMap = { "powerlink":"파워링크","nx_brand_search":"브랜드검색","place":"플레이스","local":"플레이스","blog":"블로그","cafe":"카페","kin":"지식인","news":"뉴스","image":"이미지","video":"동영상","vod":"동영상","shop":"쇼핑","webkr":"웹사이트","book":"도서","encyc":"지식백과" };
    const method1 = [];
    const modRe = /data-module-name="(\w+)"/g;
    let mm; while ((mm = modRe.exec(html)) !== null) { method1.push(mm[1]); }
    tabDebug.method1_raw = method1.slice(0, 20);
    tabDebug.method1_mapped = [...new Set(method1.map(m => moduleMap[m]).filter(Boolean))];

    // 방법2: sc_new sp_*
    const method2 = [];
    const scRe = /class="[^"]*sc_new\s+sp_(\w+)/g;
    while ((mm = scRe.exec(html)) !== null) { method2.push(mm[1]); }
    tabDebug.method2_raw = method2.slice(0, 20);

    // 방법5: 직접 섹션 키워드 검색
    const sectionSearch = {};
    const checks = ["파워링크","플레이스","블로그","카페","지식iN","뉴스","이미지","동영상","쇼핑"];
    for (const c of checks) {
      const idx = html.indexOf(c);
      sectionSearch[c] = idx >= 0 ? `발견(위치:${idx})` : "미발견";
    }
    tabDebug.sectionSearch = sectionSearch;

    // HTML 앞부분 샘플
    tabDebug.htmlSample = html.slice(0, 500).replace(/</g, "&lt;").slice(0, 300);

    // 실제 사용되는 class 패턴 샘플
    const classPatterns = [];
    const cpRe = /class="([^"]*(?:sc_new|api_subject|fds-comps|module)[^"]*)"/g;
    while ((mm = cpRe.exec(html)) !== null && classPatterns.length < 15) { classPatterns.push(mm[1]); }
    tabDebug.classPatterns = classPatterns;

    results.tabOrder = tabDebug;
  } catch (e) { results.tabOrder = { error: e.message }; }

  return Response.json({ test: "REBERRYOS API 진단 v1.1.4", timestamp: new Date().toISOString(), keyword: testKeyword, results });
}
