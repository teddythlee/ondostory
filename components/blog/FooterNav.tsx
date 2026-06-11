import Link from 'next/link'

const FOOTER_LINKS = [
  { label: 'About', slug: 'about' },
  { label: 'Contact', slug: 'contact' },
  { label: 'Privacy Policy', slug: 'privacy-policy' },
  { label: 'Terms', slug: 'terms' },
  { label: 'Disclaimer', slug: 'disclaimer' },
]

export default function FooterNav() {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-6">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
        {FOOTER_LINKS.map(({ label, slug }) => (
          <Link key={slug} href={`/blog/${slug}`} className="hover:text-gray-600 transition-colors">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
