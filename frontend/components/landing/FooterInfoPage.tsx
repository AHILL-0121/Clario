import Link from "next/link"
import type { FooterPageEntry, FooterSection } from "@/lib/footer-pages"

type FooterInfoPageProps = {
  section: FooterSection
  entry: FooterPageEntry
}

export default function FooterInfoPage({ section, entry }: FooterInfoPageProps) {
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1)

  return (
    <main className="bg-[#FDFCF9] min-h-screen px-6 py-20">
      <div className="max-w-4xl mx-auto page-reveal">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-[#5A554F] hover:text-[#1C1815] transition-colors"
          >
            ← Back to home
          </Link>
        </div>

        <div className="rounded-2xl border border-[#E3DDD4] bg-white p-8 md:p-10 card-shadow">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9E9890] mb-4">{sectionLabel}</p>
          <h1 className="font-display text-4xl md:text-5xl text-[#1C1815] mb-5 leading-tight">
            {entry.title}
          </h1>
          <p className="text-[#5A554F] text-lg leading-relaxed mb-8">{entry.summary}</p>

          <ul className="space-y-3">
            {entry.points.map((point) => (
              <li
                key={point}
                className="rounded-xl border border-[#EDE8E0] bg-[#F9F6F0] px-4 py-3 text-[#433F3A]"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
