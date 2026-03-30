"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import useSWR, { mutate } from "swr"
import axios from "axios"
import { User, Bot, Wrench, Send, Loader2, CheckCircle, AlertTriangle, Clock, MessageCircle } from "lucide-react"
import { cn, statusColor, timeAgo } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Public API calls (no authentication)
const publicApi = {
  getTicket: (token: string) => axios.get(`${API_URL}/api/tickets/shared/${token}`),
  getMessages: (token: string) => axios.get(`${API_URL}/api/tickets/shared/${token}/messages`),
  sendMessage: (token: string, content: string) =>
    axios.post(`${API_URL}/api/tickets/shared/${token}/messages`, {
      content,
      sender: "customer",
      msg_type: "text",
    }),
}

function statusIcon(s: string) {
  if (s === "CLOSED") return <CheckCircle size={14} className="text-[#1E6E4E]" />
  if (s === "ESCALATED") return <AlertTriangle size={14} className="text-[#C8412D]" />
  if (s === "WAITING_CUSTOMER") return <Clock size={14} className="text-[#5A876C]" />
  if (s === "AI_DRAFTED") return <Bot size={14} className="text-[#5A876C]" />
  return <div className="w-2 h-2 rounded-full bg-[#C8412D]" />
}

function senderLabel(sender: string) {
  if (sender === "customer") return { label: "You", color: "bg-[#FEF0EE] text-[#C8412D] border-[#E9B9B0]" }
  if (sender === "agent") return { label: "Support Agent", color: "bg-[#E8F5EF] text-[#1E6E4E] border-[#BBDDCB]" }
  if (sender === "ai") return { label: "AI Assistant", color: "bg-[#ECF2EE] text-[#5A876C] border-[#CFE0D5]" }
  return { label: "System", color: "bg-[#F4F0E8] text-[#5A554F] border-[#E3DDD4]" }
}

export default function PublicTicketPage() {
  const { token } = useParams<{ token: string }>()
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [escalationNotification, setEscalationNotification] = useState(false)

  const { data: ticket, isLoading: ticketLoading, error: ticketError } = useSWR(
    token ? ["public-ticket", token] : null,
    () => publicApi.getTicket(token).then((r) => r.data),
    { refreshInterval: 8000 }
  )

  const { data: messages, isLoading: msgsLoading } = useSWR(
    token ? ["public-messages", token] : null,
    () => publicApi.getMessages(token).then((r) => r.data),
    { refreshInterval: 5000 }
  )

  // Show escalation notification if status is ESCALATED
  useEffect(() => {
    if (ticket && ticket.status === "ESCALATED" && !escalationNotification) {
      setEscalationNotification(true)
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setEscalationNotification(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [ticket?.status])

  async function sendReply() {
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await publicApi.sendMessage(token, text)
      setReplyText("")
      mutate(["public-messages", token])
    } catch (error) {
      console.error("Failed to send message:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  if (ticketLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFCF9] to-[#ECF2EE] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#5A876C] mx-auto mb-4" size={36} />
          <p className="text-[#5A554F]">Loading your support ticket...</p>
        </div>
      </div>
    )
  }

  if (ticketError || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFCF9] to-[#ECF2EE] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full bg-[#FEF0EE] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-[#C8412D]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C1815] mb-2">Ticket Not Found</h1>
          <p className="text-[#5A554F]">
            The ticket link is invalid or has expired. Please check your email for the correct link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCF9] to-[#ECF2EE]">
      {/* Header */}
      <div className="bg-white border-b border-[#E3DDD4] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E6E4E] to-[#5A876C] flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-[#1C1815] truncate">{ticket.subject}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {statusIcon(ticket.status)}
                <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusColor(ticket.status))}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Banner */}
      {escalationNotification && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="meridian-card p-4 border-l-4 border-[#C8412D] bg-[#FEF0EE] flex items-start gap-3 animate-fade-in">
            <AlertTriangle size={20} className="text-[#C8412D] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-[#1C1815] mb-1">
                Your Request Has Been Escalated
              </h3>
              <p className="text-sm text-[#5A554F]">
                A support specialist is now reviewing your case and will respond shortly. Continue the conversation below.
              </p>
            </div>
            <button
              onClick={() => setEscalationNotification(false)}
              className="text-[#9E9890] hover:text-[#1C1815] flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="meridian-card bg-white shadow-lg">
          {/* Message Thread */}
          <div className="p-6 space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto">
            {msgsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-lg" />
                ))}
              </div>
            )}

            {!msgsLoading && (!messages || messages.length === 0) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#ECF2EE] flex items-center justify-center mx-auto mb-4">
                  <MessageCircle size={28} className="text-[#5A876C]" />
                </div>
                <p className="text-[#5A554F]">No messages yet. Start the conversation!</p>
              </div>
            )}

            {(messages ?? []).map((m: { id: string; sender: string; content: string; created_at: string }) => {
              const { label, color } = senderLabel(m.sender)
              const isCustomer = m.sender === "customer"

              return (
                <div key={m.id} className={cn("flex gap-3", isCustomer ? "justify-end" : "justify-start")}>
                  {!isCustomer && (
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                      m.sender === "agent" ? "bg-[#E8F5EF]" : "bg-[#ECF2EE]"
                    )}>
                      {m.sender === "agent" ? (
                        <Wrench size={14} className="text-[#1E6E4E]" />
                      ) : (
                        <Bot size={14} className="text-[#5A876C]" />
                      )}
                    </div>
                  )}

                  <div className={cn("max-w-[75%]", isCustomer ? "items-end" : "items-start", "flex flex-col")}>
                    <div className={cn("text-[10px] px-2 py-0.5 rounded-full border w-fit mb-1", color)}>
                      {label}
                    </div>
                    <div className={cn(
                      "text-sm px-4 py-3 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm",
                      isCustomer
                        ? "bg-[#1C1815] text-[#F4F0E8] rounded-br-sm"
                        : m.sender === "ai"
                        ? "bg-[#ECF2EE] border border-[#CFE0D5] text-[#3D5E4A] rounded-bl-sm"
                        : "bg-[#E8F5EF] border border-[#BBDDCB] text-[#1E6E4E] rounded-bl-sm"
                    )}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-[#9E9890] mt-1 px-1">{timeAgo(m.created_at)}</span>
                  </div>

                  {isCustomer && (
                    <div className="w-8 h-8 rounded-full bg-[#FEF0EE] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={14} className="text-[#C8412D]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Reply Box */}
          {ticket.status !== "CLOSED" ? (
            <div className="p-4 border-t border-[#E3DDD4] bg-[#FDFCF9]">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) sendReply() }}
                  placeholder="Type your message… (Ctrl+Enter to send)"
                  rows={3}
                  className="flex-1 text-sm resize-none border border-[#E3DDD4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A876C] bg-white"
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="self-end w-10 h-10 rounded-xl flex items-center justify-center bg-[#1E6E4E] text-white disabled:opacity-30 hover:bg-[#1A5D42] transition-colors shadow-md"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-[#9E9890] mt-2 text-center">
                Your messages are secure and will be seen by our support team
              </p>
            </div>
          ) : (
            <div className="p-6 border-t border-[#E3DDD4] bg-[#ECF2EE] text-center">
              <CheckCircle size={24} className="mx-auto mb-2 text-[#1E6E4E]" />
              <p className="text-sm font-medium text-[#1E6E4E]">This ticket has been resolved</p>
              <p className="text-xs text-[#5A554F] mt-1">Thank you for contacting support!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-[#9E9890]">
            This is a secure support conversation. Ticket ID: {String(ticket.id).slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  )
}
