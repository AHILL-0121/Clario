"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Building2, Users, Ticket, TrendingUp, ToggleLeft, ToggleRight, Loader2 } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  ticket_count: number
  user_count: number
  created_at: string
}

interface Stats {
  total_tenants: number
  active_tenants: number
  inactive_tenants: number
  total_users: number
  total_tickets: number
}

export default function AdminDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tenantsRes] = await Promise.all([
          axios.get(`${API}/api/admin/stats`, { headers }),
          axios.get(`${API}/api/admin/tenants`, { headers }),
        ])
        setStats(statsRes.data)
        setTenants(tenantsRes.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleTenant = async (id: string) => {
    setToggling(id)
    try {
      const res = await axios.patch(`${API}/api/admin/tenants/${id}/toggle`, {}, { headers })
      setTenants(prev =>
        prev.map(t => (t.id === id ? { ...t, is_active: res.data.is_active } : t))
      )
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#C8412D]" />
      </div>
    )
  }

  const STAT_CARDS = [
    { label: "Total Companies", value: stats?.total_tenants ?? 0, icon: Building2, color: "#C8412D" },
    { label: "Active",          value: stats?.active_tenants ?? 0, icon: TrendingUp, color: "#1E6E4E" },
    { label: "Total Users",     value: stats?.total_users ?? 0,   icon: Users,      color: "#5A876C" },
    { label: "Total Tickets",   value: stats?.total_tickets ?? 0, icon: Ticket,     color: "#5A554F" },
  ]

  return (
    <div className="p-8 space-y-8 meridian-surface">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Superuser Only</p>
        <h1 className="font-display text-4xl text-[#1C1815]">Platform Admin</h1>
        <p className="text-sm text-[#5A554F] mt-1">All companies on the platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="meridian-card p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "1A" }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1C1815]">{value}</p>
                <p className="text-xs text-[#5A554F]">{label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tenants table */}
      <div className="meridian-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3DDD4]">
          <h2 className="font-semibold text-[#1C1815]">Companies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F4F0E8] text-[#9E9890] text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Company</th>
                <th className="text-left px-6 py-3">Slug</th>
                <th className="text-right px-6 py-3">Users</th>
                <th className="text-right px-6 py-3">Tickets</th>
                <th className="text-center px-6 py-3">Status</th>
                <th className="text-center px-6 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-[#FEF9F7] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1C1815]">{t.name}</td>
                  <td className="px-6 py-4 text-[#5A554F] font-mono text-xs">{t.slug}</td>
                  <td className="px-6 py-4 text-right text-[#1C1815]">{t.user_count}</td>
                  <td className="px-6 py-4 text-right text-[#1C1815]">{t.ticket_count}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      t.is_active ? "bg-[#E8F5EF] text-[#1E6E4E]" : "bg-[#FEF0EE] text-[#C8412D]"
                    }`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleTenant(t.id)}
                      disabled={toggling === t.id}
                      className="text-[#5A554F] hover:text-[#C8412D] transition-colors disabled:opacity-40"
                      title={t.is_active ? "Deactivate" : "Activate"}
                    >
                      {toggling === t.id
                        ? <Loader2 className="h-5 w-5 animate-spin" />
                        : t.is_active
                          ? <ToggleRight className="h-5 w-5 text-[#1E6E4E]" />
                          : <ToggleLeft className="h-5 w-5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-[#9E9890]">No companies found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
