"use client"

import { useEffect, useState } from "react"

export default function PublicCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })

    const isInteractive = (el: EventTarget | null) => {
      const node = el as HTMLElement | null
      if (!node) return false
      return Boolean(node.closest("a,button,[role='button'],input,textarea,select,.cursor-target"))
    }

    const onOver = (e: MouseEvent) => setHovering(isInteractive(e.target))
    const onOut = (e: MouseEvent) => {
      if (!isInteractive(e.relatedTarget)) setHovering(false)
    }

    window.addEventListener("mousemove", move)
    window.addEventListener("mouseover", onOver)
    window.addEventListener("mouseout", onOut)

    return () => {
      window.removeEventListener("mousemove", move)
      window.removeEventListener("mouseover", onOver)
      window.removeEventListener("mouseout", onOut)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[100] hidden md:block transition-[width,height,transform,border-color,background-color] duration-150"
      style={{
        left: pos.x,
        top: pos.y,
        width: hovering ? 32 : 10,
        height: hovering ? 32 : 10,
        transform: "translate(-50%, -50%)",
        borderRadius: hovering ? 999 : 999,
        border: hovering ? "1.5px solid #C8412D" : "0px solid transparent",
        background: hovering ? "#C8412D1F" : "#1C18158C",
      }}
    />
  )
}
