export async function GET() {
  const results = {};

  results.env = {
    KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ? "설정됨 (" + process.env.KAKAO_REST_API_KEY.slice(0, 6) + "...)" : "❌ 미설정",
    NAVER_AD_API_KEY: process.env.NAVER_AD_API_KEY ? "설정됨 (" + process.env.NAVER_AD_API_KEY.slice(0, 6) + "...)" : "❌ 미설정",
    NAVER_AD_SECRET: process.env.NAVER_AD_SECRET ? "설정됨" : "❌ 미설정",
    NAVER_AD_CUSTOMER_ID: process.env.NAVER_AD_CUSTOMER_ID ? "설정됨 (" + process.env.NAVER_AD_CUSTOMER_ID + ")" : "❌ 미설정",
  };

  const testKeyword = "피부과";
  const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const headers = { "User-Agent": ua, "Accept": "text/html", "Accept-Language": "ko-KR,ko;q=0.9", "Referer": "https://www.naver.com/" };

  // 1. 카카오 API 테스트
  try {
    const kakaoKey = process.env.KAKAO_REST_API_KEY;
    if (kakaoKey) {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(testKeyword)}&size=5`, {
        headers: { "Authorization": `KakaoAK ${kakaoKey}` }
      });
      const data = await res.json();
      results.kakao = {
        status: res.status,
        count: data?.documents?.length || 0,
        places: (data?.documents || []).slice(0, 5).map(d => d.place_name),
        note: "순위 매칭은 placeName과 대소문자 무관 포함 여부로 판단"
      };
    }
  } catch (e) { results.kakao = { error: e.message }; }

  // 2. 네이버 검색광고 API - 3가지 방법 시도
  try {
    const adApiKey = process.env.NAVER_AD_API_KEY;
    const adSecret = process.env.NAVER_AD_SECRET;
    const adCustomerId = process.env.NAVER_AD_CUSTOMER_ID;
    if (adApiKey && adSecret && adCustomerId) {
      const crypto = await import("crypto");

      const tryApi = async (baseUrl, kw, label) => {
        const timestamp = String(Date.now());
        const hmac = crypto.createHmac("sha256", adSecret);
        hmac.update(timestamp + ".GET./keywordstool");
        const signature = hmac.digest("base64");
        const url = `${baseUrl}/keywordstool?hintKeywords=${encodeURIComponent(kw)}&showDetail=1`;
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "X-Timestamp": timestamp,
              "X-API-KEY": adApiKey,
              "X-Customer": String(adCustomerId),
              "X-Signature": signature,
            }
          });
          const text = await res.text();
          return { label, url: url.slice(0, 100), status: res.status, response: text.slice(0, 300) };
        } catch (e) { return { label, error: e.message }; }
      };

      // 시도 1: api.naver.com + 한글키워드
      const r1 = await tryApi("https://api.naver.com", testKeyword, "api.naver.com");
      // 시도 2: api.searchad.naver.com + 한글키워드
      const r2 = await tryApi("https://api.searchad.naver.com", testKeyword, "api.searchad.naver.com");
      // 시도 3: api.naver.com + 영어키워드 (인코딩 문제 확인용)
      const r3 = await tryApi("https://api.naver.com", "coffee", "api.naver.com+영어");

      results.naverAd = { attempts: [r1, r2, r3] };
    } else {
      results.naverAd = { error: "환경변수 미설정" };
    }
  } catch (e) { results.naverAd = { error: e.message }; }

  // 3. 탭 순서 감지 테스트
  try {
    const res = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(testKeyword)}`, { headers });
    const html = await res.text();
    const tabDebug = { htmlLength: html.length, status: res.status };

    const moduleMap = { "powerlink":"파워링크","nx_brand_search":"브랜드검색","place":"플레이스","local":"플레이스","blog":"블로그","cafe":"카페","kin":"지식인","news":"뉴스","image":"이미지","video":"동영상","vod":"동영상","shop":"쇼핑","webkr":"웹사이트" };

    // 방법1: data-module-name
    const m1raw = [];
    const modRe = /data-module-name="(\w+)"/g;
    let mm; while ((mm = modRe.exec(html)) !== null) { m1raw.push(mm[1]); }
    tabDebug.method1_raw = m1raw.slice(0, 20);
    tabDebug.method1_mapped = [...new Set(m1raw.map(m => moduleMap[m]).filter(Boolean))];

    // HTML에서 섹션 키워드 직접 검색
    const sectionCheck = {};
    for (const word of ["플레이스","블로그","카페","지식iN","뉴스","이미지","동영상","쇼핑","파워링크"]) {
      const idx = html.indexOf(word);
      sectionCheck[word] = idx >= 0 ? `발견(${idx})` : "X";
    }
    tabDebug.sectionCheck = sectionCheck;

    // class 패턴 샘플
    const classes = [];
    const cpRe = /class="([^"]*(?:sc_new|module|section|fds-)[^"]*)"/g;
    while ((mm = cpRe.exec(html)) !== null && classes.length < 10) { classes.push(mm[1].slice(0, 80)); }
    tabDebug.classPatterns = classes;

    // 처음 나오는 data- 속성들
    const dataAttrs = [];
    const daRe = /(data-[\w-]+)=/g;
    const daSeen = new Set();
    while ((mm = daRe.exec(html)) !== null && dataAttrs.length < 15) {
      if (!daSeen.has(mm[1])) { dataAttrs.push(mm[1]); daSeen.add(mm[1]); }
    }
    tabDebug.dataAttributes = dataAttrs;

    results.tabOrder = tabDebug;
  } catch (e) { results.tabOrder = { error: e.message }; }

  // 4. 구글맵
  try {
    const res = await fetch(`https://www.google.com/search?q=${encodeURIComponent(testKeyword)}&hl=ko&gl=kr&tbm=lcl`, {
      headers: { "User-Agent": ua, "Accept-Language": "ko-KR" }
    });
    results.google = { status: res.status, bodyLength: (await res.text()).length };
  } catch (e) { results.google = { error: e.message }; }

  // 5. 네이버 지도
  try {
    const res = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(testKeyword)}&type=all`, {
      headers: { "User-Agent": ua, "Accept": "application/json" }
    });
    const text = await res.text();
    if (text.startsWith("{")) {
      const data = JSON.parse(text);
      results.naverMap = { status: res.status, count: data?.result?.place?.list?.length || 0 };
    } else {
      results.naverMap = { status: res.status, note: "해외IP (통합검색으로 대체됨)" };
    }
  } catch (e) { results.naverMap = { error: e.message }; }

  return Response.json({ test: "REBERRYOS 진단 v2", timestamp: new Date().toISOString(), keyword: testKeyword, results });
}
