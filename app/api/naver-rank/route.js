export async function POST(req) {
  try {
    const { keyword, targets, action } = await req.json();
    if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    const headers = { "User-Agent": ua, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "ko-KR,ko;q=0.9", "Referer": "https://www.naver.com/" };
    const encoded = encodeURIComponent(keyword);
    const results = {};
    const tl = (s) => (s || "").toLowerCase();

    // ============ 1. 네이버 통합검색 ============
    let intHtml = "";
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encoded}&sm=top_hty&fbm=0`, { headers });
      intHtml = await res.text();

      // ---- 탭 순서: data-module-name 기반 (가장 신뢰도 높음) ----
      const tabOrder = [];
      // 네이버 통합검색은 각 섹션을 data-module-name 속성으로 구분
      const moduleRe = /data-module-name="(\w+)"/g;
      let mm;
      const moduleMap = {
        "powerlink": "파워링크", "nx_brand_search": "브랜드검색",
        "place": "플레이스", "local": "플레이스",
        "blog": "블로그", "cafe": "카페", "kin": "지식인",
        "news": "뉴스", "image": "이미지", "video": "동영상", "vod": "동영상",
        "shop": "쇼핑", "book": "도서", "music": "뮤직", "encyc": "지식백과",
        "movie": "영화", "webkr": "웹사이트",
      };
      const seen = new Set();
      while ((mm = moduleRe.exec(intHtml)) !== null) {
        const name = moduleMap[mm[1]];
        if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
      }

      // Fallback: class 기반 감지
      if (tabOrder.length < 3) {
        const fallbackSections = [
          { name: "파워링크", re: /class="[^"]*(?:ad_area|type_powerlink|sp_plink|_plink)/i },
          { name: "플레이스", re: /class="[^"]*(?:place_|local_|type_local|LocalInfo)/i },
          { name: "블로그", re: /class="[^"]*(?:blog_|type_blog)/i },
          { name: "카페", re: /class="[^"]*(?:_cafe|type_cafe)/i },
          { name: "지식인", re: /class="[^"]*(?:_kin|type_kin)/i },
          { name: "뉴스", re: /class="[^"]*(?:_news|type_news|news_)/i },
          { name: "동영상", re: /class="[^"]*(?:_video|type_video|_vod)/i },
          { name: "쇼핑", re: /class="[^"]*(?:_shop|type_shop)/i },
          { name: "이미지", re: /class="[^"]*(?:_image|type_image)/i },
        ];
        const positions = [];
        for (const sec of fallbackSections) {
          if (seen.has(sec.name)) continue;
          const m = intHtml.search(sec.re);
          if (m >= 0) positions.push({ name: sec.name, pos: m });
        }
        positions.sort((a, b) => a.pos - b.pos);
        positions.forEach(p => { if (!seen.has(p.name)) { tabOrder.push(p.name); seen.add(p.name); } });
      }
      results.tabOrder = tabOrder;

      // ---- 플레이스 ----
      const placeTitles = [];
      const pPats = [
        /class="[^"]*place_bluelink[^"]*"[^>]*>(.*?)<\//gs,
        /class="[^"]*place_tit[^"]*"[^>]*>(.*?)<\//gs,
        /class="[^"]*YwYLL[^"]*"[^>]*>(.*?)<\//gs,
      ];
      for (const p of pPats) { let m; while ((m = p.exec(intHtml)) !== null) { const t = m[1].replace(/<[^>]*>/g, "").trim(); if (t && t.length > 1 && !placeTitles.includes(t)) placeTitles.push(t); } }
      results.place = { titles: placeTitles.slice(0, 10) };
      if (targets?.placeName) { const i = placeTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.place.rank = i >= 0 ? i + 1 : null; }

      // ---- 뉴스 ----
      const newsTitles = [];
      const nPat = /class="[^"]*news_tit[^"]*"[^>]*(?:title="([^"]+)")?[^>]*>(.*?)<\/a>/gs;
      let nm; while ((nm = nPat.exec(intHtml)) !== null) { const t = (nm[1] || nm[2]).replace(/<[^>]*>/g, "").trim(); if (t && t.length > 3 && !newsTitles.includes(t)) newsTitles.push(t); }
      results.news = { titles: newsTitles.slice(0, 10) };

      // ---- 파워링크 ----
      const adTitles = [];
      const aPats = [/class="[^"]*lnk_head[^"]*"[^>]*>(.*?)<\/a>/gs, /class="[^"]*tit_wrap[^"]*"[^>]*>(.*?)<\//gs];
      for (const p of aPats) { let m; while ((m = p.exec(intHtml)) !== null) { const t = m[1].replace(/<[^>]*>/g, "").trim(); if (t && t.length > 2 && !adTitles.includes(t)) adTitles.push(t); } }
      results.powerlink = { titles: adTitles.slice(0, 10) };
      if (targets?.placeName) { const i = adTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.powerlink.rank = i >= 0 ? i + 1 : null; }
    } catch (e) { results._intError = e.message; }

    // ============ 2. 블로그 검색 ============
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=blog&query=${encoded}`, { headers });
      const html = await res.text();
      const titles = [];
      const pat = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let m; while ((m = pat.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g, "").trim(); if (t && t.length > 2 && titles.length < 30) titles.push(t); }
      results.blog = { titles: titles.slice(0, 30) };
      if (targets?.blogName) { const i = titles.findIndex(t => tl(t).includes(tl(targets.blogName))); results.blog.rank = i >= 0 ? i + 1 : null; }
    } catch (e) { results.blog = { error: e.message }; }

    // ============ 3. 카페 검색 ============
    try {
      const res = await fetch(`https://search.naver.com/search.naver?where=article&query=${encoded}`, { headers });
      const html = await res.text();
      const titles = [];
      const pat = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let m; while ((m = pat.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g, "").trim(); if (t && t.length > 2 && titles.length < 30) titles.push(t); }
      results.cafe = { titles: titles.slice(0, 30) };
      if (targets?.cafeName) { const i = titles.findIndex(t => tl(t).includes(tl(targets.cafeName))); results.cafe.rank = i >= 0 ? i + 1 : null; }
    } catch (e) { results.cafe = { error: e.message }; }

    // ============ 4. 네이버 지도 (지도 노출탭 전용) ============
    try {
      const res = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all`, { headers: { ...headers, "Accept": "application/json" } });
      const data = await res.json();
      const places = (data?.result?.place?.list || []).map(p => ({
        name: p.name, id: p.id, category: p.category || "", address: p.roadAddress || p.address || "",
        reviewCount: +(p.reviewCount || p.visitorReviewCount || 0), rating: p.rating || ""
      }));
      results.naverMap = { places: places.slice(0, 10), titles: places.slice(0, 10).map(p => p.name) };
      if (targets?.placeName) { const i = places.findIndex(p => tl(p.name).includes(tl(targets.placeName))); results.naverMap.rank = i >= 0 ? i + 1 : null; if (i >= 0) results.naverMap.myPlace = places[i]; }
    } catch (e) { results.naverMap = { error: e.message, titles: [] }; }

    // ============ 5. 구글 지도 ============
    try {
      // Google 로컬 검색 (가장 안정적)
      const gRes = await fetch(`https://www.google.com/search?q=${encoded}&hl=ko&gl=kr&tbm=lcl`, {
        headers: { "User-Agent": ua, "Accept-Language": "ko-KR,ko;q=0.9", "Accept": "text/html" }
      });
      const gHtml = await gRes.text();
      const gTitles = [];

      // 패턴 1~5: Google 로컬 검색결과
      const gPats = [
        /class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs,
        /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs,
        /aria-label="([^"]+)"[^>]*role="heading/gs,
        /class="[^"]*rllt__details[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs,
        /data-item-id="[^"]*"[^>]*>.*?<div[^>]*>(.*?)<\//gs,
      ];
      for (const p of gPats) {
        let m; while ((m = p.exec(gHtml)) !== null) {
          const t = m[1].replace(/<[^>]*>/g, "").trim();
          if (t && t.length > 1 && t.length < 60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length < 10) gTitles.push(t);
        }
      }

      // Fallback: "keyword 근처" 형태 구글 검색
      if (gTitles.length === 0) {
        const g2Res = await fetch(`https://www.google.com/search?q=${encoded}+지도&hl=ko&gl=kr`, {
          headers: { "User-Agent": ua, "Accept-Language": "ko-KR,ko;q=0.9" }
        });
        const g2Html = await g2Res.text();
        const g2Pats = [
          /class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs,
          /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs,
          /aria-level="3"[^>]*>(.*?)<\//gs,
        ];
        for (const p of g2Pats) {
          let m; while ((m = p.exec(g2Html)) !== null) {
            const t = m[1].replace(/<[^>]*>/g, "").trim();
            if (t && t.length > 1 && t.length < 60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length < 10) gTitles.push(t);
          }
        }
      }

      results.googleMap = { titles: gTitles.slice(0, 10) };
      if (targets?.placeName) { const i = gTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.googleMap.rank = i >= 0 ? i + 1 : null; }
    } catch (e) { results.googleMap = { error: e.message, titles: [] }; }

    // ============ 6. 카카오 지도 ============
    try {
      const kakaoKey = process.env.KAKAO_REST_API_KEY;
      let kTitles = [];

      if (kakaoKey) {
        // 방법1: 카카오 로컬 REST API (가장 정확)
        const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encoded}&size=10`, {
          headers: { "Authorization": `KakaoAK ${kakaoKey}` }
        });
        const kData = await kRes.json();
        kTitles = (kData?.documents || []).map(d => d.place_name).filter(Boolean);
      }

      // 방법2: 카카오맵 웹 검색 (API 키 없을 때)
      if (!kTitles.length) {
        const k2Res = await fetch(`https://search.map.kakao.com/mapsearch/map.daum?q=${encoded}&msFlag=A&sort=0`, { headers });
        const k2Text = await k2Res.text();
        // JSON 파싱 시도
        try {
          const kData = JSON.parse(k2Text);
          kTitles = (kData?.place || kData?.result?.place || []).map(p => p.placeName || p.name).filter(Boolean);
        } catch {
          // HTML에서 추출
          const pats = [/"placeName"\s*:\s*"([^"]+)"/g, /"name"\s*:\s*"([^"]+)"/g];
          for (const p of pats) { let m; while ((m = p.exec(k2Text)) !== null) { if (m[1] && !kTitles.includes(m[1]) && m[1].length > 1) kTitles.push(m[1]); } }
        }
      }

      results.kakaoMap = { titles: kTitles.slice(0, 10) };
      if (targets?.placeName && kTitles.length) { const i = kTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.kakaoMap.rank = i >= 0 ? i + 1 : null; }
    } catch (e) { results.kakaoMap = { error: e.message, titles: [] }; }

    // ============ 7. 리뷰 + 감성분석 ============
    if (action === "reviews" && targets?.placeName) {
      try {
        const sRes = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${keyword} ${targets.placeName}&type=all`, { headers: { ...headers, "Accept": "application/json" } });
        const sData = await sRes.json();
        const place = (sData?.result?.place?.list || [])[0];
        if (place?.id) {
          const rvRes = await fetch(`https://m.place.naver.com/restaurant/${place.id}/review/visitor`, { headers });
          const rvHtml = await rvRes.text();
          const reviews = [];
          const rvPat = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
          let rvm;
          const negWords = ["별로","최악","불친절","비추","실망","후회","더럽","불만","짜증","나쁘","형편없","엉망","불결","비싸","과대광고","거짓","사기","불쾌","무례","답답","오래걸","잘못","아프","통증","부작용","안가","비위생","지저분","냄새"];
          const posWords = ["좋","추천","만족","친절","깨끗","최고","훌륭","감사","편안","자연스러","대박","완벽","예쁘","재방문","또 올","다시","맛있","짱","감동","전문","세심","꼼꼼"];
          while ((rvm = rvPat.exec(rvHtml)) !== null) {
            const text = rvm[1].replace(/\\n/g," ").replace(/\\"/g,'"').replace(/\\u[\dA-Fa-f]{4}/g, c2 => String.fromCharCode(parseInt(c2.slice(2),16))).trim();
            if (text.length > 10 && reviews.length < 30) {
              const lo = text.toLowerCase();
              const fn = negWords.filter(w => lo.includes(w));
              const fp = posWords.filter(w => lo.includes(w));
              reviews.push({ text: text.slice(0,200), sentiment: fn.length > fp.length ? "negative" : fp.length > fn.length ? "positive" : "neutral", negWords: fn, posWords: fp });
            }
          }
          results.reviews = { placeId: place.id, placeName: place.name, reviews, negCount: reviews.filter(r => r.sentiment === "negative").length };
        }
      } catch (e) { results.reviews = { error: e.message }; }
    }

    // ============ 8. 월 검색량 ============
    try {
      const svRes = await fetch(`https://manage.searchad.naver.com/keywordstool?format=json&hintKeywords=${encoded}&includeRecent=true`, {
        headers: { ...headers, "Accept": "application/json", "Referer": "https://manage.searchad.naver.com/" }
      });
      const svText = await svRes.text();
      try {
        const svData = JSON.parse(svText);
        if (svData?.keywordList?.length) {
          const matched = svData.keywordList.find(k => k.relKeyword === keyword) || svData.keywordList[0];
          if (matched) results.monthlySearch = +(matched.monthlyPcQcCnt || 0) + +(matched.monthlyMobileQcCnt || 0);
        }
      } catch {}
    } catch {}

    return Response.json({ keyword, timestamp: new Date().toISOString(), results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
