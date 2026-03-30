import Link from "next/link"

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    tagline: "Perfect for getting started",
    color: "#5A554F",
    bg: "#FDFCF9",
    border: "#E3DDD4",
    cta: "Get Started Free",
    ctaStyle: "border border-[#E3DDD4] text-[#1C1815] hover:border-[#5A876C] hover:text-[#5A876C]",
    popular: false,
    features: [
      "Up to 100 tickets/month",
      "1 seat",
      "AI auto-response (50/mo)",
      "Basic analytics dashboard",
      "Email support",
      "1 CRM integration",
    ],
  },
  {
    name: "Growth",
    price: "$29",
    period: "per month",
    tagline: "For teams ready to scale",
    color: "#C8412D",
    bg: "#C8412D",
    border: "#C8412D",
    cta: "Start 14-day Trial",
    ctaStyle: "bg-white text-[#C8412D] hover:bg-[#FEF0EE] font-bold",
    popular: true,
    features: [
      "Unlimited tickets",
      "Up to 5 seats",
      "Unlimited AI responses",
      "Full BI suite + weekly reports",
      "Frustration detection",
      "All CRM integrations (Zoho, HubSpot, Shopify)",
      "Voice & image support (Whisper)",
      "Priority email & chat support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    tagline: "For large-scale operations",
    color: "#1C1815",
    bg: "#FDFCF9",
    border: "#E3DDD4",
    cta: "Contact Sales",
    ctaStyle: "border border-[#E3DDD4] text-[#1C1815] hover:border-[#5A876C] hover:text-[#5A876C]",
    popular: false,
    features: [
      "Unlimited everything",
      "Unlimited seats",
      "Custom AI model fine-tuning",
      "Dedicated Ollama instance",
      "SLA guarantee (99.9% uptime)",
      "Custom webhook integrations",
      "Dedicated account manager",
      "On-premise deployment option",
    ],
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#F4F0E8] px-6 reveal" data-stagger="3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF0EE] border border-[#C8412D33] text-[#C8412D] text-sm font-medium mb-4">
            Transparent pricing
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-normal text-[#1C1815] mb-4">
            Plans that grow with you
          </h2>
          <p className="text-lg text-[#5A554F]">
            Start free, upgrade when you need. No surprises, no hidden fees.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl overflow-hidden border transition-transform duration-200 ${
                plan.popular ? "scale-[1.03] shadow-2xl shadow-[#C8412D33]" : "bg-white card-shadow hover:-translate-y-0.5"
              }`}
              style={{ borderColor: plan.border }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="bg-[#C8412D] text-[#F4F0E8] text-xs font-bold text-center py-2 tracking-wider uppercase">
                  ✦ Most Popular
                </div>
              )}

              {/* Card body */}
              <div className={`p-8 ${plan.popular ? "bg-[#C8412D] text-[#F4F0E8]" : "bg-white"}`}>
                <div className="mb-6">
                  <div className={`text-sm font-semibold mb-1 ${plan.popular ? "text-[#F9C8BF]" : "text-[#9E9890]"}`}>
                    {plan.name}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`text-4xl font-extrabold ${plan.popular ? "text-[#F4F0E8]" : "text-[#1C1815]"}`}>
                      {plan.price}
                    </span>
                    {plan.price !== "Custom" && plan.price !== "Free" && (
                      <span className={`text-sm ${plan.popular ? "text-[#F9C8BF]" : "text-[#9E9890]"}`}>/mo</span>
                    )}
                  </div>
                  <div className={`text-xs ${plan.popular ? "text-[#F9C8BF]" : "text-[#9E9890]"}`}>{plan.period}</div>
                  <div className={`mt-2 text-sm ${plan.popular ? "text-[#FCE5E1]" : "text-[#5A554F]"}`}>{plan.tagline}</div>
                </div>

                {/* CTA */}
                <Link
                  href="/login"
                  className={`block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all mb-8 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <svg
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <circle cx="10" cy="10" r="10" fill={plan.popular ? "rgba(255,255,255,0.2)" : "#ECF2EE"} />
                        <path d="M6 10l3 3 5-5" stroke={plan.popular ? "#F4F0E8" : "#1E6E4E"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className={`text-sm ${plan.popular ? "text-[#FFF3F1]" : "text-[#5A554F]"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#5A554F]">
            🔒 <strong className="text-[#1C1815]">14-day free trial</strong> · No credit card required ·{" "}
            <strong className="text-[#1C1815]">Cancel anytime</strong> · SOC2-compliant infrastructure
          </p>
        </div>
      </div>
    </section>
  )
}
