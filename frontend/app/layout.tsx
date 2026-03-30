import type { Metadata } from "next"
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-ui" })
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display" })
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "AI Support Hub — Smart Customer Support for MSMEs",
  description: "AI-Powered Customer Support & Business Intelligence SaaS for growing businesses. Resolve tickets faster, understand your customers, scale with confidence.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${cormorant.variable} ${jetBrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
