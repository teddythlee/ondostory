// 소스 5: 내부 클러스터 갭.
//
// 바깥 신호가 하나도 안 잡히는 날에도 "다음에 뭘 쓸지"는 나와야 한다.
// 클러스터 성장 계획(plan.ts) 대비 부족분을 보고, 그 클러스터에서 아직 안 쓴
// 실무 주제를 백로그에서 꺼내온다. 구조적 갭이라 검색 신호와 무관하게 유효하다.

import { supabaseAdmin } from '@/lib/supabase'
import { CLUSTER_PLAN, planFor } from '../plan'
import type { RawCandidate } from '../types'

// 클러스터별 "아빠 1인칭으로 실제 겪을 수 있는" 미작성 주제 백로그.
// 온도스토리 정직성 규칙상 안 겪은 걸 how-to로 쓸 수 없으므로,
// 전부 미국 생활을 하다 보면 실제로 통과하게 되는 일들로만 구성했다.
const BACKLOG: Record<string, string[]> = {
  housing: [
    '아파트 렌트 신청 서류와 크레딧 체크 통과 기준',
    '아파트 투어 갈 때 확인한 체크리스트',
    '렌트 계약서에서 걸렸던 조항들',
    '이사 당일 유틸리티(전기·가스·인터넷) 개통 순서',
    '렌터스 인슈어런스 가입 후기와 실제 비용',
    '렌트 갱신할 때 인상 통보 받고 한 일',
    '아파트 커뮤니티 시설·주차 규정 실제 사용 후기',
    '이삿짐 정리와 처분 — 미국에서 가구 버리는 법',
  ],
  kids: [
    '학교 등록에 실제로 필요했던 서류 전부',
    '학군 확인하는 법과 실제로 본 차이',
    'ELD/ESL 배정 절차와 우리 아이 경우',
    '스쿨버스 신청과 등하교 실제 동선',
    '학교 급식·런치 계정 충전하는 법',
    '학부모 포털(Aeries·ParentSquare) 처음 쓰는 법',
    '여름방학 캠프 알아보고 등록한 후기',
    '학교 스포츠팀 등록 비용과 준비물',
    '성적표·진도 보고서 읽는 법',
  ],
  settlement: [
    '자동차 보험 견적 비교하고 갈아탄 후기',
    '병원 예약 전 보험 커버 확인하는 순서',
    '처방약 받는 절차와 실제 비용',
    '세금보고 준비하며 모은 서류들',
    '운전면허 실기시험 준비와 당일 후기',
    '차량 스모그 체크 받은 후기',
    '소셜 카드 분실 후 재발급 받은 과정',
    '자동차 정기 점검·오일 교환 어디서 받나',
    '인터넷·휴대폰 요금제 갈아타며 비교한 것',
  ],
  shopping: [
    '코스트코 멤버십 등급 실제로 갈아탄 후기',
    '아마존 반품 실제로 해본 절차',
    '블랙프라이데이·프라임데이에 실제로 산 것',
    '한인마트 세 곳 가격 비교',
    '가전 살 때 제일 쌌던 시기와 채널',
    '미국에서 가구 사고 조립한 후기',
  ],
  food: [
    '코스트코에서 사는 한식 재료 목록',
    '미국 마트에서 한식 재료 대체하는 법',
    '에어프라이어로 한 한식 메뉴들',
  ],
  travel: [
    '국립공원 예약 시스템 실제로 써본 후기',
    '남가주 당일치기로 다녀온 곳 정리',
    '아이들 데리고 간 근교 나들이 모음',
  ],
}

/** 제목/슬러그에 이미 등장한 주제인지 대략 확인 (핵심 명사 2개 이상 겹치면 중복 취급) */
function alreadyCovered(topic: string, corpus: string): boolean {
  const words = topic
    .replace(/[^가-힣a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
  const hits = words.filter((w) => corpus.includes(w)).length
  return hits >= Math.max(2, Math.ceil(words.length * 0.5))
}

export async function collectFromInternal(): Promise<{ candidates: RawCandidate[]; note: string }> {
  const { data: posts, error } = await supabaseAdmin
    .from('posts')
    .select('title, slug, cluster, status')
  if (error) throw error

  const published = (posts || []).filter((p) => p.status === 'published')
  const counts: Record<string, number> = {}
  for (const p of published) {
    if (p.cluster) counts[p.cluster] = (counts[p.cluster] || 0) + 1
  }
  const corpus = (posts || []).map((p) => `${p.title} ${p.slug}`).join(' ')

  const out: RawCandidate[] = []
  const gaps: string[] = []

  for (const cluster of Object.keys(CLUSTER_PLAN)) {
    const have = counts[cluster] || 0
    const target = planFor(cluster).target
    const deficit = target - have
    if (deficit <= 0) continue
    gaps.push(`${cluster} ${have}/${target}`)

    const backlog = (BACKLOG[cluster] || []).filter((t) => !alreadyCovered(t, corpus))
    // 부족분만큼만 꺼낸다 — 목표를 채운 클러스터는 아예 후보를 만들지 않는다.
    for (const topic of backlog.slice(0, Math.min(deficit, 5))) {
      out.push({
        topic,
        cluster,
        source: 'internal_gap',
        demand: deficit,
        evidence: { published: have, target, deficit },
        rationale: `${cluster} 클러스터는 목표 ${target}건 중 ${have}건. ${deficit}건이 비어 있고, 이 주제는 아직 안 썼다.`,
      })
    }
  }

  return { candidates: out, note: gaps.length ? gaps.join(' · ') : '모든 클러스터가 목표 달성' }
}
