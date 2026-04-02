import dynamic from "next/dynamic"
import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"
import Stats from "@/components/landing/Stats"
import Features from "@/components/landing/Features"
import HowItWorks from "@/components/landing/HowItWorks"
import Pricing from "@/components/landing/Pricing"
import Testimonials from "@/components/landing/Testimonials"
import CTA from "@/components/landing/CTA"
import Footer from "@/components/landing/Footer"
import RevealObserver from "@/components/landing/RevealObserver"

// ssr:false — widget uses browser APIs; never rendered on the server
const CustomerChatWidget = dynamic(
  () => import("@/components/landing/CustomerChatWidget"),
  { ssr: false }
)

export default function LandingPage() {
  return (
    <div className="bg-[#FDFCF9] min-h-screen">
      <Navbar />
      <RevealObserver />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
      <CustomerChatWidget />
    </div>
  )
}
