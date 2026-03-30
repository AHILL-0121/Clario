"use client"

// Minimal toast hook using a simple event emitter pattern.
// For production, replace with full sonner/react-hot-toast integration.

type ToastOptions = { title: string; description?: string; variant?: "default" | "destructive" }

const listeners: Array<(opts: ToastOptions) => void> = []

export function toast(opts: ToastOptions) {
  listeners.forEach((l) => l(opts))
  // Fallback: browser console
  console.log(`[Toast] ${opts.title}${opts.description ? ` – ${opts.description}` : ""}`)
}

export function onToast(fn: (opts: ToastOptions) => void) {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx > -1) listeners.splice(idx, 1)
  }
}
