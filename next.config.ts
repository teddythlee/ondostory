import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/blog/review-of-dami-dental-in-hawaiian-garden-a-dentist-who-wants-to-see-him-again-even-if-its-a-long-way-away',
        destination: '/blog/dami-dental-hawaiian-garden-review',
        permanent: true,
      },
      {
        source: '/blog/kuku-rice-cooker-lhtar0609-black-review-i-just-changed-one-rice-cooker-but-the-joy-of-eating-changed',
        destination: '/blog/kuku-rice-cooker-black-review',
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
    ]
  },
};

export default nextConfig;
