'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { Post } from '@/types'
import type { RichEditorHandle } from '@/components/editor/RichEditor'
import ImageSearchPanel from '@/components/editor/ImageSearchPanel'

const RichEditor = dynamic(() => import('@/components/editor/RichEditor'), { ssr: false })

interface Props { post?: Post }

export default function PostEditor({ post }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [coverImage, setCoverImage] = useState(post?.cover_image || '')
  const [tags, setTags] = useState(post?.tags.join(', ') || '')
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || '')
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || '')
  const [published, setPublished] = useState(post?.published || false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [slugEdited, setSlugEdited] = useState(!!post)
  const [translating, setTranslating] = useState(false)
  const editorRef = useRef<RichEditorHandle>(null)

  useEffect(() => {
    if (slugEdited || !title) return
    const timer = setTimeout(() => generateSlugFromTitle(title), 600)
    return () => clearTimeout(timer)
  }, [title, slugEdited])

  function toSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  async function generateSlugFromTitle(text: string) {
    const hasKorean = /[가-힣]/.test(text)
    if (!hasKorean) {
      setSlug(toSlug(text) || `post-${Date.now()}`)
      return
    }
    setTranslating(true)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ko|en`
      )
      const data = await res.json()
      const translated = data?.responseData?.translatedText || ''
      const slug = toSlug(translated)
      setSlug(slug || `post-${Date.now()}`)
    } catch {
      setSlug(`post-${Date.now()}`)
    } finally {
      setTranslating(false)
    }
  }

  async function handleSave(publishNow?: boolean) {
    setSaving(true)
    setMessage('')

    const shouldPublish = publishNow !== undefined ? publishNow : published
    const body = {
      title,
      slug,
      excerpt,
      content,
      cover_image: coverImage || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      published: shouldPublish,
    }

    try {
      const url = post ? `/api/posts/${post.id}` : '/api/posts'
      const method = post ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (publishNow) setPublished(true)
      setMessage(shouldPublish ? '✅ 발행되었습니다! Google 인덱싱 요청도 완료.' : '✅ 임시저장 완료')

      if (!post) router.push(`/admin/posts/${data.id}`)
    } catch (err) {
      setMessage(`❌ 오류: ${err instanceof Error ? err.message : '저장 실패'}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!post || !confirm('이 글을 삭제하시겠습니까?')) return
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-gray-900">
              ← 목록
            </button>
            <span className="text-gray-300">·</span>
            <span className="text-sm font-medium text-gray-700">
              {post ? '글 편집' : '새 글 쓰기'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {message && <span className="text-xs text-gray-500">{message}</span>}
            {post && (
              <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5">
                삭제
              </button>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-sm border border-gray-200 px-4 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              임시저장
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '발행하기'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-6">
        {/* Main */}
        <div className="col-span-2 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="w-full text-3xl font-bold border-0 outline-none bg-transparent placeholder-gray-300 py-2"
          />
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="요약 (검색결과에 표시됩니다)"
            className="w-full text-base border-0 outline-none bg-transparent placeholder-gray-300 text-gray-600 py-1"
          />
          <RichEditor ref={editorRef} content={content} onChange={setContent} />
        </div>

        {/* Sidebar - sticky, follows scroll */}
        <div className="space-y-4 sticky top-4 self-start max-h-[calc(100vh-5rem)] overflow-y-auto pb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">발행 설정</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">발행 상태</span>
            </label>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                URL 슬러그 {translating && <span className="text-blue-400">번역 중...</span>}
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugEdited(true) }}
                  disabled={translating}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 font-mono disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => { setSlugEdited(false); generateSlugFromTitle(title) }}
                  disabled={translating || !title}
                  title="제목으로 슬러그 재생성"
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  ↺
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">이미지 & 태그</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">커버 이미지 URL</label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">태그 (쉼표로 구분)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="일상, 여행, 음식"
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-700">SEO 설정</h3>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SEO 제목 (없으면 제목 사용)</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || 'SEO 제목'}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SEO 설명 (없으면 요약 사용)</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || 'SEO 설명'}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="text-xs text-gray-400 bg-blue-50 rounded-lg p-2">
              💡 발행 시 Google Indexing API에 자동으로 크롤링 요청이 전송됩니다.
            </div>
          </div>

          <ImageSearchPanel onInsert={(url, alt) => editorRef.current?.insertImage(url, alt)} />
        </div>
      </div>
    </div>
  )
}
