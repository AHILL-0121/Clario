"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import { Search, Crown } from "lucide-react"
import { customersApi, type Customer } from "@/lib/api"
import { cn, timeAgo } from "@/lib/utils"

export default function CustomersPage() {
  const [search, setSearch] = useState("")
  const { data: customers, isLoading } = useSWR(
    ["customers", search],
    () => customersApi.list({ search: search || undefined, limit: 50 }).then((r) => r.data),
    { refreshInterval: 30_000 }
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Protected · CRM-synced</p>
        <h1 className="font-display text-4xl text-[#1C1815]">Customers</h1>
        <p className="text-[#5A554F] text-sm mt-1">{customers?.length ?? "…"} customers</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9E9890]" />
        <input
          className="w-full bg-white border border-[#E3DDD4] pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] transition-all"
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass p-5 space-y-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-48" />
              <div className="skeleton h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(customers ?? []).map((c: Customer, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="meridian-card p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-sm text-[#1C1815]">{c.full_name}</p>
                {c.is_vip && (
                  <span className="flex items-center gap-1 text-xs text-[#C8412D] bg-[#FEF0EE] border border-[#E9B9B0] px-2 py-0.5 rounded-full">
                    <Crown className="h-3 w-3" /> VIP
                  </span>
                )}
              </div>
              {c.email && <p className="text-xs text-[#5A554F]">{c.email}</p>}
              {c.phone && <p className="text-xs text-[#5A554F]">{c.phone}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F4F0E8]">
                {c.crm_source && (
                  <span className="text-xs px-2 py-0.5 bg-[#ECF2EE] text-[#5A876C] border border-[#CFE0D5] rounded-full capitalize">
                    {c.crm_source}
                  </span>
                )}
                <span className="text-xs text-[#9E9890] ml-auto">{timeAgo(c.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {!isLoading && customers?.length === 0 && (
        <p className="text-center text-[#9E9890] py-16">No customers found</p>
      )}
    </div>
  )
}
