import { Mark, mergeAttributes } from '@tiptap/core'

/**
 * 부위 대응표의 "대응 수준" 색 배지(pill).
 *
 * 배지는 배경색이 있어 TextStyle/Color 확장으로는 보존되지 않는다. 이 전용 mark로
 * 등록해야 에디터 로드(setContent 왕복)·저장 시 `<span class="lvl lvl-N">`이 유지된다.
 * (등록 안 하면 리뷰 저장 시 배지가 통째로 제거됨.)
 *
 * 레벨↔색 매핑은 globals.css의 `.prose .lvl-1 ~ .lvl-5` 참고:
 *   1 매우/가장 가까움(진초록) · 2 가까움/큰 분류(연초록) · 3 유사 대응(주황)
 *   4 절단 따라 다름(회색) · 5 1:1 단정 금지(빨강)
 */
export const LevelBadge = Mark.create({
  name: 'levelBadge',

  inclusive() {
    return false
  },

  addAttributes() {
    return {
      level: {
        default: '1',
        parseHTML: (el) => el.getAttribute('class')?.match(/lvl-([1-5])/)?.[1] || '1',
        renderHTML: (attrs) => ({ class: `lvl lvl-${attrs.level}` }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span.lvl' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0]
  },
})

export default LevelBadge
