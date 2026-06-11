export async function resizeImage(file: File, maxWidth = 1200, maxBytes = 3 * 1024 * 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  // PNG도 JPEG로 변환 (투명도 있으면 흰 배경 합성)
  for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', quality)
    )
    if (blob && blob.size <= maxBytes) return blob
  }

  // 그래도 크면 절반 크기로 재시도
  const canvas2 = document.createElement('canvas')
  canvas2.width = Math.round(w / 2)
  canvas2.height = Math.round(h / 2)
  canvas2.getContext('2d')!.drawImage(canvas, 0, 0, canvas2.width, canvas2.height)
  const finalBlob = await new Promise<Blob | null>((res) =>
    canvas2.toBlob(res, 'image/jpeg', 0.7)
  )
  if (!finalBlob) throw new Error('resize failed')
  return finalBlob
}
