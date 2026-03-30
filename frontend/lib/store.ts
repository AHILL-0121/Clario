import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  token: string | null
  user: { id: string; email: string; full_name: string; role: string; tenant_id: string } | null
  hasHydrated: boolean
  setToken: (token: string) => void
  setUser: (user: AuthState["user"]) => void
  setHasHydrated: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setToken: (token) => {
        set({ token })
        if (typeof window !== "undefined") localStorage.setItem("access_token", token)
      },
      setUser: (user) => set({ user }),
      logout: () => {
        set({ token: null, user: null })
        if (typeof window !== "undefined") localStorage.removeItem("access_token")
      },
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
