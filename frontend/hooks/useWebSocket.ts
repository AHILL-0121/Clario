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
  const onMessageRef = useRef<Handler | undefined>(onMessage)
  const reconnectRef = useRef<NodeJS.Timeout | null>(null)
  const shouldReconnectRef = useRef(true)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!token) return
    const current = wsRef.current
    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      return
    }

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
        onMessageRef.current?.(parsed)
      } catch {
        // non-JSON pong
      }
    }

    ws.onclose = () => {
      console.log("[WS] disconnected – reconnecting in 3s")
      if (pingRef.current) clearInterval(pingRef.current)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (shouldReconnectRef.current) {
        reconnectRef.current = setTimeout(connect, 3_000)
      }
    }

    ws.onerror = (err) => console.error("[WS] error", err)
  }, [token])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      shouldReconnectRef.current = false
      if (pingRef.current) clearInterval(pingRef.current)
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  return wsRef
}
