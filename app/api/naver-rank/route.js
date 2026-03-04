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

      // ---- 탭 순서 감지 (3가지 방법 시도) ----
      const tabOrder = [];
      const seen = new Set();
      const moduleMap = { "powerlink":"파워링크","nx_brand_search":"브랜드검색","place":"플레이스","local":"플레이스","blog":"블로그","cafe":"카페","kin":"지식인","news":"뉴스","image":"이미지","video":"동영상","vod":"동영상","shop":"쇼핑","webkr":"웹사이트","book":"도서","encyc":"지식백과","music":"음악" };

      // 방법1: data-module-name (최신 네이버)
      const modRe = /data-module-name="(\w+)"/g;
      let mm; while ((mm = modRe.exec(html)) !== null) {
        const name = moduleMap[mm[1]];
        if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
      }

      // 방법2: class="sc_new sp_*" (이전 버전)
      if (tabOrder.length < 3) {
        const scRe = /class="[^"]*sc_new\s+sp_(\w+)/g;
        while ((mm = scRe.exec(html)) !== null) {
          const key = mm[1].replace(/nrank|ntotal/g,"").toLowerCase();
          const map2 = {plink:"파워링크",nbrand:"브랜드검색",nplace:"플레이스",local:"플레이스",blog:"블로그",cafe:"카페",kin:"지식인",news:"뉴스",image:"이미지",video:"동영상",vod:"동영상",shop:"쇼핑",web:"웹사이트",nkin:"지식인",nshop:"쇼핑",nnews:"뉴스",nblog:"블로그",ncafe:"카페",nvod:"동영상",nimage:"이미지"};
          const name = map2[key];
          if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
        }
      }

      // 방법3: section id/class 위치 기반 (최후 수단)
      if (tabOrder.length < 3) {
        const secs = [
          {name:"파워링크",re:[/id="power_link_body/i,/class="[^"]*ad_section/i,/class="[^"]*_plink/i]},
          {name:"플레이스",re:[/class="[^"]*sc_new[^"]*place/i,/class="[^"]*place_section/i,/class="[^"]*LocalInfo/i]},
          {name:"블로그",re:[/class="[^"]*sc_new[^"]*blog/i,/class="[^"]*blog_section/i]},
          {name:"카페",re:[/class="[^"]*sc_new[^"]*cafe/i]},
          {name:"지식인",re:[/class="[^"]*sc_new[^"]*kin/i]},
          {name:"뉴스",re:[/class="[^"]*sc_new[^"]*news/i,/class="[^"]*news_section/i]},
          {name:"동영상",re:[/class="[^"]*sc_new[^"]*video/i,/class="[^"]*sc_new[^"]*vod/i]},
          {name:"쇼핑",re:[/class="[^"]*sc_new[^"]*shop/i]},
          {name:"이미지",re:[/class="[^"]*sc_new[^"]*image/i]},
        ];
        const pos = [];
        for (const s of secs) {
          if (seen.has(s.name)) continue;
          let mp = Infinity;
          for (const r of s.re) { const idx = html.search(r); if (idx >= 0 && idx < mp) mp = idx; }
          if (mp < Infinity) pos.push({name:s.name,pos:mp});
        }
        pos.sort((a,b)=>a.pos-b.pos);
        pos.forEach(p => { if (!seen.has(p.name)) { tabOrder.push(p.name); seen.add(p.name); } });
      }

      // 방법4: 한글 섹션 제목으로 감지
      if (tabOrder.length < 3) {
        const titleMap = {"파워링크":"파워링크","플레이스":"플레이스","블로그":"블로그","카페":"카페","지식iN":"지식인","지식인":"지식인","뉴스":"뉴스","이미지":"이미지","동영상":"동영상","쇼핑":"쇼핑"};
        const titleRe = /class="[^"]*(?:tit_area|api_title|fds-comps-header-headline)[^"]*"[^>]*>.*?([가-힣]+)/gs;
        while ((mm = titleRe.exec(html)) !== null) {
          const name = titleMap[mm[1]];
          if (name && !seen.has(name)) { tabOrder.push(name); seen.add(name); }
        }
      }

      results.tabOrder = tabOrder;

      // ---- 플레이스 ----
      const placeTitles = [];
      const pPats = [/class="[^"]*place_bluelink[^"]*"[^>]*>(.*?)<\//gs, /class="[^"]*place_tit[^"]*"[^>]*>(.*?)<\//gs, /class="[^"]*YwYLL[^"]*"[^>]*>(.*?)<\//gs];
      for (const p of pPats) { let m; while ((m = p.exec(html)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && !placeTitles.includes(t)) placeTitles.push(t); } }
      results.place = { titles: placeTitles.slice(0,10) };
      if (targets?.placeName) { const i = placeTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.place.rank = i>=0 ? i+1 : null; }

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
      const gRes = await fetch(`https://www.google.com/search?q=${encoded}&hl=ko&gl=kr&tbm=lcl`, {
        headers: {"User-Agent":ua,"Accept-Language":"ko-KR,ko;q=0.9","Accept":"text/html"}
      });
      const gHtml = await gRes.text();
      const gTitles = [];
      const gPats = [/class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs, /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs, /aria-label="([^"]+)"[^>]*role="heading/gs, /class="[^"]*rllt__details[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs];
      for (const p of gPats) { let m; while ((m = p.exec(gHtml)) !== null) { const t = (m[1]||"").replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && t.length<60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length<10) gTitles.push(t); } }
      if (!gTitles.length) {
        const g2 = await fetch(`https://www.google.com/search?q=${encoded}+지도&hl=ko&gl=kr`, {headers:{"User-Agent":ua,"Accept-Language":"ko-KR"}});
        const g2H = await g2.text();
        const g2P = [/class="[^"]*dbg0pd[^"]*"[^>]*>.*?<[^>]*>(.*?)<\//gs, /class="[^"]*OSrXXb[^"]*"[^>]*>(.*?)<\//gs, /aria-level="3"[^>]*>(.*?)<\//gs];
        for (const p of g2P) { let m; while ((m = p.exec(g2H)) !== null) { const t = m[1].replace(/<[^>]*>/g,"").trim(); if (t && t.length>1 && t.length<60 && !gTitles.includes(t) && !/^[0-9.,\s]+$/.test(t) && gTitles.length<10) gTitles.push(t); } }
      }
      results.googleMap = { titles: gTitles.slice(0,10) };
      if (targets?.placeName) { const i = gTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.googleMap.rank = i>=0 ? i+1 : null; }
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
      if (targets?.placeName && kTitles.length) { const i = kTitles.findIndex(t => tl(t).includes(tl(targets.placeName))); results.kakaoMap.rank = i>=0 ? i+1 : null; }
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
        // 네이버 플레이스 리뷰
        try {
          const sRes = await fetch(`https://map.naver.com/p/api/search/allSearch?query=${keyword} ${targets.placeName}&type=all`, { headers: {...headers,"Accept":"application/json"} });
          const sText = await sRes.text();
          let place = null;
          if (sText.startsWith("{")) {
            const sData = JSON.parse(sText);
            place = (sData?.result?.place?.list || [])[0];
          }
          // fallback: 네이버 검색에서 place ID 추출
          if (!place?.id) {
            const searchRes = await fetch(`https://search.naver.com/search.naver?where=nexearch&query=${encodeURIComponent(keyword+" "+targets.placeName)}`, { headers });
            const searchHtml = await searchRes.text();
            const idMatch = searchHtml.match(/place\/(\d{5,})/);
            if (idMatch) place = { id: idMatch[1], name: targets.placeName };
          }
          if (place?.id) {
            // 방문자 리뷰 페이지
            const rvRes = await fetch(`https://m.place.naver.com/restaurant/${place.id}/review/visitor`, { headers });
            const rvHtml = await rvRes.text();
            const reviews = [];
            const rvPat = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
            let rvm;
            while ((rvm = rvPat.exec(rvHtml)) !== null) {
              const text = rvm[1].replace(/\\n/g," ").replace(/\\"/g,'"').replace(/\\u[\dA-Fa-f]{4}/g, c2 => String.fromCharCode(parseInt(c2.slice(2),16))).trim();
              if (text.length > 10 && reviews.length < 30) {
                const s = analyzeSentiment(text);
                reviews.push({ text: text.slice(0,200), ...s });
              }
            }
            results.reviews = { placeId: place.id, placeName: place.name, platform: "naver", reviews, negCount: reviews.filter(r=>r.sentiment==="negative").length };
          }
        } catch (e) { results.reviews = { error: e.message, platform: "naver" }; }
      }

      if (platform === "google") {
        // 구글 리뷰 (구글 검색결과에서 추출)
        try {
          const gRes = await fetch(`https://www.google.com/search?q=${encoded}+${encodeURIComponent(targets.placeName)}+리뷰&hl=ko&gl=kr`, {
            headers: {"User-Agent":ua,"Accept-Language":"ko-KR"}
          });
          const gHtml = await gRes.text();
          const reviews = [];
          // 구글 리뷰 텍스트 추출
          const gRevPats = [
            /class="[^"]*review-snippet[^"]*"[^>]*>(.*?)<\//gs,
            /data-review-id="[^"]*"[^>]*>.*?"((?:[^"\\]|\\.){20,}?)"/gs,
            /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g,
          ];
          for (const p of gRevPats) {
            let m; while ((m = p.exec(gHtml)) !== null && reviews.length < 20) {
              const text = m[1].replace(/<[^>]*>/g,"").replace(/\\n/g," ").trim();
              if (text.length > 15) { const s = analyzeSentiment(text); reviews.push({ text: text.slice(0,200), ...s }); }
            }
          }
          results.reviews = { placeName: targets.placeName, platform: "google", reviews, negCount: reviews.filter(r=>r.sentiment==="negative").length };
        } catch (e) { results.reviews = { error: e.message, platform: "google" }; }
      }

      if (platform === "kakao") {
        // 카카오맵 리뷰
        try {
          const kakaoKey = process.env.KAKAO_REST_API_KEY;
          let placeId = null;
          if (kakaoKey) {
            const kRes = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${keyword} ${targets.placeName}&size=1`, { headers: {"Authorization":`KakaoAK ${kakaoKey}`} });
            const kData = await kRes.json();
            placeId = kData?.documents?.[0]?.id;
          }
          if (placeId) {
            const rvRes = await fetch(`https://place.map.kakao.com/m/commentlist/v/${placeId}`, { headers });
            const rvText = await rvRes.text();
            const reviews = [];
            try {
              const rvData = JSON.parse(rvText);
              (rvData?.comment?.list || []).forEach(c => {
                if (c.contents && c.contents.length > 10 && reviews.length < 30) {
                  const s = analyzeSentiment(c.contents);
                  reviews.push({ text: c.contents.slice(0,200), ...s });
                }
              });
            } catch {
              const cPat = /"contents"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
              let cm; while ((cm = cPat.exec(rvText)) !== null && reviews.length < 30) {
                const text = cm[1].replace(/\\n/g," ").trim();
                if (text.length > 10) { const s = analyzeSentiment(text); reviews.push({ text: text.slice(0,200), ...s }); }
              }
            }
            results.reviews = { placeName: targets.placeName, platform: "kakao", reviews, negCount: reviews.filter(r=>r.sentiment==="negative").length };
          } else {
            results.reviews = { placeName: targets.placeName, platform: "kakao", reviews: [], error: "카카오 API 키가 필요합니다" };
          }
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

        // URL 객체로 파라미터 안전하게 구성
        const apiUrl = new URL("https://api.searchad.naver.com/keywordstool");
        apiUrl.searchParams.set("hintKeywords", keyword);
        apiUrl.searchParams.set("showDetail", "1");

        const svRes = await fetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            "X-Timestamp": timestamp,
            "X-API-KEY": adApiKey,
            "X-Customer": adCustomerId,
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
