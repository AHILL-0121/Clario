const FEATURES = [
  {
    icon: "🤖",
    color: "#C8412D",
    bg: "#FEF0EE",
    title: "AI Ticket Auto-Response",
    description:
      "LLaMA 3.1-powered AI reads, understands, and drafts accurate responses in seconds — reducing agent workload by up to 70%.",
  },
  {
    icon: "📊",
    color: "#1E6E4E",
    bg: "#E8F5EF",
    title: "Business Intelligence",
    description:
      "Weekly AI-generated BI summaries surface trends, bottlenecks, and revenue insights — no data analyst required.",
  },
  {
    icon: "🔥",
    color: "#C8412D",
    bg: "#FEF0EE",
    title: "Frustration Detection",
    description:
      "Real-time sentiment scoring flags high-risk tickets before they become churn. Automatic escalation keeps VIPs happy.",
  },
  {
    icon: "🔗",
    color: "#1E6E4E",
    bg: "#E8F5EF",
    title: "CRM Integrations",
    description:
      "Sync customers from Zoho, HubSpot, and Shopify via secure webhooks. One source of truth, always up to date.",
  },
  {
    icon: "🎙️",
    color: "#5A876C",
    bg: "#ECF2EE",
    title: "Voice & Image Support",
    description:
      "Customers can attach audio messages or images. Whisper AI transcribes speech; OCR extracts text from photos automatically.",
  },
  {
    icon: "🏢",
    color: "#1C1815",
    bg: "#F4F0E8",
    title: "Multi-Tenant Architecture",
    description:
      "Full tenant isolation — each business has its own data, RAG knowledge base, and custom escalation thresholds.",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#FDFCF9] px-6 reveal" data-stagger="1">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF0EE] border border-[#C8412D30] text-[#C8412D] text-sm font-medium mb-4">
            Everything you need
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-normal text-[#1C1815] mb-4">
            Built for growing businesses
          </h2>
          <p className="text-lg text-[#5A554F]">
            Every feature is designed to reduce friction, increase customer satisfaction, and help your
            team do more with less.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="relative bg-white rounded-2xl p-6 border border-[#E3DDD4] card-shadow hover:card-shadow-hover hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden"
            >
              <span className="absolute left-0 top-0 bottom-0 w-0 group-hover:w-1 bg-[#C8412D] transition-all duration-200" />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                style={{ background: f.bg }}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-medium text-[#1C1815] mb-2 group-hover:text-[#C8412D] transition-colors">
                {f.title}
              </h3>
              <p className="text-[#5A554F] text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
