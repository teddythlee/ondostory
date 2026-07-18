import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Cloudflare 바인딩(R2 등)을 `next dev`에서도 접근 가능하게 한다. 개발 전용 훅.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Cloudflare에는 Vercel 이미지 최적화기가 없다. 유일한 next/image(정적 로고)라 최적화 없이 원본 서빙.
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/blog/review-of-dami-dental-in-hawaiian-garden-a-dentist-who-wants-to-see-him-again-even-if-its-a-long-way-away',
        destination: '/blog/dami-dental-hawaiian-garden-review',
        permanent: true,
      },
      {
        source: '/blog/kuku-rice-cooker-lhtar0609-black-review-i-just-changed-one-rice-cooker-but-the-joy-of-eating-changed',
        destination: '/blog/cukoo-rice-cooker-black-review',
        permanent: true,
      },
      {
        source: '/blog/irvine-company-eviction-review-pre-moveout-inspection-cleaning-fee-deposit-settlement-experience',
        destination: '/blog/irvine-company-moveout-review',
        permanent: true,
      },
      {
        source: '/blog/us-apartment-rentals-vs-house-rentals-why-choose-a-house-when-its-cheaper',
        destination: '/blog/us-apartment-vs-house-rentals',
        permanent: true,
      },
      {
        source: '/blog/irvine-honey-pig-review-korean-pork-cake-pork-belly-in-a-long-time',
        destination: '/blog/irvine-honey-pig-review',
        permanent: true,
      },
      // 옛 슬러그 정리 (GSC "crawled - not indexed" 404 → 현재 슬러그로 통합)
      {
        source: '/blog/kuku-rice-cooker-black-review',
        destination: '/blog/cukoo-rice-cooker-black-review',
        permanent: true,
      },
      {
        source: '/blog/review-of-a-visit-to-la-palma-dami-dental-a-dentist-who-would-like-to-visit-again-even-if-it-s-far-away',
        destination: '/blog/dami-dental-hawaiian-garden-review',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
