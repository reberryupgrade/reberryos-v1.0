-- 브라우저용 anon 키로는 어떤 테이블도 읽거나 쓸 수 없게 잠근다.
-- 앱은 서버 라우트(/api/*)에서 service_role 키로만 DB 에 접근한다 (service_role 은 RLS 를 우회).
--
-- 실행 전 확인:
--   1) 새 코드(서버 API 경유)가 Vercel 에 배포되어 있을 것
--   2) Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY, AUTH_SECRET 이 설정되어 있을 것
--   옛 코드는 브라우저에서 anon 키로 직접 읽기 때문에, 이 SQL 을 먼저 실행하면 운영 사이트가 즉시 멈춘다.

do $$
declare r record;
begin
  -- 1. public 스키마의 allow_all 정책 전부 제거
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname = 'allow_all'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  -- 2. RLS 가 꺼져 있던 테이블(*_costs 8개) 에 RLS 켜기
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', r.relname);
  end loop;
end $$;

-- 되돌리기 (비상시): 아래를 실행하면 예전처럼 완전히 열린다
-- do $$ declare r record; begin
--   for r in select tablename from pg_tables where schemaname='public' loop
--     execute format('create policy allow_all on public.%I for all to public using (true) with check (true)', r.tablename);
--   end loop;
-- end $$;
