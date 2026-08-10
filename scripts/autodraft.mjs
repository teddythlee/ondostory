// 온디맨드 자동 초안 생성기 (Phase [3]).
//
// 왜 GitHub Action인가 —
//   CCR 클라우드 루틴은 우리 API에 egress를 못 해서(Bash curl 차단·WebFetch 인증 불가) 실패했다.
//   Action 러너는 egress가 있어 우리 API에 닿고 Anthropic API도 호출한다. 러너는 수 분 여유라
//   Cloudflare Worker의 요청 타임아웃도 회피한다. 무거운 LLM 작업은 여기서, Worker는 저장만.
//
// 흐름:
//   1) 발행글 제목 수집(공개 RSS) → 중복 회피 재료
//   2) Claude가 "안 쓴 새 주제"를 탐색·종합평가하고 1개 선정 → 웹검색으로 조사
//   3) submit_draft 도구로 초안 필드 제출(경험이 필요한 자리는 [[경험 추가]]로 비움)
//   4) /api/drafts 로 저장(서버가 status=draft 강제)
//
// 필요 env: ANTHROPIC_API_KEY, DRAFT_API_TOKEN, (선택) SITE_URL, AUTODRAFT_MODEL
//
// 주제 큐(idea_candidates)는 쓰지 않는다 — 스크랩 후보가 뻔해서 버렸고, 선정은 LLM이 직접 한다.

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'

const SITE_URL = process.env.SITE_URL || 'https://www.ondostory.com'
const DRAFT_API_TOKEN = process.env.DRAFT_API_TOKEN
const MODEL = process.env.AUTODRAFT_MODEL || 'claude-opus-5'

if (!process.env.ANTHROPIC_API_KEY) { console.error('::error::ANTHROPIC_API_KEY 시크릿이 없습니다'); process.exit(1) }
if (!DRAFT_API_TOKEN) { console.error('::error::DRAFT_API_TOKEN 시크릿이 없습니다'); process.exit(1) }

// 콘텐츠 가이드 = 보이스·구조·SEO·주제발굴 규격의 단일 원본(체크아웃된 로컬 파일)
const guide = readFileSync(new URL('../docs/ondostory-content-guide.md', import.meta.url), 'utf8')

// 발행글 제목 — 공개 RSS에서(중복 회피용). 실패해도 계속(빈 목록).
async function fetchPublishedTitles() {
  try {
    const xml = await fetch(`${SITE_URL}/rss.xml`, { signal: AbortSignal.timeout(20000) }).then((r) => r.text())
    return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<\/item>/g)]
      .map((m) => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim())
      .filter(Boolean)
  } catch (e) {
    console.warn('RSS 제목 수집 실패(빈 목록으로 계속):', e.message)
    return []
  }
}

// 초안 제출 도구 스키마(strict) — /api/drafts 필드와 1:1 (+ 선정 이유는 로깅용)
const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    topic_reasoning: { type: 'string', description: '이 주제를 (대안들 대비) 왜 골랐는지 2~4문장. 한인 pain·이길수있음·차별성 근거.' },
    title: { type: 'string', description: '가이드 §3. 앞 10~12자에 메인 검색어.' },
    slug: { type: 'string', description: 'kebab-case, 영문 소문자·숫자·하이픈, 6단어 이하.' },
    content: { type: 'string', description: 'HTML(마크다운 금지). 가이드 §2 구조: <h2>/<h3>·표·<h2>자주 묻는 질문</h2>·정리·필요시 <blockquote> disclaimer. 경험이 필요한 자리는 [[경험 추가: 무엇]]으로 비움. 사진 없으면 img 태그 넣지 말 것.' },
    excerpt: { type: 'string', description: '140~160자. meta_description과 동일 금지.' },
    tags: { type: 'array', items: { type: 'string' }, description: '4~6개, 공백 표기.' },
    cluster: { type: 'string', description: 'clusters 키 1개 (settlement/housing/kids/food/shopping/travel 등).' },
    category: { type: 'string', enum: ['후기', '정보'] },
    meta_title: { type: 'string', description: '60자 내외.' },
    meta_description: { type: 'string', description: '140~160자. excerpt와 다르게.' },
    social_hook: { type: 'string', description: '스레드 훅 3줄·200자 내외. 답을 주지 말고 궁금하게. 실제 경험/사실 기반.' },
  },
  required: ['topic_reasoning', 'title', 'slug', 'content', 'excerpt', 'tags', 'cluster', 'category', 'meta_title', 'meta_description', 'social_hook'],
}

