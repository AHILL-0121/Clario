"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import Link from "next/link"
import { ArrowLeft, User, Bot, Wrench, Send, Loader2, CheckCircle, AlertTriangle, Clock, XCircle, Copy, ExternalLink } from "lucide-react"
import { ticketsApi, customersApi } from "@/lib/api"
import { cn, statusColor, timeAgo } from "@/lib/utils"
import { useAuthStore } from "@/lib/store"

const STATUS_OPTIONS = ["OPEN", "AI_DRAFTED", "WAITING_CUSTOMER", "ESCALATED", "CLOSED"]

function statusIcon(s: string) {
  if (s === "CLOSED") return <CheckCircle size={14} className="text-[#1E6E4E]" />
  if (s === "ESCALATED") return <AlertTriangle size={14} className="text-[#C8412D]" />
  if (s === "WAITING_CUSTOMER") return <Clock size={14} className="text-[#5A876C]" />
  if (s === "AI_DRAFTED") return <Bot size={14} className="text-[#5A876C]" />
  return <div className="w-2 h-2 rounded-full bg-[#C8412D]" />
}

function senderLabel(sender: string) {
  if (sender === "customer") return { label: "Customer", color: "bg-[#FEF0EE] text-[#C8412D] border-[#E9B9B0]" }
  if (sender === "agent") return { label: "Agent", color: "bg-[#E8F5EF] text-[#1E6E4E] border-[#BBDDCB]" }
  if (sender === "ai") return { label: "AI", color: "bg-[#ECF2EE] text-[#5A876C] border-[#CFE0D5]" }
  return { label: "System", color: "bg-[#F4F0E8] text-[#5A554F] border-[#E3DDD4]" }
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [useAiDraft, setUseAiDraft] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const user = useAuthStore((state) => state.user)
  const canManageTickets = user && ["owner", "manager", "tenant_admin"].includes(user.role)

  const { data: ticket, isLoading: ticketLoading } = useSWR(
    id ? ["ticket", id] : null,
    () => ticketsApi.get(id).then((r) => r.data),
    { refreshInterval: 8000 }
  )

  const { data: messages, isLoading: msgsLoading } = useSWR(
    id ? ["messages", id] : null,
    () => ticketsApi.messages(id).then((r) => r.data),
    { refreshInterval: 5000 }
  )

  const { data: customer } = useSWR(
    ticket?.customer_id ? ["customer", ticket.customer_id] : null,
    () => customersApi.get(ticket!.customer_id).then((r) => r.data)
  )

  async function sendReply() {
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await ticketsApi.addMessage(id, { sender: "agent", msg_type: "text", content: text })
      setReplyText("")
      setUseAiDraft(false)
      mutate(["messages", id])
    } finally {
      setSending(false)
    }
  }

  async function updateStatus(status: string) {
    setUpdating(true)
    try {
      await ticketsApi.update(id, { status })
      mutate(["ticket", id])
    } finally {
      setUpdating(false)
    }
  }

  function copyShareLink() {
    if (!ticket?.share_token) return
    const link = `${window.location.origin}/ticket/${ticket.share_token}`
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    })
  }

  function openShareLink() {
    if (!ticket?.share_token) return
    const link = `${window.location.origin}/ticket/${ticket.share_token}`
    window.open(link, '_blank')
  }

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <XCircle size={36} className="mx-auto text-red-400 mb-3" />
        <p className="text-muted-foreground">Ticket not found.</p>
        <Link href="/dashboard/tickets" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to tickets</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/tickets" className="mt-1 text-[#9E9890] hover:text-[#1C1815] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate text-[#1C1815]">{ticket.subject}</h1>
          <p className="text-xs text-[#9E9890] mt-0.5">
            {ticket.channel.replace("_", " ")} · created {timeAgo(ticket.created_at)}
          </p>
        </div>
        {/* Status selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusIcon(ticket.status)}
          <select
            value={ticket.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={updating}
            className="text-xs border border-[#E3DDD4] rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#C8412D33] disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-6">
        {/* Left — message thread */}
        <div className="space-y-4">
          <div className="meridian-card p-4 space-y-4 min-h-[300px] bg-[#FDFCF9]">
            {msgsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 rounded-lg" />
                ))}
              </div>
            )}

            {!msgsLoading && (!messages || messages.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
            )}

            {(messages ?? []).map((m: { id: string; sender: string; content: string; created_at: string }) => {
              const { label, color } = senderLabel(m.sender)
              return (
                <div key={m.id} className={cn("flex gap-3", m.sender === "customer" ? "justify-start" : "justify-end")}>
                  {m.sender === "customer" && (
                    <div className="w-7 h-7 rounded-full bg-[#FEF0EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={13} className="text-[#C8412D]" />
                    </div>
                  )}
                  <div className={cn("max-w-[75%]", m.sender === "customer" ? "items-start" : "items-end", "flex flex-col")}>
                    <div className={cn("text-[10px] px-2 py-0.5 rounded-full border w-fit mb-1", color)}>
                      {label}
                    </div>
                    <div className={cn(
                      "text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-line leading-relaxed",
                      m.sender === "customer"
                        ? "bg-white border border-[#E3DDD4] text-[#1C1815] rounded-tl-sm"
                        : m.sender === "ai"
                        ? "bg-[#ECF2EE] border border-[#CFE0D5] text-[#3D5E4A] rounded-tr-sm"
                        : m.sender === "system"
                        ? "bg-[#F4F0E8] border border-[#E3DDD4] text-[#5A554F] rounded-tr-sm text-xs"
                        : "bg-[#1C1815] text-[#F4F0E8] rounded-tr-sm"
                    )}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-[#9E9890] mt-1 px-1">{timeAgo(m.created_at)}</span>
                  </div>
                  {m.sender === "agent" && (
                    <div className="w-7 h-7 rounded-full bg-[#E8F5EF] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wrench size={13} className="text-[#1E6E4E]" />
                    </div>
                  )}
                  {m.sender === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-[#ECF2EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={13} className="text-[#5A876C]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* AI Draft banner */}
          {ticket.ai_draft && !useAiDraft && (
            <div className="meridian-card p-3 flex items-center gap-3 border-l-4 border-[#5A876C]">
              <Bot size={16} className="text-[#5A876C] flex-shrink-0" />
              <p className="text-xs text-[#5A554F] flex-1 truncate">
                <span className="font-medium text-[#1E6E4E]">AI draft ready</span> — click to use it as your reply
              </p>
              <button
                onClick={() => { setReplyText(ticket.ai_draft!); setUseAiDraft(true) }}
                className="text-xs text-[#5A876C] hover:underline whitespace-nowrap"
              >Use draft →</button>
            </div>
          )}

          {/* Reply box */}
          {ticket.status !== "CLOSED" && (
            <div className="meridian-card p-3 flex gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) sendReply() }}
                placeholder="Type your reply… (Ctrl+Enter to send)"
                rows={3}
                className="flex-1 text-sm resize-none border border-[#E3DDD4] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#C8412D33] bg-white"
              />
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
                className="self-end w-9 h-9 rounded-xl flex items-center justify-center bg-[#C8412D] text-[#F4F0E8] disabled:opacity-30 hover:bg-[#B43A28] transition-colors"
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          )}

          {ticket.status === "CLOSED" && (
            <p className="text-center text-xs text-muted-foreground py-2">This ticket is closed.</p>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="space-y-4">
          {/* Ticket info */}
            <div className="meridian-card p-4 space-y-3">
              <p className="text-xs font-semibold text-[#9E9890] uppercase tracking-wide">Ticket Info</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                  <span className="text-[#5A554F]">Status</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusColor(ticket.status))}>{ticket.status}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-[#5A554F]">Channel</span>
                <span className="capitalize">{ticket.channel.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-[#5A554F]">Frustration</span>
                  <span className={cn("font-medium", (ticket.frustration_score ?? 0) > 0.6 ? "text-[#C8412D]" : "text-[#1E6E4E]")}>
                  {((ticket.frustration_score ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                  <span className="text-[#5A554F]">Created</span>
                <span>{timeAgo(ticket.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Share Link (for managers/owners on escalated tickets) */}
          {canManageTickets && ticket.share_token && (
            <div className="meridian-card p-4 space-y-3">
              <p className="text-xs font-semibold text-[#9E9890] uppercase tracking-wide">Customer Access Link</p>
              <p className="text-xs text-[#5A554F]">
                Share this link with the customer to continue the conversation:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyShareLink}
                  className="flex-1 text-xs py-2 px-3 rounded-lg bg-[#ECF2EE] text-[#1E6E4E] border border-[#CFE0D5] hover:bg-[#DFE9E2] transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={12} />
                  {copySuccess ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={openShareLink}
                  className="text-xs py-2 px-3 rounded-lg bg-white text-[#5A876C] border border-[#E3DDD4] hover:bg-[#F4F0E8] transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
              <p className="text-[10px] text-[#9E9890] bg-[#F4F0E8] px-2 py-1 rounded">
                💡 This link was automatically sent to the customer's email when the ticket was escalated
              </p>
            </div>
          )}

          {/* Customer info */}
          {customer && (
            <div className="meridian-card p-4 space-y-3">
              <p className="text-xs font-semibold text-[#9E9890] uppercase tracking-wide">Customer</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ECF2EE] flex items-center justify-center">
                  <User size={14} className="text-[#5A876C]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{customer.full_name}</p>
                  {customer.is_vip && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FEF0EE] text-[#C8412D] border border-[#E9B9B0]">VIP</span>
                  )}
                </div>
              </div>
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="text-xs text-[#5A876C] hover:underline break-all block">
                  {customer.email}
                </a>
              )}
              {customer.phone && (
                <p className="text-xs text-[#9E9890]">{customer.phone}</p>
              )}
            </div>
          )}

          {/* Quick status actions */}
          <div className="meridian-card p-4 space-y-2">
            <p className="text-xs font-semibold text-[#9E9890] uppercase tracking-wide">Quick Actions</p>
            {ticket.status !== "CLOSED" && (
              <button
                onClick={() => updateStatus("CLOSED")}
                disabled={updating}
                className="w-full text-xs py-2 rounded-lg bg-[#E8F5EF] text-[#1E6E4E] border border-[#BBDDCB] hover:bg-[#D9EBE2] transition-colors disabled:opacity-50"
              >
                ✓ Mark as Resolved
              </button>
            )}
            {ticket.status !== "ESCALATED" && ticket.status !== "CLOSED" && (
              <button
                onClick={() => updateStatus("ESCALATED")}
                disabled={updating}
                className="w-full text-xs py-2 rounded-lg bg-[#FEF0EE] text-[#C8412D] border border-[#E9B9B0] hover:bg-[#FBD9D3] transition-colors disabled:opacity-50"
              >
                ↑ Escalate
              </button>
            )}
            {ticket.status === "CLOSED" && (
              <button
                onClick={() => updateStatus("OPEN")}
                disabled={updating}
                className="w-full text-xs py-2 rounded-lg bg-[#ECF2EE] text-[#5A876C] border border-[#CFE0D5] hover:bg-[#DFE9E2] transition-colors disabled:opacity-50"
              >
                ↺ Reopen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
