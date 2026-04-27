// ============================================================
// REBERRYOS 키워드 발굴 - 블로그 제목 수집 API
// 경로: app/api/keyword-research/collect/route.js
// 
// 호출 방법:
//   1) 브라우저에서 GET (가장 쉬움)
//      https://your-domain.vercel.app/api/keyword-research/collect?all=true
//      https://your-domain.vercel.app/api/keyword-research/collect?priority=3
//      https://your-domain.vercel.app/api/keyword-research/collect?axis=B
// 
//   2) Postman/curl로 POST (선택 옵션 다양)
//      curl -X POST https://.../api/keyword-research/collect \
//        -H "Content-Type: application/json" \
//        -d '{"all": true}'
//      -d '{"axis": "B"}'
//      -d '{"priority_min": 3}'
//      -d '{"seed_ids": [1, 5, 7]}'
// 
// 환경변수 필요:
//   - NAVER_SEARCH_CLIENT_ID
//   - NAVER_SEARCH_CLIENT_SECRET
//   - NEXT_PUBLIC_SUPABASE_URL
//   - NEXT_PUBLIC_SUPABASE_ANON_KEY
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NAVER_CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

// ------------------------------------------------------------
// 1. 텍스트 정제 (HTML 태그/엔티티 제거)
// ------------------------------------------------------------
function cleanText(html) {
  if (!html) return '';
  return html
    .replace(/<\/?b>/gi, '')
    .replace(/<\/?strong>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ------------------------------------------------------------
// 2. 협찬/체험단 감지
// ------------------------------------------------------------
const SPONSOR_PATTERNS = [
  '협찬', '원고료', '소정의', '체험단', '제공받', '무상으로', '대가성',
  '제휴글', '수수료',
  '[광고]', '(광고)', '#광고',
  '[협찬]', '(협찬)', '#협찬',
  '[AD]', '#AD',
];

function detectSponsor(title, description) {
  const combined = `${title || ''} ${description || ''}`.toLowerCase();
  return SPONSOR_PATTERNS.some(p => combined.includes(p.toLowerCase()));
}

// ------------------------------------------------------------
// 3. postdate 변환: "20250101" → "2025-01-01"
// ------------------------------------------------------------
function parsePostDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// ------------------------------------------------------------
// 4. 단일 시드 1개 수집
// ------------------------------------------------------------
async function collectForSeed(seed) {
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(seed.seed)}&display=20&sort=sim`;

  const res = await fetch(apiUrl, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Naver API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    return { seed_id: seed.id, seed: seed.seed, inserted: 0, total_naver: data.total || 0 };
  }

  // 정제 + 가공
  const rows = data.items.map((item, idx) => {
    const titleClean = cleanText(item.title);
    const descClean = cleanText(item.description);
    return {
      branch_id: seed.branch_id,
      seed_id: seed.id,
      seed_keyword: seed.seed,
      rank_in_seed: idx + 1,
      title: item.title,            // 원본
      title_clean: titleClean,      // 정제본
      description: descClean,
      url: item.link,
      blogger: item.bloggername,
      posted_at: parsePostDate(item.postdate),
      is_sponsored: detectSponsor(titleClean, descClean),
      source: 'naver_api',
    };
  });

  // upsert: 같은 (seed_id, url) 중복 시 무시
  const { data: inserted, error } = await supabase
    .from('competitor_blog_titles')
    .upsert(rows, { onConflict: 'seed_id,url', ignoreDuplicates: true })
    .select();

  if (error) {
    throw new Error(`Supabase: ${error.message}`);
  }

  // 시드의 last_collected_at 업데이트
  await supabase
    .from('keyword_research_seeds')
    .update({ last_collected_at: new Date().toISOString() })
    .eq('id', seed.id);

  return {
    seed_id: seed.id,
    seed: seed.seed,
    axis: seed.axis,
    fetched: data.items.length,
    inserted: inserted?.length ?? 0,
    total_naver: data.total || 0,
  };
}

// ------------------------------------------------------------
// 5. 동시성 제한 (Vercel 타임아웃 방지)
// ------------------------------------------------------------
async function runWithConcurrency(items, limit, fn) {
  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));

    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        errors.push({
          seed: batch[idx].seed,
          seed_id: batch[idx].id,
          error: s.reason.message,
        });
      }
    });
  }

  return { results, errors };
}

// ------------------------------------------------------------
// 6. 시드 조회 (필터 옵션 적용)
// ------------------------------------------------------------
async function loadSeeds({ seed_ids, axis, priority_min, all }) {
  let query = supabase
    .from('keyword_research_seeds')
    .select('id, branch_id, seed, axis, priority')
    .eq('is_active', true);

  if (seed_ids && seed_ids.length > 0) {
    query = query.in('id', seed_ids);
  } else if (axis) {
    query = query.eq('axis', axis);
  } else if (priority_min) {
    query = query.gte('priority', priority_min);
  } else if (!all) {
    return { seeds: null, error: '시드 선택 옵션을 지정하세요. all=true / axis=B / priority_min=3 / seed_ids=[...]' };
  }

  const { data, error } = await query.order('id');
  if (error) return { seeds: null, error: error.message };
  return { seeds: data, error: null };
}

// ------------------------------------------------------------
// 7. 핵심 핸들러 (POST/GET 공통)
// ------------------------------------------------------------
async function handle(options) {
  // 1) 환경변수 체크
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return Response.json(
      {
        ok: false,
        error: 'NAVER_SEARCH_CLIENT_ID 또는 NAVER_SEARCH_CLIENT_SECRET 환경변수가 설정되지 않았습니다.',
      },
      { status: 500 }
    );
  }

  // 2) 시드 조회
  const { seeds, error: seedError } = await loadSeeds(options);
  if (seedError) {
    return Response.json({ ok: false, error: seedError }, { status: 400 });
  }
  if (!seeds || seeds.length === 0) {
    return Response.json({ ok: false, error: '수집 대상 시드가 없습니다.' }, { status: 404 });
  }

  // 3) 동시 5개씩 병렬 수집
  const startedAt = Date.now();
  const { results, errors } = await runWithConcurrency(seeds, 5, collectForSeed);
  const elapsedMs = Date.now() - startedAt;

  const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);
  const totalFetched = results.reduce((sum, r) => sum + (r.fetched || 0), 0);

  return Response.json({
    ok: true,
    summary: {
      total_seeds: seeds.length,
      success: results.length,
      failed: errors.length,
      total_fetched: totalFetched,
      total_inserted: totalInserted,
      elapsed_ms: elapsedMs,
    },
    results,
    errors,
  });
}

// ------------------------------------------------------------
// 8. POST - body로 옵션 받기
// ------------------------------------------------------------
export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    /* body 없을 수도 있음 */
  }

  return handle({
    seed_ids: body.seed_ids,
    axis: body.axis,
    priority_min: body.priority_min,
    all: body.all === true,
  });
}

// ------------------------------------------------------------
// 9. GET - 쿼리스트링으로 옵션 받기 (브라우저로 바로 호출용)
//   /api/keyword-research/collect?all=true
//   /api/keyword-research/collect?axis=B
//   /api/keyword-research/collect?priority=3
// ------------------------------------------------------------
export async function GET(req) {
  const url = new URL(req.url);
  const all = url.searchParams.get('all') === 'true';
  const axis = url.searchParams.get('axis');
  const priority = url.searchParams.get('priority');
  const seedIdsParam = url.searchParams.get('seed_ids');

  const seed_ids = seedIdsParam
    ? seedIdsParam.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
    : undefined;

  return handle({
    seed_ids,
    axis: axis || undefined,
    priority_min: priority ? parseInt(priority, 10) : undefined,
    all,
  });
}

// Vercel 함수 최대 실행시간 (Hobby: 10s, Pro: 60s)
export const maxDuration = 60;
