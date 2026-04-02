import axios from "axios"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const api = axios.create({ baseURL: BASE })

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null

  const directToken = localStorage.getItem("access_token")
  if (directToken) return directToken

  // Fallback for sessions where token is present in Zustand persisted state only.
  const persisted = localStorage.getItem("auth-storage")
  if (!persisted) return null

  try {
    const parsed = JSON.parse(persisted) as { state?: { token?: string | null } }
    return parsed.state?.token ?? null
  } catch {
    return null
  }
}

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Types
export interface Ticket {
  id: string
  subject: string
  status: "OPEN" | "AI_DRAFTED" | "WAITING_CUSTOMER" | "ESCALATED" | "CLOSED"
  channel: "whatsapp" | "email" | "web_chat"
  customer_id: string
  frustration_score: number
  ai_draft: string | null
  share_token: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  is_vip: boolean
  crm_source: string | null
  created_at: string
}

export interface DashboardSummary {
  total_tickets: number
  open_tickets: number
  escalated_tickets: number
  closed_tickets: number
}

export interface WeeklyMetric {
  id: string
  week_start: string
  total_tickets: number
  resolved_tickets: number
  escalations: number
  automation_rate: number
  avg_sentiment: number
  churn_risk_score: number
  ai_summary: string | null
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string }>("/api/auth/login", { email, password }),
  register: (data: { email: string; password: string; full_name: string; tenant_name: string }) =>
    api.post<{ access_token: string }>("/api/auth/register", data),
  me: () => api.get("/api/auth/me"),
}

// Tickets
export const ticketsApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get<Ticket[]>("/api/tickets/", { params }),
  get: (id: string) => api.get<Ticket>(`/api/tickets/${id}`),
  create: (data: object) => api.post<Ticket>("/api/tickets/", data),
  update: (id: string, data: object) => api.patch<Ticket>(`/api/tickets/${id}`, data),
  messages: (id: string) => api.get(`/api/tickets/${id}/messages`),
  addMessage: (id: string, data: object) => api.post(`/api/tickets/${id}/messages`, data),
}

// Customers
export const customersApi = {
  list: (params?: { search?: string; skip?: number; limit?: number }) =>
    api.get<Customer[]>("/api/customers/", { params }),
  get: (id: string) => api.get<Customer>(`/api/customers/${id}`),
  create: (data: object) => api.post<Customer>("/api/customers/", data),
}

// Analytics
export const analyticsApi = {
  dashboard: () => api.get<DashboardSummary>("/api/analytics/dashboard"),
  weekly: () => api.get<WeeklyMetric[]>("/api/analytics/weekly"),
  generateWeekly: () => api.post("/api/analytics/generate-weekly"),
}

// Subscriptions
export const subscriptionsApi = {
  get: () => api.get("/api/subscriptions/"),
  upgrade: (plan: string) => api.post("/api/subscriptions/upgrade", { plan }),
}

// AI
export const aiApi = {
  chat: (message: string, ticket_id?: string) =>
    api.post("/api/ai/chat", { message, ticket_id }),
  ingest: (text: string, source_type: string) =>
    api.post("/api/ai/ingest", { text, source_type }),
}
