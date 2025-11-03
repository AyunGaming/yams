'use client'
import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabaseClient"
import { tokenManager } from "@/lib/tokenManager"
import { User, SupabaseClient } from "@supabase/supabase-js"

type SupabaseContextType = {
  supabase: SupabaseClient
  user: User | null
  accessToken: string | null
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
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Récupère l'utilisateur et le token initial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        setAccessToken(session.access_token)
        // Stocke le token
        tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
        if (session.refresh_token) {
          tokenManager.setRefreshToken(session.refresh_token)
        }
        console.log('🔑 Token d\'accès récupéré et stocké')
      }
    })

    // Écoute les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Événement d\'authentification:', event)
        
        if (session) {
          setUser(session.user)
          setAccessToken(session.access_token)
          // Stocke les nouveaux tokens
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          console.log('✅ Token mis à jour')
        } else {
          setUser(null)
          setAccessToken(null)
          // Supprime les tokens
          tokenManager.clearTokens()
          console.log('🚪 Déconnexion - tokens supprimés')
        }
      }
    )

    // Vérifie et rafraîchit le token périodiquement
    const intervalId = setInterval(async () => {
      if (tokenManager.isTokenExpired()) {
        console.log('⏰ Token expiré, rafraîchissement...')
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('❌ Erreur lors du rafraîchissement:', error)
          tokenManager.clearTokens()
        } else if (data.session) {
          console.log('✅ Token rafraîchi avec succès')
        }
      }
    }, 60000) // Vérifie toutes les minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
    }
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, user, accessToken }}>
      <ThemeProvider attribute="data-theme" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  )
}
