"use client"

import { useEffect } from "react"

export default function RevealObserver() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    if (!nodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const index = Number(el.dataset.stagger || 0)
            window.setTimeout(() => el.classList.add("visible"), index * 60)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.08 }
    )

    nodes.forEach((node, idx) => {
      if (!node.dataset.stagger) node.dataset.stagger = String(idx % 6)
      observer.observe(node)
    })

    return () => observer.disconnect()
  }, [])

  return null
}
