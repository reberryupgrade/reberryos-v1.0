// 한국 프록시 경유 fetch (PROXY_URL 설정 시 자동 활성화)
async function proxyFetch(url, opts = {}) {
  const proxyUrl = process.env.PROXY_URL;
  const proxyToken = process.env.PROXY_AUTH_TOKEN;

  // 프록시 미설정 시 직접 fetch
  if (!proxyUrl || !proxyToken) return fetch(url, opts);

  // 프록시 경유가 필요한 도메인 (구글/카카오만)
  const proxyDomains = ["www.google.com","www.google.co.kr","place.map.kakao.com","search.daum.net","map.kakao.com"];
  const hostname = new URL(url).hostname;
  if (!proxyDomains.includes(hostname)) return fetch(url, opts);

  try {
    const res = await fetch(`${proxyUrl}/proxy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Proxy-Auth": proxyToken },
      body: JSON.stringify({
        url,
        method: opts.method || "GET",
        headers: opts.headers || {},
        body: opts.body || undefined,
      }),
    });
    const data = await res.json();
    // 프록시 응답을 Response-like 객체로 변환
    return {
      ok: data.status >= 200 && data.status < 300,
      status: data.status,
      text: async () => data.body,
      json: async () => JSON.parse(data.body),
      headers: { entries: () => Object.entries(data.headers || {}) },
    };
  } catch (e) {
    // 프록시 실패 시 직접 fetch fallback
    console.error("Proxy failed, falling back to direct:", e.message);
    return fetch(url, opts);
  }
}

export async function POST(req) {
  try {
    const { keyword, targets, action, platform } = await req.json();
    if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const headers = { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9", "Referer": "https://www.naver.com/" };
    const encoded = encodeURIComponent(keyword);
    const results = {};
    const tl = (s) => (s || "").toLowerCase();

    // ============ 1. 네이버 통합검색 ============
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encoded}`, { headers });
      const html = await res.text();

      // ---- 탭 순서 감지 (nx_cr_area_info 기반) ----
      const tabOrder = [];
      const seen = new Set();

      // main_pack 시작점
      let mainStart = html.indexOf('id="main_pack"');
      if (mainStart < 0) mainStart = html.indexOf('id="content"');
      if (mainStart < 0) mainStart = Math.floor(html.length * 0.3);
      const mainHtml = html.slice(mainStart);

      // 핵심: nx_cr_area_info 파싱 (네이버 내부 섹션 순서 데이터)
      const crAreaMatch = /nx_cr_area_info\s*=\s*\[([\s\S]*?)\]/.exec(mainHtml);
      if (crAreaMatch) {
        const itemRe = /"n"\s*:\s*"([^"]+)"\s*,\s*"r"\s*:\s*(\d+)/g;
        const items = [];
        let mm; while ((mm = itemRe.exec(crAreaMatch[1])) !== null) {
          items.push({ code: mm[1], rank: parseInt(mm[2]) });
        }
        items.sort((a, b) => a.rank - b.rank);

        // 코드 prefix → 섹션명 매핑
        const prefixMap = {
          "pwl":"파워링크","nmb":"플레이스","nmp":"플레이스","plc":"플레이스","loc":"플레이스",
          "blg":"블로그","ugB":"인기글","ugb":"인기글",
          "caf":"카페","kin":"지식인","nws":"뉴스",
          "img":"이미지","vod":"동영상","vid":"동영상",
          "shp":"쇼핑","sho":"쇼핑",
          "web":"홈페이지","hom":"홈페이지",
          "kwX":"함께찾는","kwL":"연관검색어","rel":"연관검색어",
          "brn":"브랜드검색","brd":"브랜드검색",
          "inf":"인플루언서","sft":"숏폼","faq":"FAQ",
          "boo":"도서","enc":"지식백과","mus":"음악",
        };

        for (const item of items) {
          const prefix = item.code.split("_")[0];
          const name = prefixMap[prefix] || null;
          if (name && !seen.has(name)) {
            tabOrder.push(name);
            seen.add(name);
          }
        }
      }

      // 백업: data-module-name (일부 환경에서 존재할 수 있음)
      if (tabOrder.length < 2) {
        const moduleMap = { "powerlink":"파워링크","place":"플레이스","local":"플레이스","blog":"블로그","cafe":"카페","kin":"지식인","news":"뉴스","image":"이미지","video":"동영상","vod":"동영상","shop":"쇼핑","webkr":"웹사이트","populartopic":"인기글" };
        const modRe = /data-module-name="(\w+)"/g;
        let mm; while ((mm = modRe.exec(mainHtml)) !== null) {
          const name = moduleMap[mm[1]];
          if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
        }
      }

      results.tabOrder = tabOrder;
      results._tabDebug = {
        htmlLen: html.length,
        mainStart,
        crAreaFound: !!crAreaMatch,
        crAreaRaw: crAreaMatch ? crAreaMatch[1].slice(0, 500) : "not found",
        tabOrderResult: tabOrder
      };

      // ---- 플레이스 ----
      const placeTitles = [];
      let placeDebugMethod = "none";

      // 방법1: 스크립트 내부 JSON에서 업체명 추출 (해외 서버 핵심 방법)
      // 네이버 검색 HTML에는 플레이스 데이터가 JS 변수/JSON으로 포함됨
      {
        const jsonPats = [
          /"name"\s*:\s*"([\uAC00-\uD7A3][^"]{1,40})"/g,
          /"title"\s*:\s*"([\uAC00-\uD7A3][^"]{1,40})"/g,
          /"placeName"\s*:\s*"([\uAC00-\uD7A3][^"]{1,40})"/g,
          /"shopName"\s*:\s*"([\uAC00-\uD7A3][^"]{1,40})"/g,
          /"display"\s*:\s*"([\uAC00-\uD7A3][^"]{1,40})"/g,
        ];
        // nmb_hpl 섹션(플레이스) 이후의 스크립트에서만 추출
        const nmbIdx = mainHtml.indexOf("nmb_hpl");
        const searchArea = nmbIdx >= 0 ? mainHtml.slice(nmbIdx, nmbIdx + 50000) : mainHtml.slice(0, 100000);
        const excludeWords = ["관련도순","최신순","옵션","더보기","지도","플레이스","전체","블로그","카페","뉴스","이미지","동영상","쇼핑","파워링크","검색","네이버","설정","로그인","메뉴"];
        for (const p of jsonPats) {
          let m; while ((m = p.exec(searchArea)) !== null && placeTitles.length < 15) {
            const t = m[1].trim();
            if (t.length > 1 && t.length < 45 && !placeTitles.includes(t) && !excludeWords.some(w => t === w || t.includes(w))) {
              placeTitles.push(t);
            }
          }
        }
        if (placeTitles.length > 0) placeDebugMethod = "json_script";
      }

      // 방법2: HTML 태그에서 추출 (한국 서버에서는 이게 동작)
      if (placeTitles.length === 0) {
        const pPats = [
          /class="[^"]*place_bluelink[^"]*"[^>]*>(.*?)<\//gs,
          /class="[^"]*place_tit[^"]*"[^>]*>(.*?)<\//gs,
          /class="[^"]*YwYLL[^"]*"[^>]*>(.*?)<\//gs,
          /class="[^"]*TYaxT[^"]*"[^>]*>(.*?)<\//gs,
        ];
        for (const p of pPats) { let m; while ((m = p.exec(mainHtml)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && t.length<50 && !placeTitles.includes(t)) placeTitles.push(t); } }
        if (placeTitles.length > 0) placeDebugMethod = "html_class";
      }

      // 방법3: place.naver.com 링크 URL에서 ID 추출 후 이름 매칭
      if (placeTitles.length === 0) {
        const placeUrlRe = /place\.naver\.com\/(?:restaurant|place|hospital|beauty)\/(\d+)[^"]*"[^>]*>([\s\S]*?)<\//g;
        let pu; while ((pu = placeUrlRe.exec(mainHtml)) !== null && placeTitles.length < 15) {
          const t = pu[2].replace(/<[^>]*>/g,"").trim();
          if (t && t.length > 1 && t.length < 50 && !placeTitles.includes(t)) placeTitles.push(t);
        }
        if (placeTitles.length > 0) placeDebugMethod = "place_url";
      }

      results.place = { titles: placeTitles.slice(0,10) };
      if (targets?.placeName) {
        const pn = tl(targets.placeName);
        let i = placeTitles.findIndex(t => tl(t).includes(pn));
        if (i < 0) i = placeTitles.findIndex(t => pn.includes(tl(t)));
        if (i < 0) { const pnNS = pn.replace(/\s/g,""); i = placeTitles.findIndex(t => tl(t).replace(/\s/g,"").includes(pnNS) || pnNS.includes(tl(t).replace(/\s/g,""))); }
        results.place.rank = i >= 0 ? i + 1 : null;
        results.place._debug = { matchTarget: targets.placeName, titlesFound: placeTitles.length, titles: placeTitles.slice(0, 10), matched: i >= 0, matchIndex: i, method: placeDebugMethod };
      }

      // ---- 뉴스 ----
      const newsTitles = [];
      const nPat = /class="[^"]*news_tit[^"]*"[^>]*(?:title="([^"]+)")?[^>]*>(.*?)<\/a>/gs;
      let nm; while ((nm = nPat.exec(html)) !== null) { const t = (nm[1]||nm[2]).replace(/<[^>]*>/g,"").trim(); if (t && t.length>3 && !newsTitles.includes(t)) newsTitles.push(t); }
      results.news = { titles: newsTitles.slice(0,10) };

      // ---- 파워링크 ----
      const adTitles = [];
      const aPats = [/class="[^"]*lnk_head[^"]*"[^>]*>(.*?)<\/a>/gs, /class="[^"]*tit_wrap[^"]*"[^>]*>(.*?)<\//gs];
      for (const p of aPats) { let m; while ((m = p.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>2 && !adTitles.includes(t)) adTitles.push(t); } }
      results.powerlink = { titles: adTitles.slice(0,10) };
      if (targets?.placeName) { const i = adTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.powerlink.rank = i>=0 ? i+1 : null; }

      // ---- 월 검색량 추정 (통합검색 페이지 내 광고 정보에서) ----
      const searchVolRe = /(?:월간검색수|검색량)[^\d]*?([\d,]+)/;
      const svMatch = html.match(searchVolRe);
      if (svMatch) results.monthlySearch = +(svMatch[1].replace(/,/g,""));
    } catch (e) { results._intError = e.message; }

    // ============ 2. 블로그 검색 ============
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=blog&query=${encoded}`, { headers });
      const html = await res.text();
      const titles = [];
      const pat = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let m; while ((m = pat.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>2 && titles.length<30) titles.push(t); }
      results.blog = { titles: titles.slice(0,30) };
      if (targets?.blogName) { const i = titles.findIndex(t => tl(t).includes(tl(targets.blogName))); results.blog.rank = i>=0 ? i+1 : null; }
    } catch (e) { results.blog = { error: e.message }; }

    // ============ 3. 카페 검색 ============
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=article&query=${encoded}`, { headers });
      const html = await res.text();
      const titles = [];
      const pat = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let m; while ((m = pat.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>2 && titles.length<30) titles.push(t); }
      results.cafe = { titles: titles.slice(0,30) };
      if (targets?.cafeName) { const i = titles.findIndex(t => tl(t).includes(tl(targets.cafeName))); results.cafe.rank = i>=0 ? i+1 : null; }
    } catch (e) { results.cafe = { error: e.message }; }

    // ============ 4. 네이버 지도 ============
    try {
      const mapRes = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all`, { headers: {...headers,"Accept":"application/json"} });
      const mapText = await mapRes.text();
      // 해외 IP면 HTML이 올 수 있음 → JSON 파싱 시도
      if (mapText.startsWith("{") || mapText.startsWith("[")) {
        const data = JSON.parse(mapText);
        const places = (data?.result?.place?.list || []).map(p => ({name:p.name,id:p.id,category:p.category||"",address:p.roadAddress||p.address||"",reviewCount:+(p.reviewCount||p.visitorReviewCount||0),rating:p.rating||""}));
        results.naverMap = { places: places.slice(0,10), titles: places.slice(0,10).map(p=>p.name) };
        if (targets?.placeName) { const i = places.findIndex(p => tl(p.name).includes(tl(targets.placeName))); results.naverMap.rank = i>=0 ? i+1 : null; if (i>=0) results.naverMap.myPlace = places[i]; }
      } else {
        // HTML 응답 → 통합검색 플레이스 결과로 대체
        results.naverMap = { titles: results.place?.titles || [], note: "해외IP-통합검색대체" };
        if (targets?.placeName && results.place?.rank) results.naverMap.rank = results.place.rank;
      }
    } catch (e) {
      // 에러시에도 통합검색 결과로 대체
      results.naverMap = { titles: results.place?.titles || [], note: "API오류-통합검색대체", error: e.message };
      if (targets?.placeName && results.place?.rank) results.naverMap.rank = results.place.rank;
    }

    // ============ 5. 구글 지도 ============
    try {
      const gRes = await proxyFetch(`https://www.google.com/search?q=${encoded}&hl=ko&gl=kr&tbm=lcl`, {
        headers: {"User-Agent":ua,"Accept-Language":"ko-KR,ko;q=0.9","Accept":"text/html"}
      });
      const gHtml = await gRes.text();
      const gTitles = [];
      const gPats = [/class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs, /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs, /aria-label="([^"]+)"[^>]*role="heading/gs, /class="[^"]*rllt__details[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs];
      for (const p of gPats) { let m; while ((m = p.exec(gHtml)) !== null) { const t = (m[1]||"").replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && t.length<60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length<10) gTitles.push(t); } }
      if (!gTitles.length) {
        const g2 = await proxyFetch(`https://www.google.com/search?q=${encoded}+지도&hl=ko&gl=kr`, {headers:{"User-Agent":ua,"Accept-Language":"ko-KR"}});
        const g2H = await g2.text();
        const g2P = [/class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs, /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs, /aria-level="3"[^>]*>(.*?)<\//gs];
        for (const p of g2P) { let m; while ((m = p.exec(g2H)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && t.length<60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length<10) gTitles.push(t); } }
      }
      results.googleMap = { titles: gTitles.slice(0,10) };
      if (targets?.placeName) {
        const pn = tl(targets.placeName);
        let i = gTitles.findIndex(t => tl(t).includes(pn));
        if (i < 0) i = gTitles.findIndex(t => pn.includes(tl(t)));
        if (i < 0) { const pnNoSpace = pn.replace(/\s/g,""); i = gTitles.findIndex(t => tl(t).replace(/\s/g,"").includes(pnNoSpace) || pnNoSpace.includes(tl(t).replace(/\s/g,""))); }
        results.googleMap.rank = i>=0 ? i+1 : null;
      }
    } catch (e) { results.googleMap = { error: e.message, titles: [] }; }

    // ============ 6. 카카오 지도 ============
    try {
      const kakaoKey = process.env.KAKAO_REST_API_KEY;
      let kTitles = [];
      let kakaoDebug = { hasKey: !!kakaoKey, keyPrefix: kakaoKey ? kakaoKey.slice(0,4)+"..." : "없음" };
      if (kakaoKey) {
        const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encoded}&size=10`, { headers: {"Authorization":`KakaoAK ${kakaoKey}`} });
        kakaoDebug.status = kRes.status;
        const kText = await kRes.text();
        kakaoDebug.responsePreview = kText.slice(0,200);
        try {
          const kData = JSON.parse(kText);
          kakaoDebug.docCount = kData?.documents?.length || 0;
          kTitles = (kData?.documents || []).map(d => d.place_name).filter(Boolean);
        } catch (pe) { kakaoDebug.parseError = pe.message; }
      }
      if (!kTitles.length) {
        const k2 = await fetch(`https://search.map.kakao.com/mapsearch/map.daum?q=${encoded}&msFlag=A&sort=0`, { headers });
        kakaoDebug.fallbackStatus = k2.status;
        const k2T = await k2.text();
        kakaoDebug.fallbackPreview = k2T.slice(0,200);
        try { const kD = JSON.parse(k2T); kTitles = (kD?.place||kD?.result?.place||[]).map(p=>p.placeName||p.name).filter(Boolean); }
        catch { const kP = [/"placeName"\s*:\s*"([^"]+)"/g,/"name"\s*:\s*"([^"]+)"/g]; for (const p of kP) { let m; while ((m = p.exec(k2T)) !== null) { if (m[1] && !kTitles.includes(m[1]) && m[1].length>1) kTitles.push(m[1]); } } }
      }
      results.kakaoMap = { titles: kTitles.slice(0,10), _debug: kakaoDebug };
      if (targets?.placeName && kTitles.length) {
        const pn = tl(targets.placeName);
        // 정확 포함 매칭
        let i = kTitles.findIndex(t => tl(t).includes(pn));
        // 역방향 매칭 (placeName이 더 긴 경우)
        if (i < 0) i = kTitles.findIndex(t => pn.includes(tl(t)));
        // 공백 제거 매칭
        if (i < 0) { const pnNoSpace = pn.replace(/\s/g,""); i = kTitles.findIndex(t => tl(t).replace(/\s/g,"").includes(pnNoSpace) || pnNoSpace.includes(tl(t).replace(/\s/g,""))); }
        results.kakaoMap.rank = i>=0 ? i+1 : null;
        kakaoDebug.matchAttempt = { placeName: targets.placeName, matched: i>=0, matchIndex: i };
      }
    } catch (e) { results.kakaoMap = { error: e.message, titles: [], _debug: { catchError: e.message } }; }

    // ============ 7. 리뷰 + 감성분석 (플랫폼별) ============
    if (action === "reviews" && targets?.placeName) {
      const negWords = ["별로","최악","불친절","비추","실망","후회","더럽","불만","짜증","나쁘","형편없","엉망","불결","비싸","과대광고","거짓","사기","불쾌","무례","답답","오래걸","잘못","아프","통증","부작용","안가","비위생","지저분","냄새","후기조작","광고"];
      const posWords = ["좋","추천","만족","친절","깨끗","최고","훌륭","감사","편안","자연스러","대박","완벽","예쁘","재방문","또 올","다시","맛있","짱","감동","전문","세심","꼼꼼","정성"];
      const analyzeSentiment = (text) => {
        const lo = text.toLowerCase();
        const fn = negWords.filter(w => lo.includes(w));
        const fp = posWords.filter(w => lo.includes(w));
        return { sentiment: fn.length > fp.length ? "negative" : fp.length > fn.length ? "positive" : "neutral", negWords: fn, posWords: fp };
      };

      if (platform === "naver" || !platform) {
        // ---- 네이버 방문자 리뷰 ----
        try {
          // 1단계: place ID 찾기
          let placeId = null, placeName = targets.placeName;

          // 네이버 지도 API
          const sRes = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${keyword} ${targets.placeName}&type=all`, { headers: {...headers,"Accept":"application/json"} });
          const sText = await sRes.text();
          if (sText.startsWith("{")) {
            const sData = JSON.parse(sText);
            const place = (sData?.result?.place?.list || [])[0];
            if (place?.id) { placeId = place.id; placeName = place.name || placeName; }
          }
          // fallback: 네이버 통합검색에서 place ID 추출
          if (!placeId) {
            const searchRes = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword+" "+targets.placeName)}`, { headers });
            const searchHtml = await searchRes.text();
            const idMatch = searchHtml.match(/place\/(\d{5,})/);
            if (idMatch) placeId = idMatch[1];
          }

          if (placeId) {
            // 2단계: 방문자 리뷰 API (JSON 직접 호출)
            const reviews = [];
            let fetchSuccess = false;

            // 방법A: place graphql API (방문자 리뷰 전용)
            try {
              const rvApiUrl = `https://pcmap-api.place.naver.com/place/graphql`;
              const gqlBody = JSON.stringify([{
                operationName: "getVisitorReviews",
                variables: { input: { businessId: placeId, page: 1, size: 30, isPhotoUsed: false, includeContent: true, getUserPhotos: false, includeReceiptPhotos: false } },
                query: "query getVisitorReviews($input: VisitorReviewsInput) { visitorReviews(input: $input) { items { body author { nickname } created rating } total } }"
              }]);
              const gqlRes = await fetch(rvApiUrl, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json", "Accept": "application/json", "Referer": `https://m.place.naver.com/restaurant/${placeId}/review/visitor` },
                body: gqlBody
              });
              if (gqlRes.ok) {
                const gqlData = await gqlRes.json();
                const items = gqlData?.[0]?.data?.visitorReviews?.items || [];
                for (const item of items) {
                  if (item.body && item.body.length > 5 && reviews.length < 30) {
                    const s = analyzeSentiment(item.body);
                    reviews.push({ text: item.body.slice(0, 200), author: item.author?.nickname || "", rating: item.rating, type: "방문자", ...s });
                  }
                }
                if (reviews.length > 0) fetchSuccess = true;
              }
            } catch {}

            // 방법B: 리뷰 페이지 HTML에서 __NEXT_DATA__ 파싱
            if (!fetchSuccess) {
              try {
                const rvRes = await fetch(`https://m.place.naver.com/restaurant/${placeId}/review/visitor?entry=ple&reviewItem=0`, {
                  headers: { ...headers, "Referer": "https://m.place.naver.com/" }
                });
                const rvHtml = await rvRes.text();
                // __NEXT_DATA__ 에서 방문자 리뷰 추출
                const nextDataMatch = rvHtml.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
                if (nextDataMatch) {
                  try {
                    const nd = JSON.parse(nextDataMatch[1]);
                    const rvItems = nd?.props?.pageProps?.initialState?.review?.list
                      || nd?.props?.pageProps?.initialState?.visitorReviews?.items
                      || [];
                    for (const item of rvItems) {
                      const body = item.body || item.text || item.contents || "";
                      if (body.length > 5 && reviews.length < 30) {
                        const s = analyzeSentiment(body);
                        reviews.push({ text: body.slice(0, 200), author: item.author?.nickname || "", type: "방문자", ...s });
                      }
                    }
                    if (reviews.length > 0) fetchSuccess = true;
                  } catch {}
                }
                // fallback: "body" 필드만 추출 (방문자 리뷰에만 있는 필드)
                if (!fetchSuccess) {
                  const bodyRe = /"body"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
                  let bm;
                  while ((bm = bodyRe.exec(rvHtml)) !== null && reviews.length < 30) {
                    const text = bm[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\\u[\dA-Fa-f]{4}/g, c2 => String.fromCharCode(parseInt(c2.slice(2), 16))).trim();
                    if (text.length > 10) {
                      const s = analyzeSentiment(text);
                      reviews.push({ text: text.slice(0, 200), type: "방문자", ...s });
                    }
                  }
                }
              } catch {}
            }

            results.reviews = { placeId, placeName, platform: "naver", reviewType: "방문자리뷰", reviews, negCount: reviews.filter(r => r.sentiment === "negative").length };
          } else {
            results.reviews = { platform: "naver", error: "플레이스를 찾을 수 없습니다", placeName: targets.placeName };
          }
        } catch (e) { results.reviews = { error: e.message, platform: "naver" }; }
      }

      if (platform === "google") {
        // ---- 구글 리뷰 (프록시 경유 구글맵 직접 접근) ----
        try {
          const reviews = [];
          const seenTexts = new Set();
          const addReview = (text, source) => {
            text = text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\n/g, " ").trim();
            if (text.length > 20 && text.length < 500 && !seenTexts.has(text.slice(0, 40)) && reviews.length < 25) {
              if (text.includes("function") || text.includes("var ") || text.includes("==")) return;
              seenTexts.add(text.slice(0, 40));
              const s = analyzeSentiment(text);
              reviews.push({ text: text.slice(0, 200), source, ...s });
            }
          };
          let debugMethod = "none";

          // 방법A: 구글 검색 (프록시 경유 시 한국 IP로 접근)
          const q1 = `${targets.placeName} ${keyword} 리뷰 후기`;
          const g1Res = await proxyFetch(`https://www.google.com/search?q=${encodeURIComponent(q1)}&hl=ko&gl=kr&num=20`, {
            headers: { "User-Agent": ua, "Accept-Language": "ko-KR" }
          });
          const g1Html = await g1Res.text();

          if (g1Html.length > 10000) {
            debugMethod = "google_direct";
            const gPats = [
              /<span[^>]*class="[^"]*(?:st|aCOpRe|hgKElc|VwiC3b)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
              /class="[^"]*BNeawe[^"]*"[^>]*>([\s\S]{25,300}?)<\//gi,
              />([\uAC00-\uD7A3][^<]{25,200})</g,
            ];
            for (const p of gPats) {
              let m; while ((m = p.exec(g1Html)) !== null) { addReview(m[1], "구글검색"); }
            }
          }

          // 방법B: fallback - 네이버 블로그 검색
          if (reviews.length < 3) {
            debugMethod = reviews.length > 0 ? "google+blog" : "blog_fallback";
            const blogRes = await fetch(`https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(targets.placeName + " 구글리뷰 후기")}&sm=tab_opt&nso=so:r`, { headers });
            const blogHtml = await blogRes.text();
            const blogPats = [
              /class="[^"]*api_txt_lines[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)/gi,
              /class="[^"]*dsc_txt[^"]*"[^>]*>([\s\S]*?)<\/(?:div|a)/gi,
            ];
            for (const p of blogPats) {
              let m; while ((m = p.exec(blogHtml)) !== null) { addReview(m[1], "네이버블로그"); }
            }
          }

          const filtered = reviews.filter(r => {
            const t = r.text;
            if (t.includes("영업시간") || t.includes("전화번호") || t.includes("로그인") || t.includes("이 블로그")) return false;
            return t.split(" ").length >= 4;
          });

          results.reviews = {
            placeName: targets.placeName, platform: "google",
            reviews: filtered.length > 0 ? filtered : reviews,
            negCount: (filtered.length > 0 ? filtered : reviews).filter(r => r.sentiment === "negative").length,
            _debug: { g1HtmlLen: g1Html.length, method: debugMethod, totalFound: reviews.length, filtered: filtered.length, proxyEnabled: !!process.env.PROXY_URL }
          };
        } catch (e) { results.reviews = { error: e.message, platform: "google" }; }
      }

      if (platform === "kakao") {
        // ---- 카카오맵 리뷰 ----
        try {
          const kakaoKey = process.env.KAKAO_REST_API_KEY;
          const reviews = [];
          let debugInfo = { hasKey: !!kakaoKey };

          if (kakaoKey) {
            // 1단계: 카카오 place ID + 정보 찾기
            const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword + " " + targets.placeName)}&size=1`, {
              headers: { "Authorization": `KakaoAK ${kakaoKey}` }
            });
            const kData = await kRes.json();
            const place = kData?.documents?.[0];
            const placeId = place?.id;
            debugInfo.placeId = placeId;
            debugInfo.placeName = place?.place_name;

            if (placeId) {
              // 방법A: 카카오 place JSON API (여러 엔드포인트)
              const endpoints = [
                `https://place.map.kakao.com/main/v/${placeId}`,
                `https://place.map.kakao.com/m/main/v/${placeId}`,
                `https://place.map.kakao.com/commentlist/v/${placeId}`,
                `https://place.map.kakao.com/m/commentlist/v/${placeId}`,
              ];

              for (const ep of endpoints) {
                if (reviews.length > 0) break;
                try {
                  const res = await proxyFetch(ep, {
                    headers: { ...headers, "Accept": "application/json, text/html", "Referer": "https://map.kakao.com/" }
                  });
                  const epKey = ep.split("kakao.com/")[1]?.slice(0, 30) || ep;
                  debugInfo["ep_" + epKey] = res.status;
                  if (res.ok) {
                    const text = await res.text();
                    if (text.length > 100 && (text.startsWith("{") || text.startsWith("["))) {
                      try {
                        const data = JSON.parse(text);
                        // main API 응답에서 리뷰 추출
                        const commentLists = [
                          data?.comment?.list,
                          data?.commentlist?.list,
                          data?.review?.list,
                          data?.basicInfo?.comment?.list,
                          data?.list,
                        ];
                        for (const list of commentLists) {
                          if (!Array.isArray(list)) continue;
                          for (const c of list) {
                            const body = c.contents || c.content || c.body || c.comment || c.text || "";
                            if (body.length > 5 && reviews.length < 30) {
                              const s = analyzeSentiment(body);
                              reviews.push({ text: body.slice(0, 200), author: c.username || c.nickname || c.displayName || "", ...s });
                            }
                          }
                        }
                      } catch {}
                    }
                  }
                } catch {}
              }

              // 방법B: 다음(Daum) 검색에서 카카오맵 리뷰 추출
              if (reviews.length === 0) {
                try {
                  const daumRes = await proxyFetch(`https://search.daum.net/search?w=tot&q=${encodeURIComponent(targets.placeName + " " + keyword + " 리뷰 후기")}`, {
                    headers: { ...headers, "Accept": "text/html" }
                  });
                  const daumHtml = await daumRes.text();
                  debugInfo.daumHtmlLen = daumHtml.length;

                  // 다음 검색결과 스니펫에서 리뷰성 텍스트 추출
                  const daumPats = [
                    /<p[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
                    /class="[^"]*txt_info[^"]*"[^>]*>([\s\S]{20,300}?)<\//gi,
                    /class="[^"]*desc[^"]*"[^>]*>([\s\S]{20,300}?)<\//gi,
                  ];
                  const seenD = new Set();
                  for (const p of daumPats) {
                    let m; while ((m = p.exec(daumHtml)) !== null && reviews.length < 20) {
                      const text = m[1].replace(/<[^>]*>/g, "").trim();
                      if (text.length > 20 && !seenD.has(text.slice(0, 40))) {
                        seenD.add(text.slice(0, 40));
                        if (!text.includes("영업시간") && !text.match(/^\d{2,4}-/) && text.split(" ").length >= 4) {
                          const s = analyzeSentiment(text);
                          reviews.push({ text: text.slice(0, 200), source: "다음검색", ...s });
                        }
                      }
                    }
                  }
                } catch (de) { debugInfo.daumError = de.message; }
              }

              // 방법C: 네이버 블로그 검색 (다음도 실패 시)
              if (reviews.length === 0) {
                try {
                  const nbRes = await fetch(`https://search.naver.com/search.naver?where=blog&query=${encodeURIComponent(targets.placeName + " 카카오 리뷰 후기")}&sm=tab_opt&nso=so:r`, { headers });
                  const nbHtml = await nbRes.text();
                  debugInfo.naverBlogLen = nbHtml.length;
                  const nbPats = [
                    /class="[^"]*api_txt_lines[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)/gi,
                    /class="[^"]*dsc_txt[^"]*"[^>]*>([\s\S]*?)<\/(?:div|a)/gi,
                    /class="[^"]*total_dsc[^"]*"[^>]*>([\s\S]*?)<\/(?:div|a)/gi,
                  ];
                  const seenNB = new Set();
                  for (const p of nbPats) {
                    let m; while ((m = p.exec(nbHtml)) !== null && reviews.length < 20) {
                      const text = m[1].replace(/<[^>]*>/g, "").trim();
                      if (text.length > 25 && !seenNB.has(text.slice(0, 40))) {
                        seenNB.add(text.slice(0, 40));
                        if (!text.includes("영업시간") && !text.includes("이 블로그") && text.split(" ").length >= 4) {
                          const s = analyzeSentiment(text);
                          reviews.push({ text: text.slice(0, 200), source: "네이버블로그", ...s });
                        }
                      }
                    }
                  }
                } catch (ne) { debugInfo.naverBlogError = ne.message; }
              }

              debugInfo.reviewCount = reviews.length;
            }
          }

          results.reviews = {
            placeName: targets.placeName, platform: "kakao", reviews,
            negCount: reviews.filter(r => r.sentiment === "negative").length,
            _debug: debugInfo
          };
        } catch (e) { results.reviews = { error: e.message, platform: "kakao" }; }
      }
    }

    // ============ 8. 월 검색량 (네이버 검색광고 공식 API) ============
    try {
      const adApiKey = process.env.NAVER_AD_API_KEY;
      const adSecret = process.env.NAVER_AD_SECRET;
      const adCustomerId = process.env.NAVER_AD_CUSTOMER_ID;

      if (adApiKey && adSecret && adCustomerId) {
        const timestamp = String(Date.now());
        const method = "GET";
        const path = "/keywordstool";

        const crypto = await import("crypto");
        const hmac = crypto.createHmac("sha256", adSecret);
        hmac.update(timestamp + "." + method + "." + path);
        const signature = hmac.digest("base64");

        // encodeURIComponent로 직접 인코딩 (공백=%20)
        const apiUrl = `https://api.naver.com/keywordstool?hintKeywords=${encodeURIComponent(keyword)}&showDetail=1`;

        const svRes = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "X-Timestamp": timestamp,
            "X-API-KEY": adApiKey,
            "X-API-SECRET": adSecret,
            "X-Customer": String(adCustomerId),
            "X-Signature": signature,
          }
        });

        if (svRes.ok) {
          const svData = await svRes.json();
          if (svData?.keywordList?.length) {
            const matched = svData.keywordList.find(k => k.relKeyword === keyword);
            const first = svData.keywordList[0];
            const target = matched || first;
            if (target) {
              const pcVol = target.monthlyPcQcCnt === "< 10" ? 5 : +(target.monthlyPcQcCnt || 0);
              const moVol = target.monthlyMobileQcCnt === "< 10" ? 5 : +(target.monthlyMobileQcCnt || 0);
              const vol = pcVol + moVol;
              if (vol > 0) {
                results.monthlySearch = vol;
                results.monthlySearchDetail = {
                  pc: pcVol,
                  mobile: moVol,
                  comp: target.compIdx || "",
                  monthlyAvgClickCnt: target.monthlyAvgClickCnt || 0,
                  monthlyAvgClickRate: target.monthlyAvgClickRate || 0,
                };
              }
            }
          }
        }
      }
    } catch (e) { /* 검색광고 API 실패 시 무시 */ }

    return Response.json({ keyword, timestamp: new Date().toISOString(), results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
