"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, ImagePlus, Camera, X, CheckCircle, Mail, LogOut } from "lucide-react"
import PublicCursor from "@/components/landing/PublicCursor"

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  image?: string   // base64 data-URL
  timestamp: Date
}

// Use window casts so we never re-declare browser globals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const QUICK_REPLIES = [
  "How do I track my shipment?",
  "My parcel was marked delivered but not received",
  "What is the COD remittance schedule?",
  "How do I raise a damage claim?",
]

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState("")
  const [loading, setLoading]       = useState(false)
  const [sessionId]                 = useState<string>(genId)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingImageName, setPendingImageName] = useState<string>("")

  // Inquiry submit form state
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [submitEmail, setSubmitEmail]       = useState("")
  const [submitOrderRef, setSubmitOrderRef] = useState("")
  const [submitLoading, setSubmitLoading]   = useState(false)
  const [submitted, setSubmitted]           = useState(false)
  const [submittedMsg, setSubmittedMsg]     = useState("")

  // Exit chat modal state
  const [showExitModal, setShowExitModal]   = useState(false)
  const [exitEmail, setExitEmail]           = useState("")
  const [exitOrderRef, setExitOrderRef]     = useState("")
  const [exitLoading, setExitLoading]       = useState(false)

  // Count user turns to decide when to show submit panel
  const [userTurns, setUserTurns] = useState(0)

  // STT
  const [listening, setListening]   = useState(false)
  const [sttSupported, setSttSupported] = useState(false)
  const recognitionRef = useRef<AnyRec>(null)

  // TTS
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const cameraRef  = useRef<HTMLInputElement>(null)

  // â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    setMessages([{
      id: "greeting",
      role: "assistant",
      content: "👋 Welcome to SwiftRoute Logistics Support! I'm your AI assistant — available 24/7.\n\nI can help you track shipments, raise claims, understand our COD or customs policies, and more.\n\nHow can I help you today?",
      timestamp: new Date(),
    }])
    setTimeout(() => inputRef.current?.focus(), 100)

    try {
      const w = window as AnyRec
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
      if (SR) {
        setSttSupported(true)
        const rec = new SR()
        rec.lang = "en-US"
        rec.interimResults = false
        rec.continuous = false
        rec.onresult = (e: AnyRec) => {
          const transcript: string = e.results[e.results.length - 1][0].transcript
          setInput((prev) => prev ? prev + " " + transcript : transcript)
        }
        rec.onerror = () => setListening(false)
        rec.onend   = () => setListening(false)
        recognitionRef.current = rec
      }
    } catch { /* STT unavailable */ }

    return () => {
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    }
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, showSubmitForm])

  // â”€â”€ STT toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function toggleMic() {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      try { recognitionRef.current.start(); setListening(true) }
      catch { setListening(false) }
    }
  }

  // â”€â”€ TTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function speak(msg: Message) {
    if (!window.speechSynthesis) return
    if (speakingId === msg.id) {
      window.speechSynthesis.cancel(); setSpeakingId(null); return
    }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(msg.content)
    utt.lang = "en-US"; utt.rate = 1.0
    utt.onend = () => setSpeakingId(null)
    setSpeakingId(msg.id)
    window.speechSynthesis.speak(utt)
  }

  // â”€â”€ Image handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleImageFile = useCallback((file: File | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPendingImage(e.target?.result as string)
      setPendingImageName(file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  // â”€â”€ Send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function send(e?: React.FormEvent, quickReply?: string) {
    e?.preventDefault()
    const text = (quickReply ?? input).trim()
    if ((!text && !pendingImage) || loading || submitted) return
    if (!quickReply) setInput("")
    if (listening) { recognitionRef.current?.stop(); setListening(false) }

    const userMsg: Message = {
      id: genId(), role: "user",
      content: text || (pendingImage ? "📎 [Image attached]" : ""),
      image: pendingImage ?? undefined,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setPendingImage(null); setPendingImageName("")
    setLoading(true)
    setUserTurns((n) => n + 1)

    try {
      const payload: Record<string, string> = {
        message: text || "I attached an image, can you help?",
        session_id: sessionId,
      }
      if (userMsg.image) payload.image_base64 = userMsg.image

      const res = await fetch(`${BACKEND}/api/ai/public/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Check if AI is asking for email (escalation signal)
      const reply: string = data.response ?? ""
      setMessages((prev) => [...prev, {
        id: genId(), role: "assistant", content: reply, timestamp: new Date(),
      }])

      // Only show the submit panel when the AI is explicitly asking for the customer's
      // email to hand off to a specialist — these phrases only appear in STEP 4b of the
      // system prompt (genuine escalation), not in normal informational responses.
      const r = reply.toLowerCase()
      const askingForEmail = r.includes("share your email address") || r.includes("provide your email address")
      const escalationContext = r.includes("senior team") || r.includes("specialist team") || r.includes("reach out to you")
      if (askingForEmail || (r.includes("email") && escalationContext)) {
        setShowSubmitForm(true)
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: genId(), role: "assistant",
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  // â”€â”€ Submit inquiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault()
    if (!submitEmail.trim() || submitLoading) return
    setSubmitLoading(true)

    // Build a one-line summary from the first few user messages
    const userMessages = messages.filter(m => m.role === "user").map(m => m.content)
    const summary = userMessages[0]?.slice(0, 120) || "Web chat inquiry"

    try {
      const res = await fetch(`${BACKEND}/api/ai/public/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          customer_email: submitEmail.trim(),
          customer_name: "Web Visitor",
          order_reference: submitOrderRef.trim() || null,
          issue_summary: summary,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSubmitted(true)
      setShowSubmitForm(false)
      setSubmittedMsg(data.message ?? "Your inquiry has been logged. We will contact you shortly.")

      // Add a closing message from AI
      setMessages((prev) => [...prev, {
        id: genId(), role: "assistant",
        content: `✅ Your inquiry has been saved and our team has been notified.\n\nWe will contact you at **${submitEmail.trim()}** within 4 hours — via email or this web chat.\n\nThank you for reaching out to SwiftRoute Logistics. Have a great day! 😊`,
        timestamp: new Date(),
      }])
    } catch {
      alert("Something went wrong saving your inquiry. Please try again.")
    } finally {
      setSubmitLoading(false)
    }
  }

  function fmt(d: Date) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // ── Exit chat ──────────────────────────────────────────────────────────────
  async function exitChat(e: React.FormEvent) {
    e.preventDefault()
    if (exitLoading) return
    setExitLoading(true)

    const userMessages = messages.filter(m => m.role === "user").map(m => m.content)
    const summary = userMessages[0]?.slice(0, 120) || "Web chat session"

    // If there are no real user messages yet, just go home
    if (userMessages.length === 0) {
      router.push("/")
      return
    }

    try {
      await fetch(`${BACKEND}/api/ai/public/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          customer_email: exitEmail.trim() || "anonymous@swiftroute.chat",
          customer_name: "Web Visitor",
          order_reference: exitOrderRef.trim() || null,
          issue_summary: summary,
        }),
      })
    } catch {
      // Best-effort — still navigate away even if save fails
    } finally {
      router.push("/")
    }
  }

  return (
    <>
    <div className="min-h-screen flex flex-col cursor-target" style={{ background: "linear-gradient(135deg, #FDFCF9 0%, #F4F0E8 100%)" }}>
      <PublicCursor />

      {/* â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#E3DDD4] bg-[#FDFCF9EE] backdrop-blur-md sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#5A554F] hover:text-[#1C1815] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>

        <div className="flex items-center gap-3 ml-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm bg-[#1C1815] text-[#F4F0E8]">
            C
          </div>
          <div>
            <p className="font-semibold text-[#1C1815] text-sm leading-none">Clario Support</p>
            <p className="text-xs text-[#1E6E4E] mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E4E] inline-block" />
              Online · Typically replies instantly
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#FEF0EE] text-[#C8412D] border border-[#E9B9B0] font-medium">
            Powered by LLaMA 3.1
          </span>
          {!submitted && (
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#E3DDD4] bg-white text-[#5A554F] hover:text-[#C8412D] hover:border-[#E9B9B0] hover:bg-[#FEF0EE] transition-colors"
            >
              <LogOut size={13} />
              Exit chat
            </button>
          )}
        </div>
      </header>

      {/* â”€â”€ Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 shadow-sm bg-[#ECF2EE] text-[#5A876C]"
                style={{ border: "1px solid #CFE0D5" }}>
                C
              </div>
            )}

            <div className={`flex flex-col max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.image && (
                <img src={m.image} alt="attachment"
                  className="mb-1 rounded-xl max-w-[240px] max-h-[200px] object-cover shadow border border-white/30" />
              )}
              {m.content && (
                <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl shadow-sm whitespace-pre-line"
                  style={
                    m.role === "user"
                      ? { background: "#FEF0EE", color: "#8B2E1E", border: "1px solid #E9B9B0", borderBottomRightRadius: 4 }
                      : { background: "#fff", color: "#1C1815", border: "1px solid #E3DDD4", borderBottomLeftRadius: 4 }
                  }
                >
                  {m.content}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-[#9E9890]">{fmt(m.timestamp)}</span>
                {m.role === "assistant" && (
                  <button onClick={() => speak(m)} title={speakingId === m.id ? "Stop" : "Read aloud"}
                    className="text-[#9E9890] hover:text-[#5A876C] transition-colors">
                    {speakingId === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ background: "#ECF2EE", border: "1px solid #CFE0D5", color: "#5A876C" }}>C</div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E3DDD4] flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* â”€â”€ Submit inquiry panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {showSubmitForm && !submitted && (
          <div className="rounded-2xl border border-[#E9B9B0] bg-[#FEF0EE] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Mail size={16} className="text-[#C8412D]" />
              <p className="text-sm font-semibold text-[#8B2E1E]">Connect with our specialist team</p>
            </div>
            <p className="text-xs text-[#5A554F] mb-4">
              Our team will review this conversation and contact you via <strong>email or web chat</strong> within 4 hours.
            </p>
            <form onSubmit={submitInquiry} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Your email address *</label>
                <input
                  type="email" required
                  value={submitEmail}
                  onChange={(e) => setSubmitEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#C8412D33] bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order / AWB / Invoice number (optional)</label>
                <input
                  type="text"
                  value={submitOrderRef}
                  onChange={(e) => setSubmitOrderRef(e.target.value)}
                  placeholder="e.g. AWB#SR9901 or INV-441"
                  className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#C8412D33] bg-white"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={!submitEmail.trim() || submitLoading}
                  className="flex-1 text-sm font-medium py-2 rounded-xl text-white transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #C8412D 0%, #B43A28 100%)" }}>
                  {submitLoading ? "Saving…" : "Submit inquiry"}
                </button>
                <button type="button" onClick={() => setShowSubmitForm(false)}
                  className="px-4 text-sm text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 bg-white">
                  Not now
                </button>
              </div>
            </form>
          </div>
        )}

        {/* â”€â”€ Submitted confirmation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {submitted && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Inquiry submitted</p>
              <p className="text-xs text-emerald-700 mt-0.5">{submittedMsg}</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* â”€â”€ Quick replies (first turn only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {messages.length === 1 && !loading && (
        <div className="max-w-2xl mx-auto w-full px-4 pb-3">
          <p className="text-xs text-slate-400 mb-2 font-medium">Common queries</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button key={q} onClick={() => send(undefined, q)}
                className="text-xs px-3 py-1.5 rounded-full border border-[#CFE0D5] text-[#5A876C] bg-white hover:bg-[#ECF2EE] transition-colors shadow-sm">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ Input area â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">

        {/* Pending image preview */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="relative">
              <img src={pendingImage} alt="pending"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
              <button type="button" onClick={() => { setPendingImage(null); setPendingImageName("") }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shadow"
                title="Remove image"><X size={10} /></button>
            </div>
            <span className="text-xs text-slate-500 truncate max-w-[160px]">{pendingImageName}</span>
          </div>
        )}

        {/* STT listening indicator */}
        {listening && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-medium">Listening… speak now</span>
          </div>
        )}

        {submitted ? (
          /* Closed state */
          <div className="text-center py-4">
            <p className="text-sm text-slate-500">This conversation has been saved.</p>
            <Link href="/"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline">← Back to home</Link>
          </div>
        ) : (
          <form onSubmit={send}
            className="flex items-center gap-2 bg-white border border-[#E3DDD4] rounded-2xl px-3 py-2.5 shadow-md">

            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)} />

            <button type="button" onClick={() => fileRef.current?.click()} title="Attach image"
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE] transition-colors flex-shrink-0 disabled:opacity-30">
              <ImagePlus size={17} />
            </button>
            <button type="button" onClick={() => cameraRef.current?.click()} title="Take photo"
              disabled={loading}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE] transition-colors flex-shrink-0 disabled:opacity-30">
              <Camera size={17} />
            </button>

            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={listening ? "Listening…" : "Type your question…"}
              disabled={loading}
              className="flex-1 text-sm outline-none text-slate-800 placeholder-slate-400 bg-transparent disabled:opacity-50 min-w-0" />

            <button type="button"
              onClick={sttSupported ? toggleMic : undefined}
              title={!sttSupported ? "Voice input requires Chrome or Edge" : listening ? "Stop listening" : "Speak your message"}
              disabled={loading || !sttSupported}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
                !sttSupported ? "text-slate-300 cursor-not-allowed"
                : listening ? "bg-[#FEF0EE] text-[#C8412D] hover:bg-[#FBD9D3]"
                : "text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE]"
              }`}>
              {listening ? <MicOff size={17} /> : <Mic size={17} />}
            </button>

            <button type="submit" disabled={(!input.trim() && !pendingImage) || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105 active:scale-95 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #C8412D 0%, #B43A28 100%)" }} aria-label="Send">
              {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </form>
        )}

        {!submitted && (
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-[10px] text-slate-400">
              Powered by SwiftRoute Logistics · LLaMA 3.1 · Web chat & email support only
            </p>
            {userTurns >= 2 && !showSubmitForm && (
              <button onClick={() => setShowSubmitForm(true)}
                className="text-[10px] text-[#5A876C] hover:underline">
                Need a specialist? Submit inquiry →
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── Exit chat modal ────────────────────────────────────────────── */}
    {showExitModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LogOut size={16} className="text-slate-600" />
              <p className="font-semibold text-slate-800 text-sm">Save &amp; exit chat</p>
            </div>
            <button onClick={() => setShowExitModal(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your conversation will be saved as a support ticket. Our team can review it and
            follow up with you if needed.
          </p>

          <form onSubmit={exitChat} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Your email address <span className="text-slate-400">(optional — for follow-up)</span>
              </label>
              <input
                type="email"
                value={exitEmail}
                onChange={(e) => setExitEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#C8412D33] bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Order / AWB / Invoice number <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={exitOrderRef}
                onChange={(e) => setExitOrderRef(e.target.value)}
                placeholder="e.g. AWB#SR9901"
                className="w-full text-sm border border-[#E3DDD4] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#C8412D33] bg-white"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={exitLoading}
                className="flex-1 text-sm font-medium py-2 rounded-xl text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #1C1815 0%, #2A2420 100%)" }}
              >
                {exitLoading
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><LogOut size={13} /> Save &amp; exit</>
                }
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 text-sm text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
