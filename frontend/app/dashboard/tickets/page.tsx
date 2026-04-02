"use client"
import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import useSWR, { mutate } from "swr"
import Link from "next/link"
import { ticketsApi, type Ticket } from "@/lib/api"
import { cn, statusColor, timeAgo, frustrationColor } from "@/lib/utils"
import { useWebSocket } from "@/hooks/useWebSocket"

const STATUSES = ["", "OPEN", "AI_DRAFTED", "WAITING_CUSTOMER", "ESCALATED", "CLOSED"]

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300)
    return () => window.clearTimeout(id)
  }, [search])

  const { data: tickets, isLoading } = useSWR(
    ["tickets", statusFilter],
    () => ticketsApi.list({ status: statusFilter || undefined, limit: 50 }).then((r) => r.data),
    { refreshInterval: 10_000 }
  )

  // Auto-refresh on WS events
  useWebSocket((ev) => {
    if (ev.event.startsWith("ticket.")) {
      mutate(["tickets", statusFilter])
    }
  })

  const visibleTickets = useMemo(() => tickets ?? [], [tickets])

  return (
    <div className="space-y-6 reveal visible" data-stagger="1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Protected · Power-user table</p>
          <h1 className="font-display text-4xl text-[#1C1815]">Tickets</h1>
          <p className="text-[#5A554F] text-sm mt-1">{tickets?.length ?? "…"} tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-20 bg-[#FDFCF9F2] backdrop-blur-md border-b border-[#E3DDD4] py-3">
        <div className="flex gap-3 flex-wrap items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets"
            className="px-3 py-1.5 text-xs rounded-full border border-[#E3DDD4] bg-white min-w-[220px] outline-none focus:border-[#C8412D] focus:ring-2 focus:ring-[#C8412D22]"
          />
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                statusFilter === s
                  ? "bg-[#1C1815] text-[#F4F0E8] border-[#1C1815]"
                  : "bg-white border-[#E3DDD4] text-[#5A554F] hover:text-[#1C1815] hover:bg-[#F4F0E8]"
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="meridian-card overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_100px_90px_80px] px-4 py-3 border-b border-[#E3DDD4] text-xs font-medium text-[#9E9890] uppercase tracking-[0.08em]">
          <span>Subject</span>
          <span>Status</span>
          <span>Channel</span>
          <span>Frustration</span>
          <span>Created</span>
        </div>

        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {visibleTickets.map((t: Ticket, i: number) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/dashboard/tickets/${t.id}`}
                  className={cn(
                    "relative grid grid-cols-[1fr_120px_100px_90px_80px] px-4 py-3 border-b border-[#F4F0E8] hover:bg-[#FEF9F7] transition-colors cursor-pointer items-center",
                    t.status === "ESCALATED" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:bg-[#C8412D] before:animate-[pulseWidth_2s_ease-in-out_infinite]"
                  )}
                  style={{ opacity: !debouncedSearch || `${t.subject} ${t.channel} ${t.status}`.toLowerCase().includes(debouncedSearch) ? 1 : 0.35 }}
                >
                  <span className="text-sm font-medium truncate pr-4 text-[#1C1815]">{t.subject}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border w-fit", statusColor(t.status))}>
                    {t.status}
                  </span>
                  <span className="text-xs text-[#9E9890] capitalize">{t.channel.replace("_", " ")}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-7 w-1 rounded bg-[#F4F0E8] overflow-hidden inline-flex items-end" title={`Frustration ${(t.frustration_score * 100).toFixed(0)}%`}>
                      <span className={cn("w-full rounded", frustrationColor(t.frustration_score).includes("red") ? "bg-[#C8412D]" : frustrationColor(t.frustration_score).includes("green") ? "bg-[#1E6E4E]" : "bg-[#5A876C]")}
                        style={{ height: `${Math.max(6, t.frustration_score * 100)}%` }} />
                    </span>
                    <span className={cn("text-xs font-medium", frustrationColor(t.frustration_score))}>
                      {(t.frustration_score * 100).toFixed(0)}%
                    </span>
                  </span>
                  <span className="text-xs text-[#9E9890]">{timeAgo(t.created_at)}</span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!isLoading && visibleTickets.length === 0 && (
          <p className="text-center text-[#9E9890] py-16">No tickets found</p>
        )}
      </div>
    </div>
  )
}
