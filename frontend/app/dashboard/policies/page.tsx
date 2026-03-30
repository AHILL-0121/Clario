"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Save, Loader2 } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface Policies {
  tenant_id: string
  escalation_threshold: number
  auto_draft_enabled: boolean
  auto_escalate_enabled: boolean
  max_response_time_hours: number
  welcome_message: string | null
  updated_at: string
}

export default function PoliciesPage() {
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }

  const [policies, setPolicies] = useState<Policies | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    axios.get(`${API}/api/tenant-admin/policies`, { headers })
      .then(r => setPolicies(r.data))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!policies) return
    setSaving(true); setSaved(false)
    await axios.put(`${API}/api/tenant-admin/policies`, {
      escalation_threshold: policies.escalation_threshold,
      auto_draft_enabled: policies.auto_draft_enabled,
      auto_escalate_enabled: policies.auto_escalate_enabled,
      max_response_time_hours: policies.max_response_time_hours,
      welcome_message: policies.welcome_message,
    }, { headers })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading || !policies) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-[#C8412D]" />
      </div>
    )
  }

  const TOGGLE_CLASS = "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer"
  const KNOB_CLASS = "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`${TOGGLE_CLASS} ${value ? "bg-[#1E6E4E]" : "bg-[#D1D5DB]"}`}
    >
      <span className={`${KNOB_CLASS} ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Owner Only · Guardrails</p>
          <h1 className="font-display text-4xl text-[#1C1815] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#5A876C]" /> Policies
          </h1>
          <p className="text-sm text-[#5A554F] mt-1">Configure AI behaviour and escalation rules for your company</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#C8412D] text-[#F4F0E8] rounded-xl text-sm font-medium hover:bg-[#B43A28] disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="meridian-card divide-y divide-[#F4F0E8]"
      >
        {/* Escalation threshold */}
        <div className="px-6 py-5 flex items-center justify-between gap-8">
          <div className="flex-1">
            <p className="font-medium text-[#1C1815] text-sm">Escalation Threshold</p>
            <p className="text-xs text-[#5A554F] mt-0.5">
              AI confidence score below this value triggers escalation to a human agent (0 = always escalate, 1 = never)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={1} step={0.05}
              value={policies.escalation_threshold}
              onChange={e => setPolicies(p => p ? { ...p, escalation_threshold: parseFloat(e.target.value) } : p)}
              className="w-32 accent-[#C8412D]"
            />
            <span className="w-10 text-sm font-mono text-[#1C1815] text-right">
              {policies.escalation_threshold.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Auto draft */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-[#1C1815] text-sm">Auto-Draft AI Replies</p>
            <p className="text-xs text-[#5A554F] mt-0.5">Automatically create draft responses using AI before agent review</p>
          </div>
          <Toggle
            value={policies.auto_draft_enabled}
            onChange={v => setPolicies(p => p ? { ...p, auto_draft_enabled: v } : p)}
          />
        </div>

        {/* Auto escalate */}
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-[#1C1815] text-sm">Auto-Escalate Low-Confidence Tickets</p>
            <p className="text-xs text-[#5A554F] mt-0.5">Immediately escalate when AI confidence drops below threshold</p>
          </div>
          <Toggle
            value={policies.auto_escalate_enabled}
            onChange={v => setPolicies(p => p ? { ...p, auto_escalate_enabled: v } : p)}
          />
        </div>

        {/* Max response time */}
        <div className="px-6 py-5 flex items-center justify-between gap-8">
          <div className="flex-1">
            <p className="font-medium text-[#1C1815] text-sm">Max Response Time (hours)</p>
            <p className="text-xs text-[#5A554F] mt-0.5">SLA target — tickets open longer than this are flagged</p>
          </div>
          <input
            type="number" min={1} max={168}
            value={policies.max_response_time_hours}
            onChange={e => setPolicies(p => p ? { ...p, max_response_time_hours: parseInt(e.target.value) || 24 } : p)}
            className="w-24 px-3 py-2 border border-[#E3DDD4] rounded-lg text-sm text-right focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] outline-none"
          />
        </div>

        {/* Welcome message */}
        <div className="px-6 py-5 space-y-2">
          <p className="font-medium text-[#1C1815] text-sm">Chat Welcome Message</p>
          <p className="text-xs text-[#5A554F]">Shown at the start of every customer chat session</p>
          <textarea
            rows={3}
            value={policies.welcome_message ?? ""}
            onChange={e => setPolicies(p => p ? { ...p, welcome_message: e.target.value } : p)}
            placeholder="Hi! How can we help you today?"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDD4] text-sm focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] outline-none resize-none"
          />
        </div>
      </motion.div>

      {policies.updated_at && (
        <p className="text-xs text-[#9E9890]">Last updated: {new Date(policies.updated_at).toLocaleString()}</p>
      )}
    </div>
  )
}
