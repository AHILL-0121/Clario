"use client"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

interface KBEntry {
  id: string
  title: string
  content: string
  source_type: string
  created_at: string
  updated_at: string
}

export default function KBPage() {
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }

  const [entries, setEntries] = useState<KBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", content: "" })
  const [error, setError] = useState("")

  useEffect(() => {
    axios.get(`${API}/api/tenant-admin/kb`, { headers })
      .then(r => setEntries(r.data))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await axios.post(`${API}/api/tenant-admin/kb`, form, { headers })
      setEntries(prev => [res.data, ...prev])
      setForm({ title: "", content: "" })
      setShowForm(false)
    } catch {
      setError("Failed to save entry.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await axios.delete(`${API}/api/tenant-admin/kb/${id}`, { headers })
      setEntries(prev => prev.filter(e => e.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Owner + Manager · RAG brain</p>
          <h1 className="font-display text-4xl text-[#1C1815] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#5A876C]" /> Knowledge Base
          </h1>
          <p className="text-sm text-[#5A554F] mt-1">Articles your AI uses to answer customer queries</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C8412D] text-[#F4F0E8] rounded-xl text-sm font-medium hover:bg-[#B43A28] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Article
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate}
          className="meridian-card p-6 space-y-4"
        >
          <h2 className="font-semibold text-[#1C1815]">New Knowledge Base Article</h2>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Article title…"
            className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDD4] text-sm focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] outline-none"
          />
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Article content…"
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl border border-[#E3DDD4] text-sm focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] outline-none resize-none"
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setError("") }}
              className="px-4 py-2 text-sm text-[#5A554F] hover:text-[#1C1815] border border-[#E3DDD4] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#C8412D] text-[#F4F0E8] rounded-xl text-sm font-medium hover:bg-[#B43A28] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Article
            </button>
          </div>
        </motion.form>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-7 w-7 animate-spin text-[#C8412D]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="meridian-card p-12 text-center">
          <BookOpen className="h-10 w-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">No articles yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="meridian-card p-5 flex gap-4"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#1C1815] truncate">{entry.title}</h3>
                <p className="text-sm text-[#5A554F] mt-1 line-clamp-2">{entry.content}</p>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  {entry.source_type} · {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="text-[#D1D5DB] hover:text-[#DC2626] transition-colors disabled:opacity-40 flex-shrink-0"
              >
                {deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
