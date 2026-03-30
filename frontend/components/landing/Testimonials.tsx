"use client"

import { useEffect, useRef, useState } from "react"

const TESTIMONIALS = [
  {
    name: "Amara Osei",
    role: "Head of Customer Experience",
    company: "QuickDeliver Ghana",
    avatar: "#2563EB",
    initials: "AO",
    rating: 5,
    quote:
      "We were drowning in 400+ tickets a week with a 3-person team. AISupportHub cut our response time from 6 hours to 18 minutes. The frustration detection alone saved us two major accounts last month.",
  },
  {
    name: "Priya Nair",
    role: "Operations Manager",
    company: "StyleKart India",
    avatar: "#06B6D4",
    initials: "PN",
    rating: 5,
    quote:
      "The Shopify integration was live in 10 minutes. Now our customer data syncs automatically and the AI already knows order history when it drafts replies. It's like giving every agent a superpower.",
  },
  {
    name: "Carlos Lima",
    role: "CEO",
    company: "Techfix Solutions Brazil",
    avatar: "#22C55E",
    initials: "CL",
    rating: 5,
    quote:
      "The weekly BI report is what sold me. Every Monday I get a clear picture of what's driving complaints, what's working, and where to focus. It's like having a data analyst who never sleeps.",
  },
]

export default function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const track = trackRef.current
    if (!track) return

    const id = window.setInterval(() => {
      const card = track.firstElementChild as HTMLElement | null
      if (!card) return
      const next = track.scrollLeft + card.offsetWidth + 24
      const max = track.scrollWidth - track.clientWidth
      track.scrollTo({ left: next > max ? 0 : next, behavior: "smooth" })
    }, 4000)

    return () => window.clearInterval(id)
  }, [paused])

  return (
    <section id="testimonials" className="py-24 bg-white px-6 reveal" data-stagger="3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ECF2EE] border border-[#5A876C33] text-[#5A876C] text-sm font-medium mb-4">
            ⭐ Customer stories
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-normal text-[#1C1815] mb-4">
            Trusted by MSMEs across the globe
          </h2>
          <p className="text-lg text-[#5A554F]">
            Real results from real teams — not hand-picked cherry picks.
          </p>
        </div>

        {/* Testimonial cards */}
        <div
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2"
        >
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-[#FDFCF9] rounded-2xl p-6 border border-[#E3DDD4] hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-200 min-w-[min(100%,360px)] snap-start"
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#C8412D">
                    <path d="M10 1l2.39 6.26L19 7.64l-5 4.87 1.18 6.88L10 16.27l-5.18 3.12L6 12.51 1 7.64l6.61-.38L10 1z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-[#5A554F] text-sm leading-relaxed mb-6 font-display italic text-[20px]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E3DDD4]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: t.avatar }}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1C1815]">{t.name}</div>
                  <div className="text-xs text-[#9E9890]">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company logos strip */}
        <div className="mt-16 text-center">
          <p className="text-sm text-[#5A554F] mb-6 font-medium">Integrates with tools you already use</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["Zoho CRM", "HubSpot", "Shopify", "Slack", "WhatsApp"].map((brand) => (
              <div key={brand} className="px-5 py-2 rounded-lg border border-[#E3DDD4] bg-white">
                <span className="text-sm font-semibold text-[#5A554F]">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
