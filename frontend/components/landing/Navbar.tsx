"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store"

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FDFCF9F0] backdrop-blur-md border-b border-[#E3DDD4]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#1C1815] flex items-center justify-center shadow-sm group-hover:bg-[#2a2420] transition-colors">
            <span className="font-display text-lg text-[#F4F0E8] leading-none">C</span>
          </div>
          <span className="font-display text-[#1C1815] text-2xl tracking-[0.02em] leading-none">
            Clario
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="px-4 py-2 text-sm text-[#5A554F] hover:text-[#1C1815] rounded-lg hover:bg-[#F4F0E8] transition-all relative after:content-[''] after:absolute after:left-4 after:right-4 after:bottom-1 after:h-px after:bg-[#C8412D] after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-150"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Chat with us */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#5A876C] border border-[#5A876C55] rounded-lg hover:bg-[#ECF2EE] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="#5A876C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Chat with us
          </Link>
          {token ? (
            <button
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2 rounded-lg bg-[#C8412D] text-[#F4F0E8] text-sm font-medium hover:bg-[#B43A28] transition-colors btn-glow"
            >
              Go to Dashboard →
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-[#5A554F] hover:text-[#1C1815] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-5 py-2 rounded-lg bg-[#C8412D] text-[#F4F0E8] text-sm font-medium hover:bg-[#B43A28] transition-colors btn-glow"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-[#F4F0E8] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className={`block h-0.5 bg-[#1C1815] transition-all ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}`} />
            <span className={`block h-0.5 bg-[#1C1815] transition-all ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 bg-[#1C1815] transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FDFCF9] border-t border-[#E3DDD4] px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-[#5A554F] hover:text-[#1C1815] hover:bg-[#F4F0E8] rounded-lg"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[#E3DDD4] space-y-2">
            <Link
              href="/chat"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#5A876C55] text-[#5A876C] text-sm font-medium"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="#5A876C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Chat with us
            </Link>
            {token ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full px-4 py-2 rounded-lg bg-[#C8412D] text-[#F4F0E8] text-sm font-medium"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 text-sm font-medium text-[#5A554F] rounded-lg hover:bg-[#F4F0E8]">
                  Sign In
                </Link>
                <Link href="/login" className="block px-4 py-2 rounded-lg bg-[#C8412D] text-[#F4F0E8] text-sm font-medium text-center">
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
