"use client"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import { useAuthStore } from "@/lib/store"
import { useWebSocket } from "@/hooks/useWebSocket"
import { toast } from "@/hooks/useToast"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, hasHydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const pageLabel = (() => {
    if (pathname === "/dashboard") return "Main Dashboard"
    if (pathname.includes("/tickets")) return "Tickets"
    if (pathname.includes("/customers")) return "Customers"
    if (pathname.includes("/analytics")) return "Analytics"
    if (pathname.includes("/team")) return "Team"
    if (pathname.includes("/kb")) return "Knowledge Base"
    if (pathname.includes("/policies")) return "Policies"
    if (pathname.includes("/settings")) return "Settings"
    if (pathname.includes("/ai")) return "AI Chat"
    return "Dashboard"
  })()

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) router.replace("/login")
  }, [token, hasHydrated, router])

  // Global WebSocket listener
  useWebSocket((event) => {
    if (event.event === "ticket.escalated") {
      toast({ title: "⚠️ Ticket Escalated", description: `Ticket #${String(event.data.ticket_id).slice(0, 8)} needs attention`, variant: "destructive" })
    }
    if (event.event === "ticket.created") {
      toast({ title: "New Ticket", description: "A new support ticket has been created" })
    }
  })

  if (!hasHydrated) return null
  if (!token) return null

  return (
    <div className="flex min-h-screen meridian-surface">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 border-b border-[#E3DDD4] bg-[#FDFCF9F0] backdrop-blur-md h-14 px-8 flex items-center justify-between">
          <div className="text-xs text-[#9E9890]">
            Clario / <span className="text-[#1C1815] font-medium">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="meridian-badge meridian-badge-red">Meridian Theme</span>
            <span className="meridian-badge meridian-badge-green">Light · v1.0</span>
          </div>
        </header>
        <div className="px-10 py-9 page-reveal">
          <div className="max-w-[1160px] mx-auto">{children}</div>
        </div>
      </main>
    </div>
  )
}
