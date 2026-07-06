'use client'

import { useMemo, useState } from 'react'
import { isAllowedEmbedSrc } from './IframeExtension'

interface Props {
  onInsert: (src: string, aspect: string) => void
  onClose: () => void
}

/** iframe 코드나 URL에서 실제 임베드 src를 뽑아내 정규화한다. */
function extractSrc(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // <iframe ... src="..."> 형태면 src만 추출
  const iframeMatch = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)
  const candidate = iframeMatch ? iframeMatch[1] : raw

  // 유튜브 시청 URL → 임베드 URL 변환
  const yt = candidate.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/
  )
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`

  // 비메오 URL → 플레이어 URL 변환
  const vimeo = candidate.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`

  return candidate
}

/** 구글 지도는 4:3, 나머지는 16:9를 기본 비율로. */
function guessAspect(src: string): string {
  try {
    return new URL(src).hostname.endsWith('google.com') ? '4 / 3' : '16 / 9'
  } catch {
    return '16 / 9'
  }
}

export default function EmbedModal({ onInsert, onClose }: Props) {
  const [input, setInput] = useState('')

  const src = useMemo(() => extractSrc(input), [input])
  const valid = src ? isAllowedEmbedSrc(src) : false
  const aspect = src ? guessAspect(src) : '16 / 9'

  function handleInsert() {
    if (src && valid) onInsert(src, aspect)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-lg font-semibold text-gray-900">임베드 삽입</div>
        <p className="mb-4 text-sm text-gray-500">
          구글/네이버 지도·유튜브·비메오의 공유(임베드) 코드나 링크를 붙여넣으세요.
        </p>

        <textarea
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'<iframe src="https://www.google.com/maps/embed?..."></iframe>\n또는 https://www.youtube.com/watch?v=...'}
          rows={4}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm font-mono text-gray-800 focus:border-gray-400 focus:outline-none"
        />

        {input.trim() && !valid && (
          <p className="mt-2 text-sm text-red-500">
            허용되지 않은 주소예요. 구글/네이버 지도, 유튜브, 비메오 임베드만 넣을 수 있습니다.
          </p>
        )}

        {valid && src && (
          <div className="mt-3">
            <div className="mb-1 text-xs text-gray-400">미리보기</div>
            <div
              className="relative w-full overflow-hidden rounded-lg border border-gray-100"
              style={{ aspectRatio: aspect }}
            >
              <iframe
                src={src}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!valid}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            삽입
          </button>
        </div>
      </div>
    </div>
  )
}
