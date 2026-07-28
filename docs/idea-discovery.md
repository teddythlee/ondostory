# 글감 자동 발굴

매일 아침 네 곳에서 글감 후보를 긁어와 점수순으로 쌓는다. 사람은 `/admin/discover`에서 채택/기각만 한다.
채택하면 취재 골격이 붙은 아이디어가 `/admin/ideas`에 생기고, 그다음은 기존 초안 파이프라인 그대로다.

```
GitHub Actions (매일 06:00 PT)
   └─ POST /api/ideas/discover  (Bearer DISCOVERY_TOKEN)
        └─ lib/discovery/index.ts  runDiscovery()
             ├─ sources/gsc.ts       서치콘솔 8~20위 기회 검색어 + 저CTR 페이지
             ├─ sources/suggest.ts   구글 자동완성 롱테일
             ├─ sources/community.ts 레딧 반복 질문
             └─ sources/internal.ts  클러스터 배분 계획 대비 부족분
                  → score.ts 로 점수 → idea_candidates 에 upsert

사람: /admin/discover 에서 채택
   └─ lib/candidates.ts adoptCandidate()
        └─ discovery/outline.ts 로 취재 골격 생성 → post_ideas insert
```

## 설치 (한 번만)

**1. 마이그레이션 실행**

`supabase/migrations/20260728120000_create_idea_candidates.sql` 을 Supabase SQL Editor에서 실행한다.
(`idea_candidates`, `idea_discovery_runs` 두 테이블. 둘 다 RLS on, service_role 전용.)

**2. 토큰 발급**

```bash
openssl rand -hex 32          # 이 값을 아래 두 곳에 같이 넣는다
npx wrangler secret put DISCOVERY_TOKEN
```

**3. GitHub 시크릿**

레포 Settings → Secrets and variables → Actions → New repository secret

| 이름 | 값 |
|---|---|
| `DISCOVERY_TOKEN` | 위에서 만든 값 (wrangler에 넣은 것과 동일해야 함) |

`SITE_URL`은 Variables에 넣으면 덮어쓸 수 있고, 없으면 `https://www.ondostory.com`을 쓴다.

**4. 확인**

Actions 탭 → `discover-ideas` → Run workflow. 또는 `/admin/discover`에서 "지금 실행".

## 왜 GitHub Actions인가

이 사이트는 Cloudflare Workers(OpenNext)에 올라간다. Workers Cron Trigger를 쓰려면 OpenNext가
생성하는 worker 엔트리에 `scheduled` 핸들러를 얹어야 해서 배포 경로를 건드리게 된다.
여기서 하는 일은 "하루 한 번 URL 하나를 친다"가 전부라, 돌아가는 사이트에 손을 안 대는 외부 크론이
가장 무리가 없다. 실패해도 Actions 로그에만 남고 사이트에는 아무 영향이 없다.

Vercel Cron은 해당 없음(Vercel 배포가 아님). Supabase pg_cron은 pg_net + Edge Function이 붙어
움직이는 부품이 늘어난다.

## 소스별 성격

| 소스 | 신뢰도 | 무엇을 잡나 |
|---|---|---|
| `gsc_gap` | 가장 높음 (1.5배) | 내 사이트가 8~20위로 노출되는데 클릭이 안 나오는 검색어. 랭킹 글이 이미 있으면 **보강**, 없으면 **신규 글** 후보로 나뉜다. |
| `gsc_lowctr` | 높음 (1.3배) | 노출 대비 CTR이 낮은 기존 글. 새 글보다 제목·메타 리라이트가 싸다. |
| `internal_gap` | 구조적 (1.1배) | 클러스터 목표 대비 부족분 + 아직 안 쓴 백로그 주제. 바깥 신호가 없는 날에도 나온다. |
| `suggest` | 보통 (1.0배) | 구글 자동완성 롱테일. 사람들이 실제로 치는 문장. |
| `community` | 참고 (0.85배) | 레딧 반복 질문. 영어권 신호라 한국어 검색량과 어긋날 수 있다. |

## 점수

```
score = 수요(소스별 정규화) × 소스 신뢰도 × 클러스터 가중치 × 순위 보너스
```

클러스터 가중치가 핵심이다 (`lib/discovery/plan.ts`). 같은 노출수라도 글이 적고 단가가 높은
`housing`·`kids`·`settlement`가 `food`·`travel`보다 위로 올라온다. 목표 글 수를 채운 클러스터는
가중치가 0.6배로 떨어져 자연히 뒤로 밀린다.

**계획을 바꾸려면 `CLUSTER_PLAN`의 `target`과 `rpm`만 고치면 된다.** 나머지는 따라온다.

## 왜 완성 초안이 아니라 골격인가

`docs/ondostory-content-guide.md` §1-2 정직성 규칙상 겪지 않은 경험을 지어낼 수 없다.
LLM에 본문을 통째로 맡기면 반드시 그 선을 넘는다 — 안 가본 집 맛을 쓰고, 안 해본 절차를
how-to로 제시한다. 그래서 자동화는 **사람이 채울 자리를 정확히 파놓는 데까지만** 한다.

- 기계: 무엇을 쓸지 · 어떤 구조로 · 무엇을 조사해 넣을지 · 어디에 링크할지 · 제목 후보
- 사람: 실제로 겪은 것

채택 시 생성되는 골격은 `lib/discovery/outline.ts` 참고. 보강·리라이트 후보는 아예 다른
지시서가 붙는다(새 글을 쓰면 자기 글끼리 경쟁이 생기므로).

## 운영 중 조절

- **후보가 너무 많다** → `?limit=30`으로 줄인다 (워크플로 curl의 쿼리)
- **자동완성이 자꾸 실패한다** → `?suggest=8`로 줄이거나 0으로 꺼도 나머지는 돈다
- **레딧이 계속 차단된다** → `?community=0`. 클라우드 IP 차단이라 재시도해도 소용없다
- **Workers 서브리퀘스트 한도** → 무료 플랜 50 / 유료 1000. 기본값(suggest 16 + community 8 + GSC 5 + DB)은 무료 한도 안에 든다
- **며칠 연속 잡히는 후보** → `seen_count`가 올라간다. 일시적 유행이 아니라는 뜻이라 우선 채택할 것

## 파일

```
supabase/migrations/20260728120000_create_idea_candidates.sql
lib/discovery/
  index.ts           오케스트레이터 (runDiscovery)
  plan.ts            클러스터 목표·단가·시드  ← 계획 변경은 여기만
  score.ts           점수 공식
  cluster-match.ts   검색어 → 클러스터 추정
  outline.ts         채택 시 취재 골격 생성
  types.ts
  sources/{gsc,suggest,community,internal}.ts
lib/candidates.ts    조회·채택·기각
app/api/ideas/discover/route.ts
app/api/ideas/candidates/route.ts
app/api/ideas/candidates/[id]/route.ts
app/admin/discover/{page.tsx,CandidatesManager.tsx}
.github/workflows/{discover-ideas.yml,gsc-snapshot.yml}
```
