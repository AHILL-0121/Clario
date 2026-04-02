"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowRight, Link2 } from "lucide-react"

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export default function StartChatPage() {
  const router = useRouter()

  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [orderReference, setOrderReference] = useState("")
  const [issueSummary, setIssueSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function createRoom(e: FormEvent) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch(`${BACKEND}/api/ai/public/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim(),
          order_reference: orderReference.trim() || null,
          issue_summary: issueSummary.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || `Unable to start chat (HTTP ${res.status})`)
      }

      const data = await res.json()
      const roomId = data?.room_id as string | undefined
      if (!roomId) throw new Error("Room link was not generated")

      router.push(`/chat/${roomId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start chat")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FDFCF9 0%, #F4F0E8 100%)" }}>
      <header className="border-b border-[#E3DDD4] bg-[#FDFCF9EE] backdrop-blur-md px-6 py-4">
        <Link href="/" className="text-sm text-[#5A554F] hover:text-[#1C1815] transition-colors">
          {"<- Back to home"}
        </Link>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-white border border-[#E3DDD4] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} className="text-[#C8412D]" />
            <p className="text-sm font-semibold text-[#1C1815]">Start Support Chat</p>
          </div>

          <p className="text-sm text-[#5A554F] mb-5">
            We create a permanent chat room link at the start. Your room stays active until your ticket is resolved.
          </p>

          <form onSubmit={createRoom} className="space-y-3">
            <div>
              <label className="block text-xs text-[#5A554F] mb-1">Your name *</label>
              <input
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#C8412D33]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#5A554F] mb-1">Email address *</label>
              <input
                required
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#C8412D33]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#5A554F] mb-1">Order / AWB / Invoice (optional)</label>
              <input
                value={orderReference}
                onChange={(e) => setOrderReference(e.target.value)}
                placeholder="e.g. AWB#SR9901"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#C8412D33]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#5A554F] mb-1">Issue summary (optional)</label>
              <input
                value={issueSummary}
                onChange={(e) => setIssueSummary(e.target.value)}
                placeholder="Briefly describe your issue"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#C8412D33]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#8B2E1E] bg-[#FEF0EE] border border-[#E9B9B0] rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl text-sm font-medium text-white px-4 py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C8412D 0%, #B43A28 100%)" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {loading ? "Creating room..." : "Start chat"}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
