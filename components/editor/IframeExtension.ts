import { Node, mergeAttributes } from '@tiptap/core'

export interface IframeOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    iframe: {
      /** 임베드(iframe) 삽입 */
      setIframe: (options: { src: string; aspect?: string }) => ReturnType
    }
  }
}

/**
 * 신뢰 도메인만 iframe 임베드로 허용한다. (Google Maps, YouTube, Vimeo)
 * dangerouslySetInnerHTML로 raw HTML을 렌더하므로 여기서 도메인을 제한해
 * 임의 iframe 삽입을 막는다.
 */
const ALLOWED_HOSTS = [
  'www.google.com',
  'maps.google.com',
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'map.naver.com',
  'pcmap.place.naver.com',
  'naver.me',
]

export function isAllowedEmbedSrc(src: string): boolean {
  try {
    const url = new URL(src)
    if (url.protocol !== 'https:') return false
    const host = url.hostname
    const ok = ALLOWED_HOSTS.includes(host)
    if (!ok) return false
    // 구글은 지도 임베드 경로만 허용
    if (host.endsWith('google.com')) return url.pathname.startsWith('/maps/embed')
    return true
  } catch {
    return false
  }
}

const Iframe = Node.create<IframeOptions>({
  name: 'iframe',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      aspect: {
        default: '16 / 9',
        parseHTML: (el) => el.getAttribute('data-aspect') || '16 / 9',
        renderHTML: (attrs) => ({ 'data-aspect': attrs.aspect as string }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { 'data-aspect': aspect = '16 / 9', ...rest } = HTMLAttributes as Record<string, string>
    return [
      'div',
      {
        class: 'embed-wrapper',
        style: `position:relative;width:100%;margin:1rem 0;aspect-ratio:${aspect};`,
      },
      [
        'iframe',
        mergeAttributes(this.options.HTMLAttributes, rest, {
          'data-aspect': aspect,
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
          allowfullscreen: 'true',
          frameborder: '0',
          style: 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:0.5rem;',
        }),
      ],
    ]
  },

  addCommands() {
    return {
      setIframe:
        (options) =>
        ({ commands }) => {
          if (!isAllowedEmbedSrc(options.src)) return false
          return commands.insertContent({
            type: this.name,
            attrs: { src: options.src, aspect: options.aspect || '16 / 9' },
          })
        },
    }
  },
})

export default Iframe
