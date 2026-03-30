"use client"
import { motion } from "framer-motion"
import { Ticket, Users, TrendingUp, AlertTriangle } from "lucide-react"
import useSWR from "swr"
import { analyticsApi, ticketsApi, type DashboardSummary, type Ticket as ITicket } from "@/lib/api"
import { cn, statusColor, timeAgo } from "@/lib/utils"

const statCards = (data: DashboardSummary) => [
  { label: "Open Tickets", value: data.open_tickets, icon: Ticket, color: "text-[#1C1815]", bg: "bg-white" },
  { label: "Escalations", value: data.escalated_tickets, icon: AlertTriangle, color: "text-[#C8412D]", bg: "bg-[#FEF0EE]" },
  { label: "Automation Rate", value: data.total_tickets > 0 ? `${Math.round((data.closed_tickets / data.total_tickets) * 100)}%` : "0%", icon: TrendingUp, color: "text-[#1E6E4E]", bg: "bg-[#E8F5EF]" },
  { label: "Resolved", value: data.closed_tickets, icon: Users, color: "text-[#5A876C]", bg: "bg-[#ECF2EE]" },
]

function SkeletonCard() {
  return (
    <div className="meridian-card p-6 space-y-3">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-8 w-16" />
    </div>
  )
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingStats } = useSWR(
    "dashboard",
    () => analyticsApi.dashboard().then((r) => r.data),
    { refreshInterval: 30_000 }
  )
  const { data: tickets, isLoading: loadingTickets } = useSWR(
    "recent-tickets",
    () => ticketsApi.list({ limit: 8 }).then((r) => r.data),
    { refreshInterval: 30_000 }
  )

  return (
    <div className="space-y-8 reveal visible">
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-2">Protected · Real-time</p>
        <h1 className="font-display text-[40px] leading-[1.1] text-[#1C1815]">Main Dashboard</h1>
        <p className="text-sm text-[#5A554F] mt-2 max-w-2xl">The command center for live support activity, escalation signals, and automation performance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : summary
          ? statCards(summary).map(({ label, value, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="meridian-card p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[#9E9890]">{label}</p>
                  <div className={cn("p-2 rounded-lg", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                </div>
                {label === "Escalations" && <span className="inline-block w-2 h-2 rounded-full bg-[#C8412D] animate-pulse mb-2" />}
                <p className={cn("text-[32px] font-medium", color)}>{value}</p>
              </motion.div>
            ))
          : null}
      </div>

      {/* Recent tickets */}
      <div className="meridian-card p-6">
        <h2 className="text-base font-medium mb-4 text-[#1C1815]">Recent Tickets</h2>
        {loadingTickets ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(tickets ?? []).map((t: ITicket) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-[#E3DDD4] hover:bg-[#FEF9F7] hover:border-[#C8412D33] transition-colors"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium truncate text-[#1C1815]">{t.subject}</p>
                  <p className="text-xs text-[#9E9890]">{timeAgo(t.created_at)}</p>
                </div>
                <span className={cn("text-xs px-2 py-1 rounded-full border", statusColor(t.status))}>
                  {t.status}
                </span>
              </motion.div>
            ))}
            {tickets?.length === 0 && (
              <p className="text-[#9E9890] text-sm text-center py-8">No tickets yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
