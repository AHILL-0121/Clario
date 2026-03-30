"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import useSWR from "swr"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Sparkles, Loader2, TrendingUp } from "lucide-react"
import { analyticsApi, type WeeklyMetric } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { useAuthStore } from "@/lib/store"

export default function AnalyticsPage() {
  const [generating, setGenerating] = useState(false)
  const autoGenDone = useRef(false)
  const router = useRouter()
  const { user } = useAuthStore()

  // Redirect non-owners away immediately
  useEffect(() => {
    if (user && user.role !== "owner") {
      router.replace("/dashboard")
    }
  }, [user, router])

  const { data: weekly, isLoading, mutate } = useSWR(
    "weekly-metrics",
    () => analyticsApi.weekly().then((r) => r.data),
    { refreshInterval: 60_000 }
  )

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await analyticsApi.generateWeekly()
      await mutate()
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate on first load if no data exists
  useEffect(() => {
    if (!isLoading && weekly && weekly.length === 0 && !autoGenDone.current) {
      autoGenDone.current = true
      handleGenerate()
    }
  }, [isLoading, weekly])

  const latestSummary = weekly?.[0]?.ai_summary

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Owner + Manager · BI Dashboard</p>
          <h1 className="font-display text-4xl text-[#1C1815]">Analytics</h1>
          <p className="text-[#5A554F] text-sm mt-1">AI-powered weekly insights</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-[#C8412D] hover:bg-[#B43A28] text-[#F4F0E8] px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Report
        </button>
      </div>

      {/* AI Executive Summary */}
      {latestSummary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="meridian-card p-6 border-[#CFE0D5]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#5A876C]" />
            <h2 className="font-semibold text-[#1E6E4E]">AI Executive Summary</h2>
            {weekly?.[0]?.week_start && (
              <span className="text-xs text-[#9E9890] ml-auto">w/c {weekly[0].week_start}</span>
            )}
          </div>
          <p className="text-sm text-[#5A554F] leading-relaxed whitespace-pre-line">{latestSummary}</p>
        </motion.div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map((i) => <div key={i} className="glass h-72 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ticket volume */}
          <div className="meridian-card p-6">
            <h3 className="font-medium mb-4 text-sm">Weekly Ticket Volume</h3>
            <div className="relative">
              {(weekly ?? []).length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-[#C8412D] animate-spin mb-2" />
                  <p className="text-xs text-[#9E9890]">Generating first report…</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={(weekly ?? []).slice().reverse()}>
                <defs>
                  <linearGradient id="total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8412D" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#C8412D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD4" />
                <XAxis dataKey="week_start" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E3DDD4", borderRadius: 8, color: "#1C1815" }} />
                <Area type="monotone" dataKey="total_tickets" stroke="#C8412D" fill="url(#total)" name="Total" />
                <Area type="monotone" dataKey="resolved_tickets" stroke="#1E6E4E" fill="none" name="Resolved" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Escalation & churn */}
          <div className="meridian-card p-6">
            <h3 className="font-medium mb-4 text-sm">Escalations & Churn Risk</h3>
            <div className="relative">
              {(weekly ?? []).length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 text-[#C8412D] animate-spin mb-2" />
                  <p className="text-xs text-[#9E9890]">Generating first report…</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(weekly ?? []).slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E3DDD4" />
                <XAxis dataKey="week_start" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E3DDD4", borderRadius: 8, color: "#1C1815" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="escalations" fill="#C8412D" name="Escalations" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churn_risk_score" fill="#5A876C" name="Churn Risk" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Metrics table */}
      {!isLoading && (weekly ?? []).length > 0 && (
        <div className="meridian-card overflow-hidden">
          <div className="grid grid-cols-6 px-4 py-3 border-b border-[#E3DDD4] text-xs font-medium text-[#9E9890]">
            <span>Week</span><span>Tickets</span><span>Resolved</span>
            <span>Escalated</span><span>Automation</span><span>Churn Risk</span>
          </div>
          {(weekly ?? []).map((m: WeeklyMetric) => (
            <div key={m.id} className="grid grid-cols-6 px-4 py-3 border-b border-[#F4F0E8] text-sm hover:bg-[#FEF9F7] transition-colors">
              <span>{m.week_start}</span>
              <span>{m.total_tickets}</span>
              <span className="text-[#1E6E4E]">{m.resolved_tickets}</span>
              <span className="text-[#C8412D]">{m.escalations}</span>
              <span className="text-[#5A876C]">{m.automation_rate.toFixed(1)}%</span>
              <span className="text-[#5A554F]">{(m.churn_risk_score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
