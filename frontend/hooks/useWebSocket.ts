"use client"
import { useEffect, useRef, useCallback } from "react"
import { useAuthStore } from "@/lib/store"

type WSEvent = { event: string; data: Record<string, unknown> }
type Handler = (payload: WSEvent) => void

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

export function useWebSocket(onMessage?: Handler) {
  const { token } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const pingRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!token) return
    const ws = new WebSocket(`${WS_BASE}/ws/connect?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[WS] connected")
      // Keep-alive ping every 30s
      pingRef.current = setInterval(() => ws.readyState === 1 && ws.send("ping"), 30_000)
    }

    ws.onmessage = (e) => {
      try {
        const parsed: WSEvent = JSON.parse(e.data)
        onMessage?.(parsed)
      } catch {
        // non-JSON pong
      }
    }

    ws.onclose = () => {
      console.log("[WS] disconnected – reconnecting in 3s")
      if (pingRef.current) clearInterval(pingRef.current)
      setTimeout(connect, 3_000)
    }

    ws.onerror = (err) => console.error("[WS] error", err)
  }, [token, onMessage])

  useEffect(() => {
    connect()
    return () => {
      if (pingRef.current) clearInterval(pingRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return wsRef
}
