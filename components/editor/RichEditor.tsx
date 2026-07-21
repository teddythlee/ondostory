'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import ImageModal, { type ImageSize } from './ImageModal'
import EmbedModal from './EmbedModal'
import Iframe from './IframeExtension'
import { resizeImage } from '@/lib/resizeImage'

const SIZE_MAP: Record<ImageSize, string> = {
  small: '25%',
  medium: '50%',
  large: '75%',
  full: '100%',
}

const ToolbarButton = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  title?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`px-2 py-1 rounded text-sm transition-colors ${
      active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
)

export interface RichEditorHandle {
  insertImage: (url: string, alt?: string) => void
}

const RichEditor = forwardRef<RichEditorHandle, { content: string; onChange: (html: string) => void; title?: string }>(
  function RichEditor({ content, onChange, title = '' }, ref) {
    const [showImageModal, setShowImageModal] = useState(false)
  const [showEmbedModal, setShowEmbedModal] = useState(false)
  const [mediaPopup, setMediaPopup] = useState<{ top: number; left: number; kind: 'image' | 'iframe' } | null>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)

  function generateAlt(editorInstance: typeof editor) {
    const base = title.trim() || 'ondostory'

    // Pull context from the nearest preceding heading (or, if none, the nearest
    // preceding paragraph) so the alt describes what's around the image, not a
    // generic "제목 이미지 N".
    let context = ''
    try {
      const state = editorInstance?.state
      if (state) {
        const pos = state.selection.from
        let heading = ''
        let para = ''
        state.doc.nodesBetween(0, pos, (node) => {
          const t = node.textContent.trim()
          if (!t) return true
          if (node.type.name === 'heading') heading = t
          else if (node.type.name === 'paragraph') para = t
          return true
        })
        context = (heading || para)
          .replace(/\[사진[^\]]*\]/g, '')
          .replace(/\[\[[^\]]*\]\]/g, '')
          .replace(/\s+/g, ' ')
          .slice(0, 50)
          .trim()
      }
    } catch {
      context = ''
    }

    if (context) {
      // include base keywords once, keep it short
      const alt = context.includes(base) || base.includes(context) ? context : `${base} — ${context}`
      return alt.slice(0, 80)
    }
    const count = editorInstance?.getHTML().match(/<img /g)?.length ?? 0
    return `${base} 이미지 ${count + 1}`
  }

    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: false }),
        Link.configure({ openOnClick: false }),
        Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
        Iframe,
        // 표 지원(Table+Row+Header+Cell 번들). resizable=false로 저장 HTML을 깨끗하게(colgroup 미삽입).
        // 이게 없으면 setContent 로드 시 <table> 노드가 통째로 제거된다.
        TableKit.configure({ table: { resizable: false } }),
        Placeholder.configure({ placeholder: '글을 작성하세요...' }),
      ],
      content,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: { class: 'prose focus:outline-none max-w-none p-4 min-h-96' },
        handlePaste(view, event) {
          const items = event.clipboardData?.items
          if (!items) return false

          const imageItem = Array.from(items).find((item) =>
            item.type.startsWith('image/')
          )
          if (!imageItem) return false

          event.preventDefault()
          const rawFile = imageItem.getAsFile()
          if (!rawFile) return false

          const insertAt = view.state.selection.from

          resizeImage(rawFile)
            .then((blob) => {
              const file = new File([blob], 'paste.jpg', { type: 'image/jpeg' })
              const formData = new FormData()
              formData.append('file', file)
              return fetch('/api/upload', { method: 'POST', body: formData })
            })
            .then(async (res) => {
              const data = (await res.json()) as { url?: string; error?: string }
              if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
              if (!data.url) throw new Error('url missing')
              const imgNode = view.state.schema.nodes.image.create({ src: data.url, alt: generateAlt(editor) })
              view.dispatch(view.state.tr.insert(insertAt, imgNode))
            })
            .catch((e) => {
              alert(`이미지 업로드 실패: ${e instanceof Error ? e.message : String(e)}`)
            })

          return true
        },
      },
    })

    useImperativeHandle(ref, () => ({
      insertImage(url: string, alt?: string) {
        editor?.chain().focus().setImage({ src: url, alt: alt || generateAlt(editor) } as never).run()
      },
    }))

    useEffect(() => {
      if (!editor) return
      const dom = editor.view.dom
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        const img = target.tagName === 'IMG' ? target : null
        const embed = target.closest('.embed-wrapper') as HTMLElement | null
        const el = img || embed
        if (el && editorWrapRef.current) {
          const rect = el.getBoundingClientRect()
          const wrapRect = editorWrapRef.current.getBoundingClientRect()
          setMediaPopup({
            top: rect.top - wrapRect.top - 44,
            left: rect.left - wrapRect.left + rect.width / 2,
            kind: img ? 'image' : 'iframe',
          })
        } else {
          setMediaPopup(null)
        }
      }
      dom.addEventListener('click', handleClick)
      return () => dom.removeEventListener('click', handleClick)
    }, [editor])

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content)
      }
    }, [content, editor])

    if (!editor) return null

    function handleImageInsert(src: string, size: ImageSize) {
      const width = SIZE_MAP[size]
      editor?.chain().focus().setImage({ src, alt: generateAlt(editor), width } as never).run()
    }

    const setLink = () => {
      const url = window.prompt('링크 URL을 입력하세요')
      if (url) editor.chain().focus().toggleLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    }

    return (
      <>
        <div ref={editorWrapRef} className="relative">
        <div className="border border-gray-200 rounded-xl overflow-hidden tiptap-editor">
          <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
              <b>B</b>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
              <i>I</i>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄">
              <u>U</u>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
              <s>S</s>
            </ToolbarButton>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="제목 1">H1</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목 2">H2</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="제목 3">H3</ToolbarButton>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="목록">• 목록</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">1. 목록</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">❝</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드">{'</>'}</ToolbarButton>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">≡</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">≡</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">≡</ToolbarButton>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="링크">🔗</ToolbarButton>
            <ToolbarButton onClick={() => setShowImageModal(true)} title="이미지">🖼️</ToolbarButton>
            <ToolbarButton onClick={() => setShowEmbedModal(true)} title="임베드 (지도·유튜브)">🗺️</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">—</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입">▦</ToolbarButton>
            {editor.isActive('table') && (
              <>
                <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가">+행</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가">+열</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제">−행</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제">−열</ToolbarButton>
                <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">✕표</ToolbarButton>
              </>
            )}
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="되돌리기">↩</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="다시실행">↪</ToolbarButton>
          </div>
          <EditorContent editor={editor} />
        </div>
        </div>

        {mediaPopup && (
          <div
            className="absolute z-20 flex items-center gap-1 bg-gray-900 text-white rounded-lg px-2 py-1.5 shadow-lg text-xs -translate-x-1/2"
            style={{ top: mediaPopup.top, left: mediaPopup.left }}
          >
            <span className="text-gray-400 mr-1">크기</span>
            {[['100%', '원본'], ['75%', '대'], ['50%', '중'], ['25%', '소']].map(([w, label]) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  editor.chain().focus().updateAttributes(mediaPopup.kind, { width: w }).run()
                  setMediaPopup(null)
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  editor.getAttributes(mediaPopup.kind).width === w
                    ? 'bg-white text-gray-900 font-semibold'
                    : 'hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-600 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().deleteSelection().run()
                setMediaPopup(null)
              }}
              className="hover:bg-red-600 px-1.5 py-0.5 rounded transition-colors"
              title={mediaPopup.kind === 'image' ? '이미지 삭제' : '임베드 삭제'}
            >
              ✕
            </button>
          </div>
        )}

        {showImageModal && (
          <ImageModal
            onInsert={handleImageInsert}
            onClose={() => setShowImageModal(false)}
          />
        )}

        {showEmbedModal && (
          <EmbedModal
            onInsert={(src, aspect) => {
              editor.chain().focus().setIframe({ src, aspect }).run()
              setShowEmbedModal(false)
            }}
            onClose={() => setShowEmbedModal(false)}
          />
        )}
      </>
    )
  }
)

export default RichEditor
