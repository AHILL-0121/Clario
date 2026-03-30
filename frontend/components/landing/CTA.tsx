import Link from "next/link"

export default function CTA() {
  return (
    <section className="py-24 px-6 bg-[#FDFCF9] reveal" data-stagger="4">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          style={{
            background: "#1C1815",
          }}
        >
          {/* Decorative circles */}
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(circle, white 0%, transparent 70%)" }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFFFFF20] text-[#F4F0E8] text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-[#5A876C] animate-pulse" />
              No credit card required
            </div>

            <h2 className="font-display text-4xl md:text-5xl font-normal text-[#F4F0E8] mb-4 leading-tight">
              Ready to transform your
              <br />
              customer support?
            </h2>
            <p className="text-[#D4CFC8] text-lg mb-10 max-w-xl mx-auto">
              Join 500+ MSMEs who&apos;ve cut response times by 10× and boosted CSAT scores to 94%.
              Start your free trial today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="group px-8 py-4 rounded-xl bg-[#C8412D] text-[#F4F0E8] font-bold text-base hover:bg-[#B43A28] transition-all shadow-lg inline-flex items-center justify-center gap-2"
              >
                <span>Start Free Trial — It&apos;s Free Forever</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <a
                href="#pricing"
                className="px-8 py-4 rounded-xl border-2 border-[#F4F0E855] text-[#F4F0E8] font-semibold text-base hover:bg-white/10 transition-all"
              >
                View Pricing
              </a>
            </div>

            <p className="mt-6 text-[#9E9890] text-sm">
              Setup in 10 minutes · No IT team needed · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
