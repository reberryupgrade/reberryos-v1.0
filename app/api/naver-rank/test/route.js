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
        statusText: res.statusText,
        results: res.status === 200 ? JSON.parse(text)?.documents?.map(d => d.place_name).slice(0, 3) : text.slice(0, 300)
      };
    } else {
      results.kakao = { error: "KAKAO_REST_API_KEY 환경변수가 없습니다" };
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

      // encodeURIComponent 사용 (공백을 %20으로)
      const apiUrl = `https://api.searchad.naver.com/keywordstool?hintKeywords=${encodeURIComponent(testKeyword)}&showDetail=1`;

      results.naverAd_debug = { url: apiUrl, timestamp, customerId: adCustomerId };

      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "X-Timestamp": timestamp,
          "X-API-KEY": adApiKey,
          "X-Customer": adCustomerId,
          "X-Signature": signature,
        }
      });
      const text = await res.text();
      results.naverAd = { status: res.status, response: text.slice(0, 500) };
      if (res.status === 200) {
        try {
          const data = JSON.parse(text);
          const first = data?.keywordList?.[0];
          results.naverAd = { status: 200, keyword: first?.relKeyword, pc: first?.monthlyPcQcCnt, mobile: first?.monthlyMobileQcCnt, total: data?.keywordList?.length + "개 키워드" };
        } catch {}
      }
    } else {
      results.naverAd = { error: "환경변수 미설정", detail: { key: !!adApiKey, secret: !!adSecret, customer: !!adCustomerId } };
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

  return Response.json({ test: "REBERRYOS API 진단", timestamp: new Date().toISOString(), keyword: testKeyword, results });
}
