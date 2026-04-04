"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { BotMessageSquare, LayoutDashboard, LogOut, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/store"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, token, logout, hasHydrated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasHydrated) return
    if (!token) { router.replace("/login"); return }
    if (user && user.role !== "admin") router.replace("/dashboard")
  }, [user, token, hasHydrated, router])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const NAV = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin", label: "MSME Companies", icon: Building2 },
  ]

  if (!hasHydrated || !token) return null

  return (
    <div className="h-screen overflow-hidden flex bg-[#FDFCF9]">
      {/* Sidebar */}
      <aside className="w-64 sticky top-0 h-screen meridian-sidebar border-r border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-[#F4F0E8] flex items-center justify-center shadow-sm">
            <BotMessageSquare className="h-5 w-5 text-[#1C1815]" />
          </div>
          <div>
            <span className="font-display text-2xl text-[#F4F0E8] leading-none">
              Clario
            </span>
            <p className="text-xs text-[#C8412D] font-semibold uppercase tracking-wide">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-white/10 text-[#F4F0E8] border border-white/10"
                  : "text-[#9E9890] hover:text-[#F4F0E8] hover:bg-white/5"
              )}>
                <Icon className="h-4 w-4" />
                {label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-white/10 pt-4">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 text-[#9E9890] group-hover:text-[#C8412D] transition-colors" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F4F0E8] truncate">{user?.full_name}</p>
              <p className="text-xs text-[#9E9890] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-screen overflow-y-auto">{children}</main>
    </div>
  )
}