const MISSION = `
---
# 이 실행의 임무 — 자동 초안 1편

너는 위 가이드를 100% 따르는 온도스토리(미국 오렌지카운티 한인 대상) 초안 작성자다. 이번엔 **주제도 네가 고른다.**

## 순서
1. **새 주제 탐색.** 아래 사용자 메시지의 "이미 발행한 글" 목록과 겹치지 않는, 아직 안 다룬 **새 영토**의 주제 후보를 여러 개 떠올려라. 한인 이민 여정(도착→정착→자녀교육→커리어→시민권→부모초청→은퇴)에서 pain·궁금증·"미국은 왜" 각도로.
2. **종합 평가 → 1개 선정.** 후보들을 **한인 pain × 이길 수 있음(대형사·OTA·공식사이트에 안 밀리는 롱테일) × 애드센스 RPM × 차별성(한인·OC·실측 각도)** 로 비교해 **딱 하나** 고른다. 브랜드/업체명 단독 검색어는 못 이기니 제외. topic_reasoning에 왜 이걸 골랐는지(대안 대비) 적는다.
3. **자료 조사.** web_search로 공개·1차 정보(공식 사이트·규정·수치)를 확인해 본문 대부분을 채운다. 규정·수치는 공식 출처를 실제 <a> 링크로.
4. **초안 작성.** 가이드 §1~9 규격대로. **경험·평가·맛·느낌은 지어내지 말고** 그 자리를 [[경험 추가: 무엇]]으로 비운다. 가격/영업시간은 불확실하면 생략(넣으면 끝에 <blockquote> disclaimer). 사진 없으면 img 태그 넣지 말 것(cover_image도 비움).
5. **제출.** 모든 필드를 채워 **submit_draft 도구**를 호출한다. (발행 아님 — 서버가 draft로만 저장한다.)

## 절대 규칙
- 경험·사실·수치·검색량을 지어내지 않는다(E-E-A-T). 모르면 [[확인 필요: 무엇]] 또는 생략.
- 발행하지 않는다. 마커([[경험 추가]]/[[확인 필요]])는 남겨도 되지만 placeholder alt·빈 alt·가짜 사진 태그는 금지.
- 이미 쓴 주제·같은 검색의도 재탕 금지. 반드시 새 각도.
`

async function main() {
  const titles = await fetchPublishedTitles()
  console.log(`발행글 ${titles.length}편 확보(중복 회피).`)

  const client = new Anthropic()
  const system = `${guide}\n${MISSION}`
  const user = `# 이미 발행한 글 — 이것들과 겹치면 안 된다 (${titles.length}편)\n${titles.map((t) => `- ${t}`).join('\n') || '(목록 수집 실패 — 흔한 정착/렌트/쇼핑 주제는 이미 많으니 피하고 새 각도로)'}\n\n위 임무 순서대로: 새 주제 탐색 → 종합평가로 1개 선정 → web_search로 조사 → submit_draft 호출.`

  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 8 },
    { name: 'submit_draft', description: '완성한 초안 필드를 제출한다. 이 도구를 호출하면 임무 완료.', strict: true, input_schema: DRAFT_SCHEMA },
  ]

  const messages = [{ role: 'user', content: user }]
  let draft = null

  // 서버측 web_search는 pause_turn으로 끊길 수 있어 재개 루프를 돈다.
  for (let i = 0; i < 12 && !draft; i++) {
    const stream = client.messages.stream({ model: MODEL, max_tokens: 32000, system, tools, messages })
    const msg = await stream.finalMessage()
    messages.push({ role: 'assistant', content: msg.content })

    const submit = msg.content.find((b) => b.type === 'tool_use' && b.name === 'submit_draft')
    if (submit) { draft = submit.input; break }

    if (msg.stop_reason === 'pause_turn') continue // 서버 도구 이터레이션 한도 → 재전송해 재개
    if (msg.stop_reason === 'end_turn') { messages.push({ role: 'user', content: 'submit_draft 도구로 초안을 제출해줘.' }); continue }
    console.warn('예상 밖 stop_reason:', msg.stop_reason)
  }

  if (!draft) { console.error('::error::초안이 생성되지 않았습니다(루프 소진).'); process.exit(1) }

  console.log('── 선정 ──')
  console.log('제목:', draft.title)
  console.log('이유:', draft.topic_reasoning)

  const { topic_reasoning, ...payload } = draft
  const res = await fetch(`${SITE_URL}/api/drafts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DRAFT_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) { console.error(`::error::/api/drafts 실패 (HTTP ${res.status}): ${JSON.stringify(body)}`); process.exit(1) }
  console.log(`✅ 초안 저장 완료 → ${body.admin_url ? SITE_URL + body.admin_url : body.slug}`)
}

main().catch((e) => { console.error('::error::', e?.stack || e?.message || String(e)); process.exit(1) })
