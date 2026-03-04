export async function POST(req) {
  try {
    const { keyword, targets } = await req.json();
    // targets: { blogName, placeName, cafeId, etc. } - 내 콘텐츠를 식별할 키워드들
    if (!keyword) return Response.json({ error: "keyword required" }, { status: 400 });

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Referer": "https://www.naver.com/",
    };

    const encoded = encodeURIComponent(keyword);
    const results = {};

    // 1. 블로그 순위
    try {
      const blogUrl = `https://search.naver.com/search.naver?where=blog&query=${encoded}&sm=tab_opt&nso=so%3Add`;
      const blogRes = await fetch(blogUrl, { headers });
      const blogHtml = await blogRes.text();
      // Extract blog titles - look for title_area or api_txt_lines
      const blogTitles = [];
      const blogPatterns = [
        /class="title_link[^"]*"[^>]*>(.*?)<\/a>/gs,
        /class="api_txt_lines[^"]*"[^>]*>(.*?)<\/a>/gs,
        /class="title_area"[^>]*>.*?<a[^>]*>(.*?)<\/a>/gs,
        /class="title[^"]*"[^>]*>.*?<a[^>]*>(.*?)<\/a>/gs,
      ];
      for (const pat of blogPatterns) {
        let m;
        while ((m = pat.exec(blogHtml)) !== null) {
          const clean = m[1].replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 2 && blogTitles.length < 30) blogTitles.push(clean);
        }
      }
      results.blog = { titles: blogTitles.slice(0, 30) };
      if (targets?.blogName) {
        const targetLower = targets.blogName.toLowerCase();
        const idx = blogTitles.findIndex((t, i) => t.toLowerCase().includes(targetLower));
        results.blog.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.blog = { error: e.message }; }

    // 2. 카페 순위
    try {
      const cafeUrl = `https://search.naver.com/search.naver?where=article&query=${encoded}`;
      const cafeRes = await fetch(cafeUrl, { headers });
      const cafeHtml = await cafeRes.text();
      const cafeTitles = [];
      const cafePatterns = [
        /class="title_link[^"]*"[^>]*>(.*?)<\/a>/gs,
        /class="api_txt_lines[^"]*"[^>]*>(.*?)<\/a>/gs,
      ];
      for (const pat of cafePatterns) {
        let m;
        while ((m = pat.exec(cafeHtml)) !== null) {
          const clean = m[1].replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 2 && cafeTitles.length < 30) cafeTitles.push(clean);
        }
      }
      results.cafe = { titles: cafeTitles.slice(0, 30) };
      if (targets?.cafeName) {
        const targetLower = targets.cafeName.toLowerCase();
        const idx = cafeTitles.findIndex(t => t.toLowerCase().includes(targetLower));
        results.cafe.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.cafe = { error: e.message }; }

    // 3. 플레이스 순위 (통합검색에서 추출)
    try {
      const intUrl = `https://search.naver.com/search.naver?where=nexearch&query=${encoded}`;
      const intRes = await fetch(intUrl, { headers });
      const intHtml = await intRes.text();
      
      // Place results
      const placeTitles = [];
      const placePatterns = [
        /class="place_bluelink[^"]*"[^>]*>(.*?)<\/(?:a|span)>/gs,
        /class="tit(?:_area)?[^"]*"[^>]*>.*?<(?:a|span)[^>]*>(.*?)<\/(?:a|span)>/gs,
        /data-title="([^"]+)"/g,
        /"name":"([^"]+)"/g,
      ];
      for (const pat of placePatterns) {
        let m;
        while ((m = pat.exec(intHtml)) !== null) {
          const clean = m[1].replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 1 && placeTitles.length < 10) placeTitles.push(clean);
        }
      }
      results.place = { titles: [...new Set(placeTitles)].slice(0, 10) };
      if (targets?.placeName) {
        const targetLower = targets.placeName.toLowerCase();
        const idx = [...new Set(placeTitles)].findIndex(t => t.toLowerCase().includes(targetLower));
        results.place.rank = idx >= 0 ? idx + 1 : null;
      }

      // 지식인 from integrated
      const knowledgeTitles = [];
      // Extract section after kin or knowledge
      const kinSection = intHtml.match(/class="(?:kin_|know_)[^"]*"[\s\S]*?(?=class="(?:sp_|section_))/i);
      if (kinSection) {
        const kinPat = /<a[^>]*class="[^"]*"[^>]*>(.*?)<\/a>/gs;
        let km;
        while ((km = kinPat.exec(kinSection[0])) !== null) {
          const clean = km[1].replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 5 && knowledgeTitles.length < 10) knowledgeTitles.push(clean);
        }
      }
      results.knowledge = { titles: knowledgeTitles.slice(0, 10) };

      // 뉴스
      const newsTitles = [];
      const newsPatterns = [
        /class="news_tit[^"]*"[^>]*(?:title="([^"]+)")?[^>]*>(.*?)<\/a>/gs,
      ];
      for (const pat of newsPatterns) {
        let m;
        while ((m = pat.exec(intHtml)) !== null) {
          const clean = (m[1] || m[2]).replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 3 && newsTitles.length < 10) newsTitles.push(clean);
        }
      }
      results.news = { titles: newsTitles.slice(0, 10) };

      // 파워링크 (광고)
      const adTitles = [];
      const adPatterns = [
        /class="(?:lnk_head|tit_wrap|tit_area)[^"]*"[^>]*>.*?<(?:a|span)[^>]*>(.*?)<\/(?:a|span)>/gs,
        /class="ad_area[^"]*"[\s\S]*?class="[^"]*tit[^"]*"[^>]*>(.*?)<\//gs,
      ];
      for (const pat of adPatterns) {
        let m;
        while ((m = pat.exec(intHtml)) !== null) {
          const clean = m[1].replace(/<[^>]*>/g, "").trim();
          if (clean && clean.length > 2 && adTitles.length < 10) adTitles.push(clean);
        }
      }
      results.powerlink = { titles: adTitles.slice(0, 10) };

    } catch (e) { 
      if (!results.place) results.place = { error: e.message };
    }

    // 4. 네이버 지도 검색
    try {
      const mapUrl = `https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all&searchCoord=&boundary=`;
      const mapRes = await fetch(mapUrl, { 
        headers: { ...headers, "Accept": "application/json" }
      });
      const mapData = await mapRes.json();
      const mapPlaces = (mapData?.result?.place?.list || []).map(p => p.name);
      results.naverMap = { titles: mapPlaces.slice(0, 10) };
      if (targets?.placeName) {
        const targetLower = targets.placeName.toLowerCase();
        const idx = mapPlaces.findIndex(t => t.toLowerCase().includes(targetLower));
        results.naverMap.rank = idx >= 0 ? idx + 1 : null;
      }
    } catch (e) { results.naverMap = { error: e.message }; }

    return Response.json({
      keyword,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
