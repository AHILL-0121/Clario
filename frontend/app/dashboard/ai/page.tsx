"use client"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Loader2, Bot, User, Zap } from "lucide-react"
import { aiApi } from "@/lib/api"
import { cn, sentimentLabel } from "@/lib/utils"

interface ChatMsg {
  role: "user" | "ai"
  content: string
  intent?: string
  sentiment?: number
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "ai", content: "Hi! I'm your AI support assistant. Ask me anything or test the AI engine with a customer query." },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput("")
    setMessages((m) => [...m, { role: "user", content: userMsg }])
    setLoading(true)
    try {
      const res = await aiApi.chat(userMsg)
      setMessages((m) => [
        ...m,
        { role: "ai", content: res.data.response, intent: res.data.intent, sentiment: res.data.sentiment },
      ])
    } catch {
      setMessages((m) => [...m, { role: "ai", content: "⚠️ AI service unavailable. Please ensure Ollama is running." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-h-[800px]">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E9890] mb-1">Agent + Above · Sandbox</p>
        <h1 className="font-display text-4xl text-[#1C1815] flex items-center gap-2">
          <Zap className="h-6 w-6 text-[#5A876C]" /> AI Chat
        </h1>
        <p className="text-[#5A554F] text-sm mt-1">Test the LLaMA 3.1 + RAG engine directly</p>
      </div>

      {/* Messages */}
      <div className="flex-1 meridian-card p-4 overflow-y-auto space-y-4 mb-4 bg-[#F4F0E8]">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
            >
              <div className={cn("p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0",
                msg.role === "ai" ? "bg-[#ECF2EE] border border-[#CFE0D5]" : "bg-[#F4F0E8] border border-[#E3DDD4]"
              )}>
                {msg.role === "ai" ? <Bot className="h-4 w-4 text-[#5A876C]" /> : <User className="h-4 w-4 text-[#5A554F]" />}
              </div>
              <div className={cn("max-w-[75%] space-y-1", msg.role === "user" ? "items-end" : "")}>
                <div className={cn("px-4 py-3 rounded-xl text-sm leading-relaxed",
                  msg.role === "ai" ? "bg-white border border-[#E3DDD4] text-[#1C1815]" : "bg-[#1C1815] border border-[#1C1815] text-[#F4F0E8]"
                )}>
                  {msg.content}
                </div>
                {msg.intent && (
                  <div className="flex gap-2 text-xs">
                    <span className="text-[#5A554F]">Intent: <span className="text-[#C8412D] font-medium">{msg.intent}</span></span>
                    {msg.sentiment !== undefined && (
                      <span className={sentimentLabel(msg.sentiment).color}>
                        {sentimentLabel(msg.sentiment).label} ({msg.sentiment.toFixed(2)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-[#ECF2EE] border border-[#CFE0D5]">
              <Bot className="h-4 w-4 text-[#5A876C]" />
            </div>
            <div className="bg-white border border-[#E3DDD4] px-4 py-3 rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-[#5A876C]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="meridian-card flex items-center gap-3 px-4 py-3">
        <input
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9E9890]"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="bg-[#C8412D] hover:bg-[#B43A28] disabled:opacity-40 p-2 rounded-lg transition-colors"
        >
          <Send className="h-4 w-4 text-[#F4F0E8]" />
        </button>
      </div>
    </div>
  )
}
