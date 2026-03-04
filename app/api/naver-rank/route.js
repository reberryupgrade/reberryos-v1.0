export async function POST(req) {
  try {
    const { keyword, targets, action } = await req.json();
    if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      "Referer": "https://www.naver.com/",
    };
    const encoded = encodeURIComponent(keyword);
    const results = {};

    // 1. 네이버 통합검색 (탭순서 + 플레이스 + 뉴스 + 파워링크)
    try {
      const intUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encoded}`;
      const intRes = await fetch(intUrl, { headers });
      const intHtml = await intRes.text();

      // 탭 순서 감지
      const sectionPatterns = [
        { name: "파워링크", patterns: [/class="[^"]*ad_area/i, /class="[^"]*type_ad/i, /id="power_link_body/i] },
        { name: "플레이스", patterns: [/class="[^"]*place_/i, /class="[^"]*local_/i, /data-module="place/i] },
        { name: "블로그", patterns: [/class="[^"]*blog_/i, /data-module="blog/i] },
        { name: "카페", patterns: [/class="[^"]*cafe_/i, /data-module="cafe/i] },
        { name: "지식인", patterns: [/class="[^"]*kin_/i, /data-module="kin/i] },
        { name: "뉴스", patterns: [/class="[^"]*news_/i, /data-module="news/i] },
        { name: "이미지", patterns: [/class="[^"]*image_/i, /data-module="image/i] },
        { name: "동영상", patterns: [/class="[^"]*video_/i, /data-module="video/i] },
        { name: "쇼핑", patterns: [/class="[^"]*shop_/i, /data-module="shop/i] },
      ];
      const sectionPositions = [];
      for (const sec of sectionPatterns) {
        let minPos = Infinity;
        for (const pat of sec.patterns) {
          const m = intHtml.search(pat);
          if (m >= 0 && m < minPos) minPos = m;
        }
        if (minPos < Infinity) sectionPositions.push({ name: sec.name, pos: minPos });
      }
      sectionPositions.sort((a, b) => a.pos - b.pos);
      results.tabOrder = sectionPositions.map(s => s.name);

      // 플레이스
      const placeTitles = [];
      const placeR = /class="[^"]*place_bluelink[^"]*"[^>]*>(.*?)<\/(?:a|span)>/gs;
      let pm; while ((pm = placeR.exec(intHtml)) !== null) {
        const c = pm[1].replace(/<[^>]*>/g, "").trim();
        if (c && c.length > 1 && !placeTitles.includes(c)) placeTitles.push(c);
      }
      results.place = { titles: placeTitles.slice(0, 10) };
      if (targets?.placeName) {
        const tl = targets.placeName.toLowerCase();
        const idx = placeTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.place.rank = idx >= 0 ? idx + 1 : null;
      }

      // 뉴스
      const newsTitles = [];
      const newsR = /class="[^"]*news_tit[^"]*"[^>]*(?:title="([^"]+)")?[^>]*>(.*?)<\/a>/gs;
      let nm; while ((nm = newsR.exec(intHtml)) !== null) {
        const c = (nm[1] || nm[2]).replace(/<[^>]*>/g, "").trim();
        if (c && c.length > 3 && !newsTitles.includes(c)) newsTitles.push(c);
      }
      results.news = { titles: newsTitles.slice(0, 10) };

      // 파워링크
      const adTitles = [];
      const adR = /class="[^"]*lnk_head[^"]*"[^>]*>(.*?)<\/a>/gs;
      let am; while ((am = adR.exec(intHtml)) !== null) {
        const c = am[1].replace(/<[^>]*>/g, "").trim();
        if (c && c.length > 2 && !adTitles.includes(c)) adTitles.push(c);
      }
      results.powerlink = { titles: adTitles.slice(0, 10) };
      if (targets?.placeName) {
        const tl = targets.placeName.toLowerCase();
        const idx = adTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.powerlink.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results._intError = e.message; }

    // 2. 블로그 검색
    try {
      const blogRes = await fetch(`https://search.naver.com/search.naver?where=blog&query=${encoded}`, { headers });
      const blogHtml = await blogRes.text();
      const blogTitles = [];
      const blogR = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let bm; while ((bm = blogR.exec(blogHtml)) !== null) {
        const c = bm[1].replace(/<[^>]*>/g, "").trim();
        if (c && c.length > 2 && blogTitles.length < 30) blogTitles.push(c);
      }
      results.blog = { titles: blogTitles.slice(0, 30) };
      if (targets?.blogName) {
        const tl = targets.blogName.toLowerCase();
        const idx = blogTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.blog.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.blog = { error: e.message }; }

    // 3. 카페 검색
    try {
      const cafeRes = await fetch(`https://search.naver.com/search.naver?where=article&query=${encoded}`, { headers });
      const cafeHtml = await cafeRes.text();
      const cafeTitles = [];
      const cafeR = /class="[^"]*title_link[^"]*"[^>]*>(.*?)<\/a>/gs;
      let cm2; while ((cm2 = cafeR.exec(cafeHtml)) !== null) {
        const c = cm2[1].replace(/<[^>]*>/g, "").trim();
        if (c && c.length > 2 && cafeTitles.length < 30) cafeTitles.push(c);
      }
      results.cafe = { titles: cafeTitles.slice(0, 30) };
      if (targets?.cafeName) {
        const tl = targets.cafeName.toLowerCase();
        const idx = cafeTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.cafe.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.cafe = { error: e.message }; }

    // 4. 네이버 지도
    try {
      const mapUrl = `https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all`;
      const mapRes = await fetch(mapUrl, { headers: { ...headers, "Accept": "application/json" } });
      const mapData = await mapRes.json();
      const mapPlaces = (mapData?.result?.place?.list || []).map(p => ({
        name: p.name, id: p.id, category: p.category || "", address: p.roadAddress || p.address || "",
        reviewCount: +(p.reviewCount || p.visitorReviewCount || 0), rating: p.rating || ""
      }));
      results.naverMap = { places: mapPlaces.slice(0, 10), titles: mapPlaces.slice(0, 10).map(p => p.name) };
      if (targets?.placeName) {
        const tl = targets.placeName.toLowerCase();
        const idx = mapPlaces.findIndex(p => p.name.toLowerCase().includes(tl));
        results.naverMap.rank = idx >= 0 ? idx + 1 : null;
        if (idx >= 0) results.naverMap.myPlace = mapPlaces[idx];
      }
    } catch (e) { results.naverMap = { error: e.message, titles: [] }; }

    // 5. 구글 지도
    try {
      const gRes = await fetch(`https://www.google.com/search?q=${encoded}&tbm=lcl&hl=ko`, { headers });
      const gHtml = await gRes.text();
      const gTitles = [];
      const gPats = [/aria-label="([^"]+)"[^>]*class="[^"]*hfpxzc/gs, /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs, /class="[^"]*dbg0pd[^"]*"[^>]*>.*?<span[^>]*>(.*?)<\/span>/gs];
      for (const pat of gPats) {
        let gm; while ((gm = pat.exec(gHtml)) !== null) {
          const c = gm[1].replace(/<[^>]*>/g, "").trim();
          if (c && c.length > 1 && !gTitles.includes(c) && gTitles.length < 10) gTitles.push(c);
        }
      }
      results.googleMap = { titles: gTitles.slice(0, 10) };
      if (targets?.placeName) {
        const tl = targets.placeName.toLowerCase();
        const idx = gTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.googleMap.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.googleMap = { error: e.message, titles: [] }; }

    // 6. 카카오 지도
    try {
      const kRes = await fetch(`https://search.map.kakao.com/mapsearch/map.daum?q=${encoded}&msFlag=A&sort=0`, { headers });
      const kText = await kRes.text();
      const kTitles = [];
      try {
        const kData = JSON.parse(kText);
        (kData?.place || []).forEach(p => { if (p.name && !kTitles.includes(p.name)) kTitles.push(p.name); });
      } catch {
        const kPat = /"name"\s*:\s*"([^"]+)"/g;
        let km; while ((km = kPat.exec(kText)) !== null) { if (!kTitles.includes(km[1])) kTitles.push(km[1]); }
      }
      results.kakaoMap = { titles: kTitles.slice(0, 10) };
      if (targets?.placeName) {
        const tl = targets.placeName.toLowerCase();
        const idx = kTitles.findIndex(t => t.toLowerCase().includes(tl));
        results.kakaoMap.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.kakaoMap = { error: e.message, titles: [] }; }

    // 7. 리뷰 + 감성분석 (action=reviews)
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
          const negWords = ["별로","최악","불친절","비추","실망","후회","더럽","불만","짜증","나쁘","형편없","엉망","불결","비싸","과대광고","거짓","사기","불쾌","무례","답답","늦","오래걸","잘못","아프","통증","부작용","안가","비위생","지저분","냄새"];
          const posWords = ["좋","추천","만족","친절","깨끗","최고","훌륭","감사","편안","자연스러","대박","완벽","예쁘","재방문","또 올","다시","맛있","짱","감동","프로","전문","세심","꼼꼼"];
          while ((rvm = rvPat.exec(rvHtml)) !== null) {
            const text = rvm[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\\u[\dA-Fa-f]{4}/g, c => String.fromCharCode(parseInt(c.slice(2), 16))).trim();
            if (text.length > 10 && reviews.length < 30) {
              const lower = text.toLowerCase();
              const foundNeg = negWords.filter(w => lower.includes(w));
              const foundPos = posWords.filter(w => lower.includes(w));
              const sentiment = foundNeg.length > foundPos.length ? "negative" : foundPos.length > foundNeg.length ? "positive" : "neutral";
              reviews.push({ text: text.slice(0, 200), sentiment, negWords: foundNeg, posWords: foundPos });
            }
          }
          results.reviews = { placeId: place.id, placeName: place.name, reviews, negCount: reviews.filter(r => r.sentiment === "negative").length };
        }
      } catch (e) { results.reviews = { error: e.message }; }
    }

    return Response.json({ keyword, timestamp: new Date().toISOString(), results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
