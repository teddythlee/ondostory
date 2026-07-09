// SEO 토픽 클러스터 정의. 허브(필러) 페이지와 각 글 하단의 "허브로 돌아가기" 링크가
// 이 한 파일을 공유한다. 새 클러스터를 추가하려면 여기에 항목만 넣으면 된다.

export interface ClusterSection {
  title: string
  // 이 섹션에 넣을 글 slug들. 여기 없는 settlement 글은 허브에서 "그 외"로 자동 노출된다.
  slugs: string[]
}

export interface ClusterMeta {
  // DB posts.cluster 값
  key: string
  // URL: /guides/<path>
  path: string
  emoji: string
  // 허브 H1 · 글 하단 복귀 링크 텍스트로 함께 쓰인다
  title: string
  tagline: string
  metaDescription: string
  sections: ClusterSection[]
}

export const CLUSTERS: Record<string, ClusterMeta> = {
  settlement: {
    key: 'settlement',
    path: 'settlement',
    emoji: '📚',
    title: '오렌지카운티 한인 정착 가이드',
    tagline: '얼바인·터스틴 OC에 자리 잡으며 직접 겪은 은행, 차량, 주거, 자녀 실무를 한곳에 모았습니다.',
    metaDescription:
      '오렌지카운티(얼바인·터스틴) 한인 정착 실무 가이드 — 은행 계좌, 캘리포니아 DMV 차량 등록, 렌트·이사, 자녀 학교와 병원까지 직접 겪은 후기 모음.',
    sections: [
      {
        title: '🏦 은행 · 금융',
        slugs: [
          'create-us-child-bank-account',
          'how-to-transfer-korean-assets-to-us-house-purchase-funds',
        ],
      },
      {
        title: '🚗 차량 · DMV',
        slugs: [
          'california-dmv-vehicle-registration-address-change',
          'review-honda-pilot-battery-replacement',
        ],
      },
      {
        title: '🏠 주거 · 이사',
        slugs: [
          'us-apartment-vs-house-rentals',
          'irvine-company-moveout-review',
          'u-haul-rental-review-10-foot-truck',
        ],
      },
      {
        title: '👨‍👩‍👧 자녀 · 건강',
        slugs: [
          'sports-physical-exer-irvine',
          'dami-dental-hawaiian-garden-review',
        ],
      },
    ],
  },
}

export function getClusterByKey(key: string | null | undefined): ClusterMeta | null {
  if (!key) return null
  return CLUSTERS[key] ?? null
}
