'use client';

import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useState } from "react"
import { UserProfile } from "@/types/user"

type AuthUser = {
  id: string
  email?: string
}

type SupabaseContextType = {
  user: AuthUser | null
  userProfile: UserProfile | null
  isLoading: boolean
  refreshUserProfile: () => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within SupabaseProvider')
  }
  return context
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAuthAndProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        setUserProfile(null)
        return
      }
      const data = await res.json()
      setUser(data.user)
      setUserProfile(data.profile)
    } catch (error) {
      console.error('Erreur récupération auth/me:', error)
      setUser(null)
      setUserProfile(null)
    }
  }

  const refreshUserProfile = async () => {
    await fetchAuthAndProfile()
  }

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setIsLoading(true)
      await fetchAuthAndProfile()
      if (!cancelled) {
        setIsLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SupabaseContext.Provider value={{ user, userProfile, isLoading, refreshUserProfile }}>
      <ThemeProvider attribute="data-theme" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  )
}
