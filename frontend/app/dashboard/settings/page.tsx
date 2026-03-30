"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import { Loader2, CreditCard, Shield, Bell } from "lucide-react"
import { subscriptionsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

const PLANS = [
  { id: "basic",   label: "Basic",   price: "$29/mo",  tickets: "500",   agents: "3",  ai: "100K tokens" },
  { id: "pro",     label: "Pro",     price: "$99/mo",  tickets: "5,000", agents: "15", ai: "1M tokens" },
  { id: "premium", label: "Premium", price: "$299/mo", tickets: "∞",     agents: "∞",  ai: "10M tokens" },
]

export default function SettingsPage() {
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const { data: sub, isLoading, mutate } = useSWR("subscription", () =>
    subscriptionsApi.get().then((r) => r.data)
  )

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan)
    try {
      await subscriptionsApi.upgrade(plan)
      await mutate()
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Owner Only</p>
        <h1 className="font-display text-4xl text-[#1C1815]">Settings</h1>
        <p className="text-[#5A554F] text-sm mt-1">Manage your subscription and preferences</p>
      </div>

      {/* Subscription */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-[#C8412D]" /> Subscription Plan
        </h2>

        {isLoading ? (
          <div className="skeleton h-20 rounded-xl" />
        ) : sub ? (
          <div className="meridian-card p-4 mb-6 flex items-center gap-4">
            <div>
              <p className="font-medium capitalize">{sub.plan} Plan</p>
              <p className="text-xs text-[#9E9890] mt-1">
                Tickets: {sub.tickets_used}/{sub.ticket_limit} · Agents: {sub.agents_used}/{sub.agent_limit}
              </p>
            </div>
            <div className="ml-auto text-right">
              <div className="w-32 bg-muted rounded-full h-1.5">
                <div
                  className="bg-[#C8412D] h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, (sub.tickets_used / sub.ticket_limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[#9E9890] mt-1">Ticket usage</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "glass p-5 flex flex-col gap-3 cursor-pointer",
                sub?.plan === plan.id ? "border-[#C8412D] bg-[#FEF0EE]" : ""
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{plan.label}</span>
                {sub?.plan === plan.id && (
                  <span className="text-xs bg-[#FEF0EE] text-[#C8412D] border border-[#E9B9B0] px-2 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#C8412D]">{plan.price}</p>
              <ul className="text-xs text-[#5A554F] space-y-1">
                <li>{plan.tickets} tickets/mo</li>
                <li>{plan.agents} agents</li>
                <li>{plan.ai}</li>
              </ul>
              {sub?.plan !== plan.id && (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={!!upgrading}
                  className="mt-auto w-full bg-[#C8412D] hover:bg-[#B43A28] text-[#F4F0E8] text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  {upgrading === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  Upgrade
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security info */}
      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#5A876C]" /> Security
        </h2>
        <div className="meridian-card p-5 space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-[#F4F0E8]">
            <span className="text-[#5A554F]">Authentication</span>
            <span className="text-[#1E6E4E] font-medium">JWT • bcrypt</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F4F0E8]">
            <span className="text-[#5A554F]">Multi-tenancy</span>
            <span className="text-[#1E6E4E] font-medium">Row-Level Security</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[#5A554F]">Webhook validation</span>
            <span className="text-[#1E6E4E] font-medium">HMAC-SHA256</span>
          </div>
        </div>
      </section>
    </div>
  )
}
