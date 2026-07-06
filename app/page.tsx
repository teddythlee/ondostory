import { permanentRedirect } from 'next/navigation'

export default function HomePage() {
  // 308 (Permanent): 구글이 /blog를 정식 URL로 인식하도록 영구 리다이렉트한다.
  permanentRedirect('/blog')
}
