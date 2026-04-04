"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard, Ticket, Users, BarChart3,
  Settings, LogOut, Zap,
  BookOpen, UserCog, ShieldCheck,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/store"

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  owner: [
    { href: "/dashboard",            label: "Dashboard",  icon: LayoutDashboard },
    { href: "/dashboard/tickets",    label: "Tickets",    icon: Ticket },
    { href: "/dashboard/customers",  label: "Customers",  icon: Users },
    { href: "/dashboard/analytics",  label: "Analytics",  icon: BarChart3 },
    { href: "/dashboard/team",       label: "Team",       icon: UserCog },
    { href: "/dashboard/kb",         label: "Knowledge Base", icon: BookOpen },
    { href: "/dashboard/policies",   label: "Policies",   icon: ShieldCheck },
    { href: "/dashboard/settings",   label: "Settings",   icon: Settings },
  ],
  tenant_admin: [
    { href: "/dashboard",            label: "Dashboard",  icon: LayoutDashboard },
    { href: "/dashboard/tickets",    label: "Tickets",    icon: Ticket },
    { href: "/dashboard/customers",  label: "Customers",  icon: Users },
    { href: "/dashboard/team",       label: "Team",       icon: UserCog },
    { href: "/dashboard/kb",         label: "Knowledge Base", icon: BookOpen },
    { href: "/dashboard/policies",   label: "Policies",   icon: ShieldCheck },
  ],
  manager: [
    { href: "/dashboard",            label: "Dashboard",  icon: LayoutDashboard },
    { href: "/dashboard/tickets",    label: "Tickets",    icon: Ticket },
    { href: "/dashboard/customers",  label: "Customers",  icon: Users },
  ],
  agent: [
    { href: "/dashboard",            label: "Dashboard",  icon: LayoutDashboard },
    { href: "/dashboard/tickets",    label: "Tickets",    icon: Ticket },
    { href: "/dashboard/ai",         label: "AI Chat",    icon: Zap },
  ],
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const role = user?.role ?? "agent"
  const NAV: NavItem[] = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.agent

  return (
    <aside
      className={cn(
        "meridian-sidebar sticky top-0 h-screen border-r border-white/10 flex flex-col overflow-hidden transition-all duration-500",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <div className="px-5 pt-6 pb-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="font-display text-[22px] leading-none text-[#F4F0E8]">
            {collapsed ? "C" : "Clario"}
          </div>
        </div>
        {!collapsed && (
          <span className="inline-flex mt-2 px-2 py-0.5 rounded bg-[#C8412D] text-[#F4F0E8] text-[9px] uppercase tracking-[0.08em]">
            Meridian UI
          </span>
        )}
      </div>

      <div className="flex-1 py-3">
        {!collapsed && (
          <div className="px-5 pb-1 text-[9px] uppercase tracking-[0.1em] text-white/30">Navigation</div>
        )}
        <nav className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-[9px] text-[13px] transition-colors border-l-2",
                  active
                    ? "bg-white/10 text-[#F4F0E8] border-l-[#C8412D]"
                    : "text-[#9E9890] border-l-transparent hover:bg-white/5 hover:text-[#F4F0E8]"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon className="h-[18px] w-[18px] opacity-80 group-hover:opacity-100" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-white/10 space-y-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="w-full flex items-center gap-2 px-0 py-2 text-[#5A554F] hover:text-[#9E9890] transition-colors text-xs"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
          {!collapsed && <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>}
        </button>

        <button
          className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-white/5 transition-colors"
          onClick={() => { logout(); router.push("/login") }}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 text-[#9E9890]" />
          {!collapsed && (
            <div className="min-w-0 text-left">
              <p className="text-xs text-[#F4F0E8] truncate">{user?.full_name}</p>
              <p className="text-[11px] text-[#9E9890] truncate">{user?.email}</p>
            </div>
          )}
        </button>
      </div>

    </aside>
  )
}

