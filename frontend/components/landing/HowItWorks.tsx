const STEPS = [
  {
    number: "01",
    color: "#C8412D",
    bg: "#FEF0EE",
    title: "Connect Your Channels",
    description:
      "Link your email, CRM (Zoho / HubSpot / Shopify), and webhook sources in minutes. Our secure HMAC-validated integrations keep your data safe.",
    detail: "Setup time: ~10 minutes",
  },
  {
    number: "02",
    color: "#5A876C",
    bg: "#ECF2EE",
    title: "AI Learns Your Business",
    description:
      "Upload your knowledge base — FAQs, product docs, policies. Our RAG engine indexes everything so the AI answers with your actual information.",
    detail: "Accuracy improves over time",
  },
  {
    number: "03",
    color: "#1E6E4E",
    bg: "#E8F5EF",
    title: "Resolve & Analyse",
    description:
      "Watch tickets auto-resolve, escalations catch fire before they spread, and weekly AI reports tell you exactly how your business is performing.",
    detail: "Real-time throughout",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white px-6 reveal" data-stagger="2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ECF2EE] border border-[#5A876C33] text-[#5A876C] text-sm font-medium mb-4">
            Simple to get started
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-normal text-[#1C1815] mb-4">
            Up and running in minutes
          </h2>
          <p className="text-lg text-[#5A554F]">
            No lengthy onboarding. No dedicated IT team required. Just three steps and you&apos;re live.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-14 left-1/6 right-1/6 h-px border-t border-dashed border-[#E3DDD4]" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                {/* Step circle */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                  style={{ background: step.bg }}
                >
                  <span className="text-2xl font-black" style={{ color: step.color }}>
                    {step.number}
                  </span>
                </div>

                {/* Arrow (desktop) */}
                {i < 2 && (
                  <div className="hidden lg:block absolute top-6 -right-4 z-10">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="#E3DDD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}

                <h3 className="text-xl font-medium text-[#1C1815] mb-3">{step.title}</h3>
                <p className="text-[#5A554F] leading-relaxed mb-4">{step.description}</p>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: step.bg, color: step.color }}
                >
                  {step.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
