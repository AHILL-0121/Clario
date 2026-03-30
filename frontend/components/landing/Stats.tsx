"use client"

import { useEffect, useMemo, useRef, useState } from "react"

const STATS = [
  { target: 58, label: "Automation Rate", suffix: "%", icon: "🤖" },
  { target: 5, label: "Avg First Response", suffix: "s", icon: "⚡" },
  { target: 2, label: "CRM Sync Latency", suffix: "s", icon: "🔄" },
  { target: 94, label: "Customer Satisfaction", suffix: "%", icon: "⭐" },
]

export default function Stats() {
  const [started, setStarted] = useState(false)
  const [values, setValues] = useState<number[]>(STATS.map(() => 0))
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStarted(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.25 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const duration = 700
    const start = performance.now()

    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValues(STATS.map((s) => Math.round(s.target * eased)))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [started])

  const displayValues = useMemo(
    () => values.map((v, i) => `${v}${STATS[i].suffix}`),
    [values]
  )

  return (
    <section ref={sectionRef} className="py-16 bg-[#1C1815] border-y border-[#2A2420] reveal" data-stagger="2">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-4xl font-medium text-[#F4F0E8] mb-1">{displayValues[i]}</div>
              <div className="text-sm text-[#9E9890] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
