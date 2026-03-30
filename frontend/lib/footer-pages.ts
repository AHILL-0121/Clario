export type FooterSection = "product" | "company" | "resources" | "legal"

export type FooterPageEntry = {
  slug: string
  label: string
  title: string
  summary: string
  points: string[]
}

type FooterContentMap = Record<FooterSection, FooterPageEntry[]>

export const FOOTER_PAGE_CONTENT: FooterContentMap = {
  product: [
    {
      slug: "features",
      label: "Features",
      title: "Clario Features",
      summary: "Explore the core capabilities designed to help support teams respond faster and scale with confidence.",
      points: [
        "AI-assisted ticket triage and summarization.",
        "Unified customer context from chats, tickets, and CRM records.",
        "Smart workflows for assignment, escalation, and follow-up.",
      ],
    },
    {
      slug: "pricing",
      label: "Pricing",
      title: "Transparent Pricing",
      summary: "Choose a plan that matches your support volume, team size, and growth stage.",
      points: [
        "Simple tiers for startups, growth teams, and enterprise operations.",
        "Predictable billing with no hidden platform fees.",
        "Flexible add-ons for advanced automation and analytics.",
      ],
    },
    {
      slug: "how-it-works",
      label: "How It Works",
      title: "How Clario Works",
      summary: "Understand the end-to-end workflow from ingestion to response and reporting.",
      points: [
        "Connect your channels and knowledge sources in minutes.",
        "Automate ticket routing with confidence thresholds.",
        "Track performance across team, customer, and channel metrics.",
      ],
    },
    {
      slug: "integrations",
      label: "Integrations",
      title: "Integrations",
      summary: "Bring Clario into your existing stack with built-in and API-first integrations.",
      points: [
        "Connect CRM, helpdesk, and communication tools.",
        "Secure token-based authentication and role-based access.",
        "Webhooks for real-time workflows and notifications.",
      ],
    },
    {
      slug: "changelog",
      label: "Changelog",
      title: "Product Changelog",
      summary: "Stay updated on newly shipped features, improvements, and platform fixes.",
      points: [
        "Monthly release highlights and quality updates.",
        "Deprecation notices with migration guidance.",
        "Roadmap alignment and upcoming release previews.",
      ],
    },
  ],
  company: [
    {
      slug: "about",
      label: "About",
      title: "About Clario",
      summary: "Learn about our mission to make world-class customer support accessible to every growing business.",
      points: [
        "Built for MSMEs that need speed without enterprise complexity.",
        "Focused on practical AI that improves outcomes, not noise.",
        "Backed by product and support leaders from high-growth teams.",
      ],
    },
    {
      slug: "blog",
      label: "Blog",
      title: "Clario Blog",
      summary: "Read guides, product stories, and practical playbooks for support operations.",
      points: [
        "Implementation checklists for AI support.",
        "Operational templates for ticket quality and SLAs.",
        "Leadership insights from customer experience teams.",
      ],
    },
    {
      slug: "careers",
      label: "Careers",
      title: "Careers",
      summary: "Help us build the next generation of support intelligence products.",
      points: [
        "Remote-friendly culture with outcome-driven collaboration.",
        "Product, engineering, and customer success opportunities.",
        "Strong learning environment with mentorship and ownership.",
      ],
    },
    {
      slug: "press-kit",
      label: "Press Kit",
      title: "Press Kit",
      summary: "Access logos, product imagery, and brand usage guidance for media and partners.",
      points: [
        "Brand assets in web and print-ready formats.",
        "Boilerplate and approved company descriptions.",
        "Media contact details for interview requests.",
      ],
    },
    {
      slug: "contact",
      label: "Contact",
      title: "Contact Us",
      summary: "Reach our team for sales, support, partnerships, or general inquiries.",
      points: [
        "Sales consultation for deployment planning.",
        "Partnership requests and integration discussions.",
        "General support and account assistance channels.",
      ],
    },
  ],
  resources: [
    {
      slug: "documentation",
      label: "Documentation",
      title: "Documentation",
      summary: "Find setup guides, configuration references, and implementation examples.",
      points: [
        "Quick start paths for admins and operators.",
        "Architecture and deployment reference material.",
        "Role-based usage guides for teams.",
      ],
    },
    {
      slug: "api-reference",
      label: "API Reference",
      title: "API Reference",
      summary: "Integrate programmatically with endpoints for tickets, analytics, and workflows.",
      points: [
        "REST endpoints with authentication requirements.",
        "Schema definitions and request/response examples.",
        "Webhook events and retry semantics.",
      ],
    },
    {
      slug: "status",
      label: "Status",
      title: "System Status",
      summary: "Monitor platform uptime, incidents, and scheduled maintenance updates.",
      points: [
        "Real-time service health indicators.",
        "Incident timelines and resolution notes.",
        "Advance notice for planned maintenance windows.",
      ],
    },
    {
      slug: "community",
      label: "Community",
      title: "Community",
      summary: "Connect with operators and builders sharing best practices around support automation.",
      points: [
        "Peer discussions for implementation challenges.",
        "Reusable templates and workflow ideas.",
        "Product feedback channels to influence roadmap priorities.",
      ],
    },
    {
      slug: "roadmap",
      label: "Roadmap",
      title: "Roadmap",
      summary: "See what is currently in progress and what is coming next.",
      points: [
        "Upcoming capabilities by quarter.",
        "Prioritized improvements based on customer feedback.",
        "Visibility into active development streams.",
      ],
    },
  ],
  legal: [
    {
      slug: "privacy-policy",
      label: "Privacy Policy",
      title: "Privacy Policy",
      summary: "Understand how we collect, process, and protect personal and operational data.",
      points: [
        "Data categories, retention windows, and lawful basis.",
        "Customer controls for access, update, and deletion.",
        "Security measures for data in transit and at rest.",
      ],
    },
    {
      slug: "terms-of-service",
      label: "Terms of Service",
      title: "Terms of Service",
      summary: "Review platform usage terms, service commitments, and account responsibilities.",
      points: [
        "Acceptable use and account obligations.",
        "Subscription and billing conditions.",
        "Service limitations, warranties, and liability terms.",
      ],
    },
    {
      slug: "security",
      label: "Security",
      title: "Security",
      summary: "See how Clario is built with security best practices across infrastructure and access.",
      points: [
        "Role-based authorization and least-privilege principles.",
        "Auditability through structured activity logging.",
        "Operational safeguards and incident response processes.",
      ],
    },
    {
      slug: "gdpr",
      label: "GDPR",
      title: "GDPR",
      summary: "Learn about GDPR-aligned controls and data subject rights management.",
      points: [
        "Data processing controls for EU customers.",
        "Documented processes for subject access requests.",
        "Regional transfer and compliance support guidance.",
      ],
    },
    {
      slug: "cookies",
      label: "Cookies",
      title: "Cookie Policy",
      summary: "Review how cookies and related technologies are used for product functionality and analytics.",
      points: [
        "Essential, analytics, and preference cookie categories.",
        "Consent and preference management options.",
        "Guidance for browser-level cookie controls.",
      ],
    },
  ],
}

export function getFooterSectionEntries(section: FooterSection): FooterPageEntry[] {
  return FOOTER_PAGE_CONTENT[section]
}

export function getFooterEntry(section: FooterSection, slug: string): FooterPageEntry | undefined {
  return FOOTER_PAGE_CONTENT[section].find((entry) => entry.slug === slug)
}
