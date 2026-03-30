"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, BotMessageSquare } from "lucide-react"
import { authApi } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

export default function LoginPage() {
  const router = useRouter()
  const { setToken, setUser } = useAuthStore()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    tenant_name: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = isRegister
        ? await authApi.register(form)
        : await authApi.login(form.email, form.password)

      const token = res.data.access_token
      setToken(token)

      const meRes = await authApi.me()
      setUser(meRes.data)
      const role: string = meRes.data.role
      if (role === "admin") {
        router.push("/admin")
      } else {
        router.push("/dashboard")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? msg)
    } finally {
      setLoading(false)
    }
  }

  const INPUT_CLASS =
    "w-full px-4 py-3 rounded-lg border border-[#E3DDD4] bg-[#FDFCF9] text-[#1C1815] text-sm placeholder-[#9E9890] outline-none focus:ring-2 focus:ring-[#C8412D33] focus:border-[#C8412D] transition-all"

  return (
    <div className="min-h-screen grid lg:grid-cols-[40%_60%] bg-[#FDFCF9]">
      <motion.div
        initial={{ opacity: 0, x: -32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex meridian-sidebar px-12 py-10 flex-col justify-between"
      >
        <div>
          <a href="/" className="inline-flex items-center gap-2 text-[#F4F0E8] hover:text-white transition-colors">
            ← Back to home
          </a>
          <div className="mt-10 font-display text-5xl text-[#F4F0E8] leading-tight">Clario</div>
          <p className="mt-3 text-sm text-[#9E9890] max-w-xs">Intelligent support, at human scale.</p>
        </div>

        <div className="relative h-[240px] rounded-2xl border border-white/10 bg-[#1f1b18] overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 50% 55%, #F4F0E8 0%, transparent 60%)" }} />
          <div className="absolute inset-6 rounded-full border border-white/15 animate-[spin_30s_linear_infinite]" />
          <div className="absolute inset-12 rounded-full border border-white/10 animate-[spin_24s_linear_infinite_reverse]" />
          <div className="absolute inset-20 rounded-full border border-white/10 animate-[spin_18s_linear_infinite]" />
        </div>

        <blockquote className="text-[#D4CFC8] text-lg leading-relaxed font-display italic">
          “Support feels human again. Our response quality improved in week one.”
          <footer className="not-italic font-sans text-xs text-[#9E9890] mt-2">— Priya Nair, Operations Lead</footer>
        </blockquote>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex items-center justify-center p-6 md:p-10"
      >
        <div className="w-full max-w-md bg-white border border-[#E3DDD4] rounded-2xl p-8 shadow-sm reveal visible">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#1C1815] flex items-center justify-center">
              <BotMessageSquare className="h-5 w-5 text-[#F4F0E8]" />
            </div>
            <div>
              <h1 className="font-display text-[28px] leading-none text-[#1C1815]">Clario</h1>
              <p className="text-xs text-[#9E9890]">Meridian Support Platform</p>
            </div>
          </div>

          <div className="inline-flex rounded-lg bg-[#F4F0E8] p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false)
                setError("")
              }}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${!isRegister ? "bg-[#1C1815] text-[#F4F0E8]" : "text-[#5A554F]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true)
                setError("")
              }}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${isRegister ? "bg-[#1C1815] text-[#F4F0E8]" : "text-[#5A554F]"}`}
            >
              Create account
            </button>
          </div>

          <h2 className="text-2xl font-medium text-[#1C1815] mb-1">
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-sm text-[#5A554F] mb-6">
            {isRegister ? "Set up your workspace in minutes." : "Sign in to continue to your dashboard."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <>
                <input
                  className={INPUT_CLASS}
                  placeholder="Full name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
                <input
                  className={INPUT_CLASS}
                  placeholder="Organization name"
                  value={form.tenant_name}
                  onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))}
                  required
                />
              </>
            )}

            <input
              type="email"
              className={INPUT_CLASS}
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              type="password"
              className={INPUT_CLASS}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-[#8B2E1E] bg-[#FEF0EE] border border-[#C8412D30] px-4 py-3 rounded-lg">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#C8412D] hover:bg-[#B43A28] text-[#F4F0E8] font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 btn-glow mt-1"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isRegister ? "Create account →" : "Sign in →"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
