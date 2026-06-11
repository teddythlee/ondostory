'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import ImageModal, { type ImageSize } from './ImageModal'
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

const RichEditor = forwardRef<RichEditorHandle, { content: string; onChange: (html: string) => void }>(
  function RichEditor({ content, onChange }, ref) {
    const [showImageModal, setShowImageModal] = useState(false)

    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: false }),
        Link.configure({ openOnClick: false }),
        Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
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

          const { state, dispatch } = view
          const { tr, selection } = state
          const placeholderNode = state.schema.text('(이미지 업로드 중...)')
          dispatch(tr.insert(selection.from, placeholderNode))
          const insertPos = selection.from

          resizeImage(rawFile).then((blob) => {
            const ext = rawFile.type === 'image/png' ? 'png' : 'jpg'
            const file = new File([blob], `paste.${ext}`, { type: blob.type })
            const formData = new FormData()
            formData.append('file', file)
            return fetch('/api/upload', { method: 'POST', body: formData })
          })
            .then(async (res) => {
              if (!res.ok) throw new Error('upload failed')
              const data = (await res.json()) as { url: string }

              const placeholderText = '(이미지 업로드 중...)'
              const currentState = view.state
              let absolutePos = -1
              currentState.doc.descendants((node, pos) => {
                if (node.isText && node.text?.includes(placeholderText)) {
                  absolutePos = pos + node.text.indexOf(placeholderText)
                  return false
                }
              })
              if (absolutePos !== -1) {
                view.dispatch(currentState.tr.delete(absolutePos, absolutePos + placeholderText.length))
              }

              const imgNode = view.state.schema.nodes.image.create({ src: data.url, alt: '' })
              view.dispatch(view.state.tr.insert(insertPos, imgNode))
            })
            .catch(() => {
              const placeholderText = '(이미지 업로드 중...)'
              const currentState = view.state
              let absolutePos = -1
              currentState.doc.descendants((node, pos) => {
                if (node.isText && node.text?.includes(placeholderText)) {
                  absolutePos = pos + node.text!.indexOf(placeholderText)
                  return false
                }
              })
              if (absolutePos !== -1) {
                view.dispatch(currentState.tr.delete(absolutePos, absolutePos + placeholderText.length))
              }
              alert('이미지 업로드 실패. Vercel 함수 로그를 확인하세요.')
            })

          return true
        },
      },
    })

    useImperativeHandle(ref, () => ({
      insertImage(url: string, alt = '') {
        editor?.chain().focus().setImage({ src: url, alt } as never).run()
      },
    }))

    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content)
      }
    }, [content, editor])

    if (!editor) return null

    function handleImageInsert(src: string, size: ImageSize) {
      const width = SIZE_MAP[size]
      editor?.chain().focus().setImage({ src, alt: '', width } as never).run()
    }

    const setLink = () => {
      const url = window.prompt('링크 URL을 입력하세요')
      if (url) editor.chain().focus().toggleLink({ href: url }).run()
      else editor.chain().focus().unsetLink().run()
    }

    return (
      <>
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
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">—</ToolbarButton>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="되돌리기">↩</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="다시실행">↪</ToolbarButton>
          </div>
          <EditorContent editor={editor} />
        </div>

        {showImageModal && (
          <ImageModal
            onInsert={handleImageInsert}
            onClose={() => setShowImageModal(false)}
          />
        )}
      </>
    )
  }
)

export default RichEditor
