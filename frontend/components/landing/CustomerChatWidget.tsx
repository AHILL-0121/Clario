"use client"

import { useEffect, useRef, useState } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function CustomerChatWidget() {
  const [mountedBubble, setMountedBubble] = useState(false)
  const [hoveringBubble, setHoveringBubble] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState<string>(genId)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Seed greeting after mount (no Date created during SSR)
  useEffect(() => {
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        content: "👋 Hi! I'm the AI support assistant. Ask me anything about our product — pricing, features, getting started — I'm happy to help!",
        timestamp: new Date(),
      },
    ])

    const timer = window.setTimeout(() => setMountedBubble(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])

  // Listen for navbar "Chat with us" button
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener("openChat", handler)
    return () => window.removeEventListener("openChat", handler)
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  async function sendMessage(e?: React.FormEvent, overrideText?: string) {
    e?.preventDefault()
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    if (!overrideText) setInput("")

    const userMsg: Message = { id: genId(), role: "user", content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`${BACKEND}/api/ai/public/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const botMsg: Message = {
        id: genId(),
        role: "assistant",
        content: data.response || "Sorry, I couldn't generate a response right now.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
      if (!open) setUnread((n) => n + 1)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function fmt(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      {/* ── Chat window ───────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col shadow-2xl rounded-2xl overflow-hidden transition-all duration-300"
          style={{ width: 360, height: 520, background: "#fff", border: "1px solid #E3DDD4" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{ background: "#1C1815" }}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#F4F0E820] text-base font-display">
              C
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm leading-none text-[#F4F0E8]">Clario Support</p>
              <p className="text-xs text-[#9E9890] mt-0.5">Typically replies instantly</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close chat"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="#F4F0E8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#F4F0E8" }}>
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5"
                    style={{ background: "#ECF2EE", color: "#5A876C" }}>
                    C
                  </div>
                )}
                <div className="flex flex-col max-w-[78%]">
                  <div
                    className="text-sm px-3 py-2 rounded-2xl leading-relaxed"
                    style={
                      m.role === "user"
                        ? { background: "#FEF0EE", color: "#8B2E1E", border: "1px solid #C8412D33", borderBottomRightRadius: 4 }
                        : { background: "#fff", color: "#1C1815", border: "1px solid #E3DDD4", borderBottomLeftRadius: 4 }
                    }
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-[#9E9890] mt-1 px-1">
                    {fmt(m.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
                  style={{ background: "#ECF2EE", color: "#5A876C" }}>
                  C
                </div>
                <div className="px-3 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E3DDD4] flex items-center gap-1 breathing">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "120ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "240ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-slate-100 bg-white">
              {["What's included in free plan?", "How does AI drafting work?", "Pricing details"].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(undefined, q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#5A876C55] text-[#5A876C] hover:bg-[#ECF2EE] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex items-center gap-2 px-3 py-3 border-t border-[#E3DDD4] bg-white"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#E3DDD4] outline-none focus:border-[#C8412D] focus:ring-2 focus:ring-[#C8412D22] transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: "#C8412D" }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 5.5L7 9"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating bubble button ─────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`group fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 ${
          mountedBubble ? "opacity-100 scale-100" : "opacity-0 scale-0"
        }`}
        onMouseEnter={() => setHoveringBubble(true)}
        onMouseLeave={() => setHoveringBubble(false)}
        style={{
          background: open ? "#5A554F" : "#1C1815",
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        aria-label={open ? "Close chat" : "Open support chat"}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="#F4F0E8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="font-display text-[#F4F0E8] text-[18px] leading-none">C</span>
        )}
        {/* Unread badge */}
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C8412D] text-[#F4F0E8] text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {!open && mountedBubble && (
        <div className={`fixed bottom-24 right-6 z-40 px-3 py-1.5 rounded-full bg-[#1C1815] text-[#F4F0E8] text-xs shadow-sm transition-all ${hoveringBubble ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
          Chat with us
        </div>
      )}
    </>
  )
}
