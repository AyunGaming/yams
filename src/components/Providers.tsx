'use client';

import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/browser"
import { tokenManager } from "@/lib/tokenManager"
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
        console.error('⚠️ Erreur récupération profil:', error.message)
        return
      }
      setUserProfile(data as UserProfile)
      console.log('✅ Profil utilisateur chargé')
    } catch (error) {
      console.error('❌ Erreur fetchUserProfile:', error)
    }
  }, [supabase])

  const refreshUserProfile = async () => {
    if (user?.id) await fetchUserProfile(user.id)
  }

  // ✅ Initialisation et gestion de l'authentification
  useEffect(() => {
    if (!supabase) return

    console.log('🔄 Initialisation de l\'authentification...')
    
    // Timeout de sécurité pour éviter le blocage
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout de chargement - Initialisation terminée')
      setIsLoading(false)
    }, 3000)

    // Récupérer la session actuelle
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Erreur getSession:', error.message)
        clearTimeout(safetyTimeout)
        setIsLoading(false)
        return
      }

      if (session) {
        console.log('✅ Session Supabase trouvée')
        
        // Synchroniser le localStorage avec la session Supabase
        setUser(session.user)
        setAccessToken(session.access_token)
        
        tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
        if (session.refresh_token) {
          tokenManager.setRefreshToken(session.refresh_token)
        }
        
        // Charger le profil utilisateur (avec timeout de sécurité)
        const profileTimeout = setTimeout(() => {
          console.warn('⚠️ Timeout chargement profil')
          clearTimeout(safetyTimeout)
          setIsLoading(false)
        }, 2000)

        fetchUserProfile(session.user.id).finally(() => {
          clearTimeout(profileTimeout)
          clearTimeout(safetyTimeout)
          setIsLoading(false)
        })
      } else {
        console.log('ℹ️ Aucune session active')
        
        // Pas de session : nettoyer les tokens orphelins
        const hasOrphanToken = tokenManager.getToken() !== null
        if (hasOrphanToken) {
          console.warn('⚠️ Token local sans session - Nettoyage')
          tokenManager.clearTokens()
        }
        
        clearTimeout(safetyTimeout)
        setIsLoading(false)
      }
    }).catch((err) => {
      console.error('❌ Exception getSession:', err)
      clearTimeout(safetyTimeout)
      setIsLoading(false)
    })

    // Écouter les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event)
        
        if (session) {
          setUser(session.user)
          setAccessToken(session.access_token)
          
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          
          fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserProfile(null)
          setAccessToken(null)
          tokenManager.clearTokens()
        }
      }
    )

    // Rafraîchir le token toutes les minutes si nécessaire
    const intervalId = setInterval(async () => {
      if (!tokenManager.getToken()) return
      if (tokenManager.isTokenExpired()) {
        const { error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('❌ Erreur refresh token:', error.message)
          tokenManager.clearTokens()
        }
      }
    }, 60000)

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      clearTimeout(safetyTimeout)
    }
  }, [supabase, fetchUserProfile])

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
