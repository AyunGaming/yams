'use client';

import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/browser"
import { tokenManager } from "@/lib/tokenManager"
import { handleInconsistentState } from "@/lib/authUtils"
import { logger } from "@/lib/logger"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { UserProfile } from "@/types/user"

type SupabaseContextType = {
  supabase: SupabaseClient | null
  user: User | null
  userProfile: UserProfile | null
  accessToken: string | null
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

  // ✅ ✅ Client Supabase créé UNIQUEMENT côté client (pas SSR)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    supabaseRef.current = createClient()
    setIsReady(true)
  }, [])

  const supabase = supabaseRef.current

  // ✅ Tous les hooks MAINTENUS exactement au même endroit
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        logger.error('Erreur profil:', error)
        return
      }
      setUserProfile(data as UserProfile)
    } catch (error) {
      logger.error('Erreur fetchUserProfile:', error)
    }
  }, [supabase])

  const refreshUserProfile = async () => {
    if (user?.id) await fetchUserProfile(user.id)
  }

  // ✅ Toute la logique originale, inchangée
  useEffect(() => {
    if (!supabase) return

    const localToken = tokenManager.getToken()
    const hasValidLocalToken = localToken && !tokenManager.isTokenExpired()
    
    if (hasValidLocalToken) {
      setIsLoading(false)
    }

    const timeoutId = setTimeout(() => {
      setIsLoading(false)
    }, 2000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session) {
          const hasLocalToken = tokenManager.getToken() !== null
          
          if (!hasLocalToken) {
            await handleInconsistentState(supabase, () => {
              setUser(null)
              setUserProfile(null)
              setAccessToken(null)
              setIsLoading(false)
            })
            clearTimeout(timeoutId)
            return
          }
          
          setUser(session.user)
          setAccessToken(session.access_token)
          
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          
          fetchUserProfile(session.user.id)
        }
      } catch {}
      finally {
        clearTimeout(timeoutId)
        setIsLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeoutId)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user)
          setAccessToken(session.access_token)
          
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserProfile(null)
          setAccessToken(null)
          tokenManager.clearTokens()
        }
      }
    )

    const intervalId = setInterval(async () => {
      if (!tokenManager.getToken()) return
      if (tokenManager.isTokenExpired()) {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          tokenManager.clearTokens()
        }
      }
    }, 60000)

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [supabase, fetchUserProfile, user?.id])

  // ✅ Rendu retardé, sans casser l’ordre des hooks
  if (!isReady || !supabase) return null

  return (
    <SupabaseContext.Provider value={{ supabase, user, userProfile, accessToken, isLoading, refreshUserProfile }}>
      <ThemeProvider attribute="data-theme" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  )
}
