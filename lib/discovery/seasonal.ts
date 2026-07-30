// 소스 6: 시즌/이벤트.
//
// 다가오는 이벤트(추석 항공권·백투스쿨·블랙프라이데이·택스 시즌 등)를 "리드타임" 맞춰 미리 띄운다.
// SEO는 이벤트 당일에 올리면 늦다 — 몇 주 전에 발행해야 색인·순위가 잡힌다. 그래서 각 이벤트마다
// leadWeeks(며칠 전부터 준비할지)를 두고, 오늘이 그 창 안에 들어오면 글감으로 surface 한다.
//
// 캘린더 하나만 고치면 된다(아래 EVENT_CALENDAR). 음력(설·추석)처럼 매년 바뀌는 건 dates에 직접 나열한다.

import type { RawCandidate } from './types'

interface SeasonalEvent {
  topic: string
  query: string
  cluster: string
  /** 이 주 수 전부터 큐에 띄운다 (SEO 리드타임) */
  leadWeeks: number
  note?: string
  /** 고정 연례 이벤트 */
  month?: number
  day?: number
  /** 매년 바뀌는 이벤트(음력 등) — YYYY-MM-DD 오름차순 */
  dates?: string[]
}

const EVENT_CALENDAR: SeasonalEvent[] = [
  // 한국 방문 항공권 — 성수기라 2~3개월 전 예약. 리드타임 길게.
  { topic: '추석 한국 방문 항공권', query: '추석 항공권 예약', cluster: 'travel', leadWeeks: 12,
    dates: ['2026-09-25', '2027-10-15', '2028-10-03'], note: '추석 성수기 항공권은 2~3개월 전에 봐야 한다.' },
  { topic: '설날 한국 방문 항공권', query: '설날 항공권 예약', cluster: 'travel', leadWeeks: 12,
    dates: ['2027-02-06', '2028-01-26'], note: '설 성수기 항공권 미리.' },
  // 자녀 — 개학 준비
  { topic: '백투스쿨 준비물 쇼핑', query: '백투스쿨 준비물', cluster: 'kids', leadWeeks: 6, month: 8, day: 12,
    note: '개학 전 준비물·쇼핑 리스트.' },
  // 정착 — 택스 시즌
  { topic: '미국 세금보고(택스) 준비', query: '미국 세금보고 준비', cluster: 'settlement', leadWeeks: 12, month: 4, day: 15,
    note: '택스 시즌 1~4월, 마감 4/15. 서류는 미리.' },
  // 쇼핑 — 연말 세일
  { topic: '블랙프라이데이 쇼핑 딜', query: '블랙프라이데이 쇼핑', cluster: 'shopping', leadWeeks: 6, month: 11, day: 27 },
  // 여행 — 명절/휴일
  { topic: '추수감사절 여행·연휴', query: '추수감사절 여행', cluster: 'travel', leadWeeks: 5, month: 11, day: 26 },
  { topic: '독립기념일 불꽃놀이', query: 'OC 독립기념일 불꽃놀이', cluster: 'travel', leadWeeks: 4, month: 7, day: 4 },
  // 주거 — 여름 이사철
  { topic: '여름 이사·렌트 시즌 준비', query: '미국 여름 이사 렌트', cluster: 'housing', leadWeeks: 8, month: 5, day: 15,
    note: '여름은 이사·렌트 수요가 급증한다.' },
  // 자녀 — 핼러윈
  { topic: '미국 핼러윈 준비', query: '미국 핼러윈', cluster: 'kids', leadWeeks: 4, month: 10, day: 31 },
]

/** 오늘 기준 다음 발생일. 없으면 null. */
function nextDate(ev: SeasonalEvent, now: Date): Date | null {
  if (ev.dates && ev.dates.length) {
    for (const s of ev.dates) {
      const d = new Date(`${s}T00:00:00Z`)
      if (d.getTime() >= now.getTime()) return d
    }
    return null // 나열된 날짜가 다 지남 → 캘린더 갱신 필요
  }
  if (ev.month && ev.day) {
    const y = now.getUTCFullYear()
    let d = new Date(Date.UTC(y, ev.month - 1, ev.day))
    if (d.getTime() < now.getTime()) d = new Date(Date.UTC(y + 1, ev.month - 1, ev.day))
    return d
  }
  return null
}

export async function collectFromSeasonal(): Promise<{ candidates: RawCandidate[]; note: string }> {
  const now = new Date()
  const out: RawCandidate[] = []

  for (const ev of EVENT_CALENDAR) {
    const occ = nextDate(ev, now)
    if (!occ) continue
    const daysUntil = Math.round((occ.getTime() - now.getTime()) / 86_400_000)
    // 리드타임 창 안에서만: 최소 1주 남았고, leadWeeks 안에 들어왔을 때
    if (daysUntil < 7 || daysUntil > ev.leadWeeks * 7) continue

    const urgency = 1 - daysUntil / (ev.leadWeeks * 7) // 0(먼)~1(임박)
    const dateStr = occ.toISOString().slice(0, 10)
    out.push({
      topic: `[시즌] ${ev.topic}`,
      query: ev.query,
      cluster: ev.cluster,
      source: 'seasonal',
      demand: 4 + urgency * 6, // 4~10 (가까울수록 높음)
      evidence: { daysUntil, date: dateStr },
      rationale: `약 ${daysUntil}일 뒤(${dateStr}) 시즌. 지금 준비해야 발행 후 색인·순위 잡을 시간이 있다.${ev.note ? ' ' + ev.note : ''}`,
    })
  }

  return {
    candidates: out,
    note: out.length ? `${out.length}개 시즌 글감 (리드타임 창 안)` : '가까운 시즌 이벤트 없음',
  }
}
