"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { UserCog, Plus, UserX, Loader2 } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
}

const ROLE_BADGE: Record<string, string> = {
  manager: "bg-[#ECF2EE] text-[#5A876C] border border-[#CFE0D5]",
  agent:   "bg-[#E8F5EF] text-[#1E6E4E] border border-[#B8DACA]",
}

export default function TeamPage() {
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "agent" as "agent" | "manager" })

  useEffect(() => {
    axios.get(`${API}/api/tenant-admin/team`, { headers })
      .then(r => setMembers(r.data))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) { setError("All fields required."); return }
    setSaving(true); setError("")
    try {
      const res = await axios.post(`${API}/api/tenant-admin/team`, form, { headers })
      setMembers(prev => [...prev, res.data])
      setForm({ full_name: "", email: "", password: "", role: "agent" })
      setShowForm(false)
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? "Failed to create member.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      await axios.delete(`${API}/api/tenant-admin/team/${id}`, { headers })
      setMembers(prev => prev.map(m => m.id === id ? { ...m, is_active: false } : m))
    } finally {
      setRemovingId(null)
    }
  }

  const INPUT = "w-full px-4 py-2.5 rounded-xl border border-[#E5E7EB] text-sm focus:ring-2 focus:ring-[#2563EB] outline-none"
  const INPUT_MERIDIAN = "w-full px-4 py-2.5 rounded-xl border border-[#E3DDD4] text-sm focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] outline-none"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Owner + Tenant Admin</p>
          <h1 className="font-display text-4xl text-[#1C1815] flex items-center gap-2">
            <UserCog className="h-6 w-6 text-[#5A876C]" /> Team
          </h1>
          <p className="text-sm text-[#5A554F] mt-1">Add and manage agents and managers in your company</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C8412D] text-[#F4F0E8] rounded-xl text-sm font-medium hover:bg-[#B43A28] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="meridian-card p-6 space-y-4"
        >
          <h2 className="font-semibold text-[#1C1815]">New Team Member</h2>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <input className={INPUT_MERIDIAN} placeholder="Full name" value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            <input className={INPUT_MERIDIAN} placeholder="Email" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input className={INPUT_MERIDIAN} placeholder="Password (min 8 chars)" type="password" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            <select className={INPUT_MERIDIAN} value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as "agent" | "manager" }))}>
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); setError("") }}
              className="px-4 py-2 text-sm border border-[#E3DDD4] rounded-xl text-[#5A554F] hover:text-[#1C1815]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8412D] text-[#F4F0E8] rounded-xl text-sm font-medium hover:bg-[#B43A28] disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Member
            </button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin text-[#C8412D]" />
        </div>
      ) : (
        <div className="meridian-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F4F0E8] text-xs uppercase text-[#9E9890] tracking-wide">
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-center px-6 py-3">Role</th>
                <th className="text-center px-6 py-3">Status</th>
                <th className="text-center px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-[#FEF9F7] transition-colors">
                  <td className="px-6 py-4 font-medium text-[#1C1815]">{m.full_name}</td>
                  <td className="px-6 py-4 text-[#5A554F]">{m.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[m.role] ?? ""}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${m.is_active ? "bg-[#E8F5EF] text-[#1E6E4E] border border-[#B8DACA]" : "bg-[#F4F0E8] text-[#9E9890] border border-[#E3DDD4]"}`}>
                      {m.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {m.is_active && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removingId === m.id}
                        className="text-[#9E9890] hover:text-[#C8412D] transition-colors disabled:opacity-40"
                        title="Deactivate"
                      >
                        {removingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-[#6B7280]">No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
