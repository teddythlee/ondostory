export function resizeImage(file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('resize failed')), mime, quality)
    }
    img.onerror = reject
    img.src = url
  })
}
