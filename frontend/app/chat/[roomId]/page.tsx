"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Send,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ImagePlus,
  Camera,
  X,
  LogOut,
  LifeBuoy,
  Paperclip,
} from "lucide-react"

type RoomStatus = "OPEN" | "AI_DRAFTED" | "WAITING_CUSTOMER" | "ESCALATED" | "CLOSED"
type SenderType = "customer" | "agent" | "ai" | "system"

interface RoomMeta {
  room_id: string
  ticket_id: string
  status: RoomStatus
  subject: string
  created_at: string
  is_resolved: boolean
  customer: {
    name: string
    email: string | null
  }
}

interface ApiRoomMessage {
  id: string
  sender: SenderType
  msg_type: "text" | "image" | "audio"
  content: string
  created_at: string
}

interface UiMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  msgType: "text" | "image" | "audio"
  image?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const QUICK_REPLIES = [
  "How do I track my shipment?",
  "My parcel was marked delivered but not received",
  "What is the COD remittance schedule?",
  "How do I raise a damage claim?",
]

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function PublicChatRoomPage() {
  const params = useParams()
  const router = useRouter()

  const roomIdParam = params?.roomId
  const roomId = useMemo(
    () => (Array.isArray(roomIdParam) ? roomIdParam[0] : (roomIdParam as string | undefined)),
    [roomIdParam]
  )

  const [room, setRoom] = useState<RoomMeta | null>(null)
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingImageName, setPendingImageName] = useState("")
  const [pendingMediaName, setPendingMediaName] = useState("")

  const [listening, setListening] = useState(false)
  const [sttSupported, setSttSupported] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const recognitionRef = useRef<AnyRec>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)

  const hasUserMessages = useMemo(() => messages.some((m) => m.role === "user"), [messages])

  const fetchRoom = useCallback(async () => {
    if (!roomId) return
    const res = await fetch(`${BACKEND}/api/ai/public/rooms/${roomId}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.detail || `Failed to load room (HTTP ${res.status})`)
    }
    const data = (await res.json()) as RoomMeta
    setRoom(data)
  }, [roomId])

  const fetchMessages = useCallback(async () => {
    if (!roomId) return
    const res = await fetch(`${BACKEND}/api/ai/public/rooms/${roomId}/messages`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.detail || `Failed to load messages (HTTP ${res.status})`)
    }

    const data = (await res.json()) as ApiRoomMessage[]
    const mapped: UiMessage[] = data
      .filter((m) => m.sender !== "system")
      .map((m) => ({
      id: m.id,
      role: m.sender === "customer" ? "user" : "assistant",
      content: m.content,
      timestamp: new Date(m.created_at),
      msgType: m.msg_type,
      }))

    if (mapped.length === 0) {
      mapped.push({
        id: "greeting-local",
        role: "assistant",
        content:
          "👋 Welcome to SwiftRoute Logistics Support! I'm your AI assistant — available 24/7.\n\n"
          + "I can help you track shipments, raise claims, understand our COD or customs policies, and more.\n\n"
          + "How can I help you today?",
        timestamp: new Date(),
        msgType: "text",
      })
    }

    setMessages(mapped)
  }, [roomId])

  useEffect(() => {
    if (!roomId) return
    let active = true

    async function boot() {
      setBootLoading(true)
      setError("")
      try {
        await Promise.all([fetchRoom(), fetchMessages()])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Unable to load chat room")
      } finally {
        if (active) setBootLoading(false)
      }
    }

    boot()

    const timer = window.setInterval(() => {
      fetchRoom().catch(() => undefined)
      fetchMessages().catch(() => undefined)
    }, 5000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [roomId, fetchRoom, fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading, notice, error])

  useEffect(() => {
    if (bootLoading) return
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [bootLoading])

  useEffect(() => {
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
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
        rec.onerror = () => setListening(false)
        rec.onend = () => setListening(false)
        recognitionRef.current = rec
      }
    } catch {
      // STT unavailable
    }

    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      try {
        window.speechSynthesis?.cancel()
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    if (!roomId) return

    const onBeforeUnload = () => {
      if (room?.status === "CLOSED") return
      const payload = JSON.stringify({ reason: "browser_closed" })
      navigator.sendBeacon(
        `${BACKEND}/api/ai/public/rooms/${roomId}/leave`,
        new Blob([payload], { type: "application/json" })
      )
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [roomId, room?.status])

  function toggleMic() {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setListening(true)
      } catch {
        setListening(false)
      }
    }
  }

  function speak(msg: UiMessage) {
    if (!window.speechSynthesis) return
    if (speakingId === msg.id) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(msg.content)
    utt.lang = "en-US"
    utt.rate = 1.0
    utt.onend = () => setSpeakingId(null)
    setSpeakingId(msg.id)
    window.speechSynthesis.speak(utt)
  }

  function handleImageFile(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPendingImage(e.target?.result as string)
      setPendingImageName(file.name)
      setPendingMediaName("")
    }
    reader.readAsDataURL(file)
  }

  function handleMediaFile(file: File | null) {
    if (!file) return
    if (file.type.startsWith("image/")) {
      handleImageFile(file)
      return
    }
    setPendingMediaName(file.name)
    setPendingImage(null)
    setPendingImageName("")
  }

  async function sendMessage(e?: FormEvent, quickReply?: string) {
    e?.preventDefault()
    if (!roomId || room?.status === "CLOSED" || loading) return

    const text = (quickReply ?? input).trim()
    if (!text && !pendingImage && !pendingMediaName) return

    if (!quickReply) setInput("")
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
    }

    setLoading(true)
    setError("")
    setNotice("")

    try {
      const fallbackText = pendingImage
        ? "I attached an image, please help me with it."
        : pendingMediaName
          ? `I uploaded media file: ${pendingMediaName}`
          : ""

      const outgoingText = text || fallbackText

      const res = await fetch(`${BACKEND}/api/ai/public/rooms/${roomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoingText,
          image_base64: pendingImage || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || `Failed to send message (HTTP ${res.status})`)
      }

      const data = await res.json()
      if (data?.mode === "human_support" || data?.status === "ESCALATED") {
        setNotice(data?.response || data?.message || "Human support handoff in progress.")
      }

      setPendingImage(null)
      setPendingImageName("")
      setPendingMediaName("")

      await Promise.all([fetchRoom(), fetchMessages()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message")
    } finally {
      setLoading(false)
    }
  }

  async function connectHumanSupport() {
    if (!roomId || handoffLoading || room?.status === "CLOSED") return
    setHandoffLoading(true)
    setError("")

    try {
      const res = await fetch(`${BACKEND}/api/ai/public/rooms/${roomId}/connect-human`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.detail || `Failed to request human support (HTTP ${res.status})`)
      }

      const data = await res.json()
      setNotice(data?.message || "You are connected to human support.")
      await Promise.all([fetchRoom(), fetchMessages()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect human support")
    } finally {
      setHandoffLoading(false)
    }
  }

  async function leaveRoomNow() {
    if (!roomId) return
    try {
      await fetch(`${BACKEND}/api/ai/public/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "manual_exit" }),
      })
    } finally {
      router.push("/")
    }
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FDFCF9 0%, #F4F0E8 100%)" }}>
        <div className="flex items-center gap-2 text-sm text-[#5A554F]">
          <Loader2 size={16} className="animate-spin" />
          Loading chat room...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #FDFCF9 0%, #F4F0E8 100%)" }}>
      <header className="flex items-center gap-4 px-6 py-4 border-b border-[#E3DDD4] bg-[#FDFCF9EE] backdrop-blur-md sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-sm text-[#5A554F] hover:text-[#1C1815] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to home
        </Link>

        <div className="flex items-center gap-3 ml-2 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shadow-sm bg-[#1C1815] text-[#F4F0E8]">C</div>
          <div className="min-w-0">
            <p className="font-semibold text-[#1C1815] text-sm leading-none truncate">Clario Support</p>
            <p className="text-xs text-[#1E6E4E] mt-0.5 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6E4E] inline-block" />
              Room {roomId}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#FEF0EE] text-[#C8412D] border border-[#E9B9B0] font-medium">
            Powered by LLaMA 3.1
          </span>

          {room?.status !== "CLOSED" && room?.status !== "ESCALATED" && (
            <button
              onClick={connectHumanSupport}
              disabled={handoffLoading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#E9B9B0] bg-[#FEF0EE] text-[#C8412D] hover:bg-[#FBD9D3] transition-colors disabled:opacity-60"
            >
              {handoffLoading ? <Loader2 size={13} className="animate-spin" /> : <LifeBuoy size={13} />}
              Connect human support
            </button>
          )}

          <button
            onClick={leaveRoomNow}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[#E3DDD4] bg-white text-[#5A554F] hover:text-[#1C1815] transition-colors"
          >
            <LogOut size={13} />
            Exit chat
          </button>
        </div>
      </header>

      {room?.status === "ESCALATED" && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <div className="rounded-xl border border-[#E9B9B0] bg-[#FEF0EE] px-3 py-2 text-xs text-[#8B2E1E]">
            Human support is handling this chat. This room remains active until resolution.
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <div className="rounded-xl border border-[#E9B9B0] bg-[#FEF0EE] px-3 py-2 text-xs text-[#8B2E1E]">{error}</div>
        </div>
      )}

      {notice && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-3">
          <div className="rounded-xl border border-[#E3DDD4] bg-white px-3 py-2 text-xs text-[#5A554F]">{notice}</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 shadow-sm bg-[#ECF2EE] text-[#5A876C]"
                style={{ border: "1px solid #CFE0D5" }}
              >
                C
              </div>
            )}

            <div className={`flex flex-col max-w-[80%] ${m.role === "user" ? "items-end" : "items-start"}`}>
              {m.image && <img src={m.image} alt="attachment" className="mb-1 rounded-xl max-w-[240px] max-h-[200px] object-cover shadow border border-white/30" />}

              <div
                className="text-sm leading-relaxed px-4 py-3 rounded-2xl shadow-sm whitespace-pre-line"
                style={
                  m.role === "user"
                    ? { background: "#FEF0EE", color: "#8B2E1E", border: "1px solid #E9B9B0", borderBottomRightRadius: 4 }
                    : { background: "#fff", color: "#1C1815", border: "1px solid #E3DDD4", borderBottomLeftRadius: 4 }
                }
              >
                {m.msgType !== "text" && m.role === "assistant" ? `Attachment note:\n${m.content}` : m.content}
              </div>

              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-[#9E9890]">{fmt(m.timestamp)}</span>
                {m.role === "assistant" && (
                  <button onClick={() => speak(m)} title={speakingId === m.id ? "Stop" : "Read aloud"} className="text-[#9E9890] hover:text-[#5A876C] transition-colors">
                    {speakingId === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!hasUserMessages && !loading && (
          <div className="pt-1">
            <p className="text-xs text-slate-400 mb-2 font-medium">Common queries</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(undefined, q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#CFE0D5] text-[#5A876C] bg-white hover:bg-[#ECF2EE] transition-colors shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: "#ECF2EE", border: "1px solid #CFE0D5", color: "#5A876C" }}>
              C
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-[#E3DDD4] flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-[#1E6E4E] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-6 pt-2 max-w-2xl mx-auto w-full">
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="relative">
              <img src={pendingImage} alt="pending" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null)
                  setPendingImageName("")
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center shadow"
                title="Remove image"
              >
                <X size={10} />
              </button>
            </div>
            <span className="text-xs text-slate-500 truncate max-w-[200px]">{pendingImageName}</span>
          </div>
        )}

        {pendingMediaName && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#E3DDD4] bg-white px-2 py-1 text-xs text-[#5A554F]">
              <Paperclip size={12} />
              <span className="truncate max-w-[220px]">{pendingMediaName}</span>
            </div>
            <button
              type="button"
              onClick={() => setPendingMediaName("")}
              className="text-xs text-[#9E9890] hover:text-[#5A554F]"
            >
              Remove
            </button>
          </div>
        )}

        {listening && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-medium">Listening... speak now</span>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-white border border-[#E3DDD4] rounded-2xl px-3 py-2.5 shadow-md">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)} />
          <input ref={mediaRef} type="file" accept="audio/*,video/*,application/pdf" className="hidden" onChange={(e) => handleMediaFile(e.target.files?.[0] ?? null)} />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Attach image"
            disabled={loading || room?.status === "CLOSED"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE] transition-colors flex-shrink-0 disabled:opacity-30"
          >
            <ImagePlus size={17} />
          </button>

          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            title="Take photo"
            disabled={loading || room?.status === "CLOSED"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE] transition-colors flex-shrink-0 disabled:opacity-30"
          >
            <Camera size={17} />
          </button>

          <button
            type="button"
            onClick={() => mediaRef.current?.click()}
            title="Upload media file"
            disabled={loading || room?.status === "CLOSED"}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE] transition-colors flex-shrink-0 disabled:opacity-30"
          >
            <Paperclip size={17} />
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={listening ? "Listening..." : room?.status === "CLOSED" ? "Ticket resolved" : "Type your message..."}
            disabled={loading || room?.status === "CLOSED"}
            className="flex-1 text-sm outline-none text-slate-800 placeholder-slate-400 bg-transparent disabled:opacity-50 min-w-0"
          />

          <button
            type="button"
            onClick={sttSupported ? toggleMic : undefined}
            title={!sttSupported ? "Voice input requires Chrome or Edge" : listening ? "Stop listening" : "Speak your message"}
            disabled={loading || !sttSupported || room?.status === "CLOSED"}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${
              !sttSupported
                ? "text-slate-300 cursor-not-allowed"
                : listening
                  ? "bg-[#FEF0EE] text-[#C8412D] hover:bg-[#FBD9D3]"
                  : "text-[#9E9890] hover:text-[#5A876C] hover:bg-[#ECF2EE]"
            }`}
          >
            {listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          <button
            type="submit"
            disabled={(!input.trim() && !pendingImage && !pendingMediaName) || loading || room?.status === "CLOSED"}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #C8412D 0%, #B43A28 100%)" }}
            aria-label="Send"
          >
            {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-slate-400">Powered by SwiftRoute Logistics · LLaMA 3.1 · Web chat room</p>
          {room?.status !== "CLOSED" && room?.status !== "ESCALATED" && (
            <button onClick={connectHumanSupport} className="text-[10px] text-[#5A876C] hover:underline" disabled={handoffLoading}>
              {"Connect to human support ->"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
