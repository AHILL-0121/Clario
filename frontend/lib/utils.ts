import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), "MMM d, yyyy")
}

export function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    OPEN:             "bg-[#FEF0EE] text-[#C8412D] border-[#E9B9B0]",
    AI_DRAFTED:       "bg-[#E8F5EF] text-[#1E6E4E] border-[#BBDDCB]",
    WAITING_CUSTOMER: "bg-[#ECF2EE] text-[#5A876C] border-[#CFE0D5]",
    ESCALATED:        "bg-[#FEF0EE] text-[#8B2E1E] border-[#E9B9B0]",
    CLOSED:           "bg-[#E8F5EF] text-[#1E6E4E] border-[#BBDDCB]",
  }
  return map[status] ?? "bg-[#F4F0E8] text-[#5A554F] border-[#E3DDD4]"
}

export function sentimentLabel(score: number) {
  if (score > 0.3) return { label: "Positive", color: "text-[#1E6E4E] font-medium" }
  if (score < -0.3) return { label: "Negative", color: "text-[#C8412D] font-medium" }
  return { label: "Neutral", color: "text-[#5A876C] font-medium" }
}

export function frustrationColor(score: number) {
  if (score >= 0.7) return "text-[#C8412D] font-semibold"
  if (score >= 0.4) return "text-[#5A876C] font-semibold"
  return "text-[#1E6E4E] font-semibold"
}
