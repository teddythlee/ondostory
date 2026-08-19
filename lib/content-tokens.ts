// 본문 특수 토큰 → HTML 변환. 발행 페이지(/blog/[slug])와 관리자 미리보기가
// 같은 결과를 내도록 한 곳에서 처리한다. 두 토큰을 순서대로 처리한다(메일 먼저 →
// 팝업 나중): 팝업 안에 [메일문의:]가 들어갈 수 있어서, 메일을 먼저 base64 링크로
// 바꾼 뒤 그 결과를 팝업 본문으로 감싼다.
//
// 클라이언트 측 동작은 EmailReveal(메일 링크)·PopupModal(팝업 모달)이 담당한다.
export function renderContentTokens(content: string): string {
  let popupN = 0
  return content
    // [메일문의:주소] 또는 [메일문의:주소|제목] → "메일로 문의" 클릭 링크.
    // 주소는 base64로 숨겨서 넣는다(스팸봇 방지). 표시 글자는 "메일로 문의".
    .replace(
      /\[메일문의:\s*([^\]|]+?)\s*(?:\|\s*([^\]]+?))?\s*\]/g,
      (_m, email, subj) => {
        const enc = btoa(String(email))
        const s = (subj ? String(subj) : 'ondostory 문의').replace(/"/g, '&quot;')
        return `<a href="#" data-mail="${enc}" data-subj="${s}" class="text-blue-600 underline">메일로 문의</a>`
      }
    )
    // [팝업: 트리거 문구] ...작성한 HTML... [/팝업]
    // → 본문엔 텍스트 링크(트리거)만 남고, 작성한 HTML은 인라인 <template>에 담아
    //   두었다가 클릭 시 사이트 내부 모달로 띄운다(PopupModal). 이탈 없이 안내문·문의
    //   처리. [메일문의:]와 같은 따옴표 없는 문법이라 리치텍스트 에디터에서 그대로 쓸 수 있다.
    .replace(
      /\[팝업:\s*([^\]]+?)\s*\]([\s\S]*?)\[\/팝업\]/g,
      (_m, label, inner) => {
        const id = `os-popup-${++popupN}`
        const safeLabel = String(label).replace(/"/g, '&quot;')
        return (
          `<button type="button" class="os-popup-trigger" data-popup-target="${id}">${safeLabel}</button>` +
          `<template id="${id}">${inner}</template>`
        )
      }
    )
    // [환율] 또는 [환율:USD KRW] → 실시간 환율 텍스트. 매 페이지 로드 시 Frankfurter(ECB,
    //   키 불필요)에서 최신값을 받아 채운다(ExchangeRate 컴포넌트). 초기 HTML엔 fallback
    //   텍스트가 들어가 크롤러/실패 시에도 의미가 유지된다(AdSense·SEO 안전).
    .replace(
      /\[환율(?::\s*([A-Za-z]{3})\s+([A-Za-z]{3}))?\s*\]/g,
      (_m, base, symbol) => {
        const b = String(base || 'USD').toUpperCase()
        const s = String(symbol || 'KRW').toUpperCase()
        const fallback = b === 'USD' && s === 'KRW' ? '1달러 ≈ 원화(실시간)' : `1 ${b} ≈ ${s}`
        return `<span class="os-fx" data-base="${b}" data-symbol="${s}" data-amount="1">${fallback}</span>`
      }
    )
}
