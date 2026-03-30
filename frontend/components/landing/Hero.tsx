"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"

export default function Hero() {
  const { token } = useAuthStore()
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section className="hero-gradient meridian-grid-bg pt-28 pb-24 px-6 overflow-hidden relative">
      {/* Background decorative blobs */}
      <div
        aria-hidden
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #C8412D 0%, transparent 70%)",
          transform: `translateY(${scrollY * 0.1}px)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-10 h-[520px] opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, #C8412D 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #5A876C 0%, transparent 70%)",
          transform: `translateY(${scrollY * 0.5}px)`,
        }}
      />
      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
        style={{ transform: `translateY(${scrollY * 0.1}px)` }}
      >
        <path d="M-60 420 C180 280, 340 560, 620 410 C800 320, 980 470, 1260 330" fill="none" stroke="#1C1815" strokeWidth="1" />
        <path d="M-100 320 C220 210, 420 420, 760 300 C980 220, 1060 350, 1300 250" fill="none" stroke="#1C1815" strokeWidth="1" />
        <path d="M-120 240 C120 140, 300 300, 520 210 C760 120, 960 250, 1300 120" fill="none" stroke="#1C1815" strokeWidth="1" />
      </svg>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto reveal">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF0EE] border border-[#C8412D33] text-[#C8412D] text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-pulse" />
            AI-Powered Customer Support for MSMEs
          </div>

          {/* Headline */}
          <h1 className="font-display text-[40px] md:text-[48px] lg:text-[56px] font-normal text-[#1C1815] leading-[1.08] tracking-tight mb-6">
            Resolve tickets{" "}
            <span className="gradient-text">10× faster</span>
            <br />
            with intelligent AI
          </h1>

          {/* Subheadline */}
          <p className="text-[16px] md:text-[18px] text-[#5A554F] max-w-2xl mb-10 leading-relaxed">
            AISupportHub automates customer support, detects frustration in real-time, and delivers
            business intelligence — so your team focuses on what matters most.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mb-14">
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl bg-[#C8412D] text-[#F4F0E8] font-medium text-base hover:bg-[#B43A28] transition-all btn-glow"
            >
              {token ? "Go to Dashboard →" : "Start Free — No credit card"}
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-xl bg-white text-[#1C1815] font-medium text-base border border-[#E3DDD4] hover:border-[#5A876C] hover:text-[#5A876C] transition-all card-shadow"
            >
              See how it works ↓
            </a>
          </div>

          {/* Social proof avatars */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#C8412D", "#5A876C", "#1E6E4E", "#5A554F", "#1C1815"].map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: color }}
                >
                  {["A", "B", "C", "D", "E"][i]}
                </div>
              ))}
            </div>
            <div className="text-left">
              <div className="flex gap-0.5 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#C8412D">
                    <path d="M10 1l2.39 6.26L19 7.64l-5 4.87 1.18 6.88L10 16.27l-5.18 3.12L6 12.51 1 7.64l6.61-.38L10 1z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[#5A554F]">
                <span className="font-semibold text-[#1C1815]">500+</span> MSMEs already growing
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 max-w-5xl mx-auto reveal" data-stagger="1">
          <div className="relative rounded-2xl overflow-hidden border border-[#E3DDD4] card-shadow bg-white">
            {/* Browser chrome */}
            <div className="h-9 bg-[#F4F0E8] border-b border-[#E3DDD4] flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C8412D] opacity-80" />
              <div className="w-3 h-3 rounded-full bg-[#5A876C] opacity-80" />
              <div className="w-3 h-3 rounded-full bg-[#1E6E4E] opacity-80" />
              <div className="ml-4 h-5 flex-1 max-w-xs bg-white rounded border border-[#E3DDD4] flex items-center px-3">
                <span className="text-xs text-[#9E9890]">app.clario.ai/dashboard</span>
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="p-6 bg-[#FDFCF9] grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Stat cards */}
              {[
                { label: "Open Tickets", value: "124", color: "#1C1815", icon: "🎫" },
                { label: "Resolved Today", value: "89", color: "#1E6E4E", icon: "✅" },
                { label: "Avg Response", value: "4m", color: "#5A876C", icon: "⚡" },
                { label: "CSAT Score", value: "94%", color: "#C8412D", icon: "⭐" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl p-4 border border-[#E3DDD4] card-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs text-[#9E9890] font-medium">{stat.label}</span>
                    <span className="text-base">{stat.icon}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-[#F4F0E8] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: "72%", background: stat.color }}
                    />
                  </div>
                </div>
              ))}

              {/* Ticket list preview */}
              <div className="md:col-span-3 bg-white rounded-xl border border-[#E3DDD4] card-shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E3DDD4] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1C1815]">Recent Tickets</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8F5EF] text-[#1E6E4E] font-medium">Live</span>
                </div>
                <div className="divide-y divide-[#F4F0E8]">
                  {[
                    { id: "#4821", customer: "Amara Osei", subject: "Order not delivered after 5 days", status: "Open", sentiment: "negative", score: 0.82 },
                    { id: "#4820", customer: "Priya Nair", subject: "Need to update billing address", status: "In Progress", sentiment: "neutral", score: 0.34 },
                    { id: "#4819", customer: "Carlos Lima", subject: "Love the new dashboard features!", status: "Resolved", sentiment: "positive", score: 0.05 },
                  ].map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-4 hover:bg-[#FEF9F7] transition-colors">
                      <span className="text-xs text-[#9E9890] font-mono w-12">{t.id}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1C1815] truncate">{t.subject}</p>
                        <p className="text-xs text-[#9E9890]">{t.customer}</p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{
                          background: t.status === "Open" ? "#FEF0EE" : t.status === "Resolved" ? "#E8F5EF" : "#ECF2EE",
                          color: t.status === "Open" ? "#C8412D" : t.status === "Resolved" ? "#1E6E4E" : "#5A876C",
                        }}
                      >
                        {t.status}
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-[#F4F0E8] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${t.score * 100}%`,
                            background: t.score > 0.6 ? "#C8412D" : t.score > 0.3 ? "#5A876C" : "#1E6E4E",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI insight panel */}
              <div className="bg-white rounded-xl border border-[#E3DDD4] card-shadow p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#1C1815] to-[#5A554F] flex items-center justify-center">
                    <span className="text-[#F4F0E8] text-xs">AI</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1C1815]">AI Insight</span>
                </div>
                <p className="text-xs text-[#5A554F] leading-relaxed mb-3">
                  Ticket <span className="font-semibold text-[#C8412D]">#4821</span> shows high frustration (0.82). Customer waited 5 days — escalate to senior support immediately.
                </p>
                <button className="w-full text-xs py-2 rounded-lg bg-[#FEF0EE] text-[#C8412D] font-semibold hover:bg-[#FBD9D3] transition-colors">
                  Escalate Now →
                </button>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute bottom-4 right-4 hidden md:flex items-center gap-2 bg-white border border-[#E3DDD4] rounded-xl px-3 py-2 card-shadow">
            <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-pulse" />
            <span className="text-xs font-medium text-[#1C1815]">AI responding in 2.1s</span>
          </div>
        </div>
      </div>
    </section>
  )
}
