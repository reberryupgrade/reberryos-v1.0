# REBERRYOS 운영 메모

## 구조

```
app/page.jsx                 진입점 (src/App 렌더)
app/api/auth/*               로그인/로그아웃/세션 확인
app/api/storage/*            지점·시스템 데이터 읽기/쓰기 (역할별 권한 검사)
app/api/youtube              YouTube Data API 프록시 (키는 서버에만)
app/api/naver-rank           순위 조회 (로그인 필요)
app/api/keyword-research/*   키워드 수집 (관리자 세션 또는 CRON_SECRET)
lib/server/*                 세션(JWT 쿠키), 사용자 해시, 권한, Supabase 서버 클라이언트
src/App.jsx                  화면 라우팅 (로그인 → 포털/대시보드/지점)
src/components/*             화면·공용 UI·폼, branch/tabs/* 는 지점 화면의 탭 16개
src/hooks/*                  자동 저장 파이프라인, 대시보드 요약
src/lib/*                    API 래퍼, 상수, 포맷, 엑셀, 저장 전 정리
tests/*                      vitest (단위 + API 라우트 통합)
supabase/migrations/*        DB 정책 변경 SQL
```

## 명령

```bash
npm run dev     # 개발 서버
npm test        # vitest
npm run lint    # eslint (미정의 변수 검출)
npm run build   # 프로덕션 빌드
```

## 환경변수

`.env.example` 참고. 서버 전용 값은 절대 `NEXT_PUBLIC_` 를 붙이지 않는다.

| 이름 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 기존과 동일 (브라우저는 더 이상 직접 쓰지 않음) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 라우트가 DB 에 접근할 때 사용. RLS 우회 |
| `AUTH_SECRET` | 세션 쿠키 서명. 32자 이상 랜덤 |
| `CRON_SECRET` | 키워드 수집 API 를 cron/curl 로 부를 때 `Authorization: Bearer <값>` |
| `YOUTUBE_API_KEY` | YouTube Data API |

## 배포 순서 (보안 변경 반영)

1. `tuneup-security` 브랜치를 `main` 에 합치고 push → Vercel 자동 배포
2. Vercel → Project → Settings → Environment Variables 에 위 서버 전용 변수 4개 추가 (Production)
3. 재배포 후 운영 주소에서 로그인·저장 확인
4. Supabase SQL Editor 에서 `supabase/migrations/20261009_lock_down_rls.sql` 실행
   - 이 시점부터 anon 키로는 어떤 테이블도 읽거나 쓸 수 없다
   - 옛 코드가 아직 떠 있으면 사이트가 멈추므로 반드시 1~3 뒤에 실행
5. Google Cloud Console 에서 예전 YouTube API 키(코드에 하드코딩돼 있던 것) 삭제 후 새 키 발급 → `YOUTUBE_API_KEY` 교체

## 계정

- 비밀번호는 bcrypt 해시로만 저장된다. 관리자 화면에서 "변경" 으로 재설정만 가능
- DB 가 완전히 비어 있을 때만 `admin / admin` 초기 계정이 만들어진다. 첫 로그인 후 즉시 변경
- 소속 지점이 없는 매니저/클라이언트 계정은 아무 데이터도 볼 수 없다

## 데이터 저장 방식

- 지점 데이터는 `app_storage` 테이블에 지점당 JSON 한 건 (`reberryos-v1-b-<id>`), 시스템 설정은 `reberryos-v1-sys`
- 변경 후 0.9초 뒤 자동 저장, 지점을 나가거나 로그아웃할 때 즉시 저장
- 다른 사용자가 먼저 저장했으면(409) 덮어쓸지 다시 불러올지 묻는다
- 순위 조회 때 붙는 HTML 샘플/디버그 정보는 저장하지 않는다 (조회 직후 화면에서만 표시)
