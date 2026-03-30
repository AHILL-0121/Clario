import Link from "next/link"

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "/product/features" },
    { label: "Pricing", href: "/product/pricing" },
    { label: "How It Works", href: "/product/how-it-works" },
    { label: "Integrations", href: "/product/integrations" },
    { label: "Changelog", href: "/product/changelog" },
  ],
  Company: [
    { label: "About", href: "/company/about" },
    { label: "Blog", href: "/company/blog" },
    { label: "Careers", href: "/company/careers" },
    { label: "Press Kit", href: "/company/press-kit" },
    { label: "Contact", href: "/company/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "/resources/documentation" },
    { label: "API Reference", href: "/resources/api-reference" },
    { label: "Status", href: "/resources/status" },
    { label: "Community", href: "/resources/community" },
    { label: "Roadmap", href: "/resources/roadmap" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/legal/privacy-policy" },
    { label: "Terms of Service", href: "/legal/terms-of-service" },
    { label: "Security", href: "/legal/security" },
    { label: "GDPR", href: "/legal/gdpr" },
    { label: "Cookies", href: "/legal/cookies" },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-[#1C1815] text-white pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#F4F0E8] flex items-center justify-center">
                <span className="font-display text-lg text-[#1C1815] leading-none">C</span>
              </div>
              <span className="font-display text-[#F4F0E8] text-2xl">
                Clario
              </span>
            </div>
            <p className="text-[#9E9890] text-sm leading-relaxed max-w-xs mb-6">
              AI-powered customer support and business intelligence for MSMEs worldwide.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {["𝕏", "in", "gh", "yt"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-[#9E9890] hover:text-[#F4F0E8] hover:bg-white/10 transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-white mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-[#9E9890] hover:text-[#F4F0E8] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#9E9890]">
            © {new Date().getFullYear()} AISupportHub. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-sm text-[#9E9890]">
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E]" />
              All systems operational
            </span>
            <Link href="/login" className="text-sm text-[#C8412D] hover:text-[#E5705B] font-medium transition-colors">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
