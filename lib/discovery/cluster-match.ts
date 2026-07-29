// 검색어/질문 → 클러스터 추정.
//
// 자동완성·커뮤니티 소스는 클러스터 정보 없이 문자열만 들고 온다.
// 키워드 사전으로 6개 클러스터 중 하나에 매칭하고, 못 고르면 null(미분류)로 둔다.
// 미분류는 관리자가 채택할 때 직접 지정하면 된다.

const RULES: { cluster: string; words: string[] }[] = [
  {
    cluster: 'housing',
    words: ['렌트', '리스', '이사', '아파트', '하우스', '디파짓', '집주인', '랜드로드', '무브아웃', '유홀', '집 구하', '월세', '주거'],
  },
  {
    cluster: 'kids',
    words: ['학교', '초등', '중학', '고등', '학군', '학원', '편입', '유치원', '방과후', '숙제', '백투스쿨', '자녀', '아이 교육', '과외', '대학 입시'],
  },
  {
    cluster: 'settlement',
    words: ['은행', '계좌', '크레딧', '신용', '송금', 'dmv', '면허', '보험', '세금', '택스', '비자', '영주권', '이민', '시민권', 'ssn', '병원', '치과', '자동차 등록', '공증', '번역', '아포스티유'],
  },
  {
    cluster: 'shopping',
    words: ['쇼핑', '세일', '할인', '코스트코', '아울렛', '중고', '당근', '구매', '가격 비교', '생활용품', '배송', '리퍼'],
  },
  {
    cluster: 'food',
    words: ['맛집', '식당', '한식', '고기', '삼겹살', '김밥', '카페', '디저트', '집밥', '레시피', '요리', '반찬', '빵집', '브런치', '메뉴'],
  },
  {
    cluster: 'travel',
    words: ['여행', '나들이', '가볼만', '국립공원', '호텔', '리조트', '캠핑', '트레일', '해변', '비치', '관광', '숙소', '항공'],
  },
]

export function guessCluster(text: string): string | null {
  // '렌트카/렌터카'는 집 렌트가 아니라 차량 대여다. housing의 '렌트' 규칙에 오분류되지 않게
  // 신호를 지운다(→ 다른 규칙에도 안 걸리면 null=미분류, 채택 시 사람이 지정).
  const t = (text || '').toLowerCase().replace(/렌[트터]카/g, ' ')
  let best: { cluster: string; hits: number } | null = null
  for (const rule of RULES) {
    const hits = rule.words.filter((w) => t.includes(w)).length
    if (hits > 0 && (!best || hits > best.hits)) best = { cluster: rule.cluster, hits }
  }
  return best?.cluster ?? null
}
