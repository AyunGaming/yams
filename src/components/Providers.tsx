'use client'
import { ThemeProvider } from "next-themes"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/browser"
import { tokenManager } from "@/lib/tokenManager"
import { handleInconsistentState } from "@/lib/authUtils"
import { logger } from "@/lib/logger"
import { User, SupabaseClient } from "@supabase/supabase-js"
import { UserProfile } from "@/types/user"

type SupabaseContextType = {
  supabase: SupabaseClient
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
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fonction pour récupérer le profil utilisateur
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        logger.error('Erreur lors de la récupération du profil:', error)
        return
      }

      if (data) {
        setUserProfile(data as UserProfile)
        logger.debug('Profil utilisateur récupéré:', data.username)
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération du profil:', error)
    }
  }, [supabase])

  // Fonction exportée pour rafraîchir manuellement le profil
  const refreshUserProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }

  useEffect(() => {
    // OPTIMISATION : Vérification optimiste du token localStorage
    // Si on a un token valide, on affiche immédiatement sans attendre Supabase
    const localToken = tokenManager.getToken()
    const hasValidLocalToken = localToken && !tokenManager.isTokenExpired()
    
    if (hasValidLocalToken) {
      logger.debug('✅ Token local valide trouvé - Chargement optimiste')
      setIsLoading(false) // Débloquer l'UI immédiatement
    }

    // Timeout de sécurité réduit (2s au lieu de 5s)
    const timeoutId = setTimeout(() => {
      logger.warn('⚠️ Timeout de chargement atteint (2s), forçage de isLoading à false')
      setIsLoading(false)
    }, 2000) // 2 secondes maximum au lieu de 5

    // Récupère l'utilisateur et le token initial (en arrière-plan si token local valide)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      logger.debug('Vérification de session Supabase')
      
      try {
        if (session) {
          // Vérifier si on a bien un token dans localStorage
          const hasLocalToken = tokenManager.getToken() !== null
          
          if (!hasLocalToken) {
            // État incohérent : utiliser la fonction utilitaire
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
          // Stocke le token
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          logger.debug('Token d\'accès Supabase récupéré')
          
          // OPTIMISATION : Récupère le profil utilisateur en arrière-plan
          // Sans bloquer l'affichage de la page
          fetchUserProfile(session.user.id).catch((error) => {
            logger.error('Erreur lors de la récupération du profil:', error)
          })
        }
      } catch (error) {
        logger.error('Erreur lors de la vérification de session:', error)
      } finally {
        // Marquer le chargement comme terminé (si pas déjà fait par l'optimisation)
        clearTimeout(timeoutId)
        setIsLoading(false)
        logger.debug('✅ Chargement terminé')
      }
    }).catch((error) => {
      logger.error('Erreur fatale lors de getSession:', error)
      clearTimeout(timeoutId)
      setIsLoading(false)
    })

    // Écoute les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('Événement d\'authentification:', event)
        
        // Ignorer les événements de refresh token pour éviter les boucles
        if (event === 'TOKEN_REFRESHED') {
          logger.debug('Token rafraîchi automatiquement')
          return
        }
        
        if (session) {
          setUser(session.user)
          setAccessToken(session.access_token)
          // Stocke les nouveaux tokens
          tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
          if (session.refresh_token) {
            tokenManager.setRefreshToken(session.refresh_token)
          }
          logger.debug('Token mis à jour')
          
          // Récupère le profil utilisateur
          await fetchUserProfile(session.user.id)
        } else {
          setUser(null)
          setUserProfile(null)
          setAccessToken(null)
          // Supprime les tokens
          tokenManager.clearTokens()
          logger.debug('Déconnexion - tokens supprimés')
        }
      }
    )

    // Vérifie et rafraîchit le token périodiquement
    const intervalId = setInterval(async () => {
      // Ne pas essayer de rafraîchir si l'utilisateur n'est pas connecté
      if (!tokenManager.getToken()) {
        return
      }
      
      if (tokenManager.isTokenExpired()) {
        logger.debug('Token expiré, rafraîchissement...')
        const { data, error } = await supabase.auth.refreshSession()
        if (error) {
          logger.error('Erreur lors du rafraîchissement:', error)
          tokenManager.clearTokens()
        } else if (data.session) {
          logger.success('Token rafraîchi avec succès')
        }
      }
    }, 60000) // Vérifie toutes les minutes

    return () => {
      subscription.unsubscribe()
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [supabase, fetchUserProfile])

  return (
    <SupabaseContext.Provider value={{ supabase, user, userProfile, accessToken, isLoading, refreshUserProfile }}>
      <ThemeProvider attribute="data-theme" defaultTheme="dark">
        {children}
      </ThemeProvider>
    </SupabaseContext.Provider>
  )
}
