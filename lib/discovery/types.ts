export type CandidateSource = 'gsc_gap' | 'gsc_lowctr' | 'suggest' | 'community' | 'internal_gap'
export type CandidateStatus = 'new' | 'adopted' | 'dismissed'

/** 소스가 뱉는 날것의 후보. 점수는 아직 안 매겨진 상태. */
export interface RawCandidate {
  topic: string
  query?: string
  cluster: string | null
  source: CandidateSource
  /** 소스 내부의 수요 신호 (노출수, 커뮤니티 반응 등). score.ts가 정규화한다. */
  demand: number
  impressions?: number
  position?: number
  evidence?: Record<string, unknown>
  rationale: string
}

export interface ScoredCandidate extends RawCandidate {
  score: number
  dedupKey: string
}

export interface IdeaCandidate {
  id: string
  topic: string
  query: string | null
  cluster: string | null
  source: CandidateSource
  score: number
  impressions: number
  position: number | null
  evidence: Record<string, unknown>
  rationale: string
  status: CandidateStatus
  idea_id: string | null
  dedup_key: string
  first_seen_on: string
  last_seen_on: string
  seen_count: number
  created_at: string
  updated_at: string
}

export interface DiscoveryRun {
  id: string
  started_at: string
  finished_at: string | null
  ok: boolean
  inserted: number
  refreshed: number
  by_source: Record<string, number>
  errors: { source: string; message: string }[]
}
