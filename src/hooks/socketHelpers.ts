/**
 * Helpers pour la gestion des sockets côté client
 * Réduit la complexité de useGameSocket en extrayant les fonctions utilitaires
 */

import { SupabaseClient, User } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { tokenManager } from '@/lib/tokenManager'
import { UserProfile } from '@/types/user'

/**
 * Récupère le username de l'utilisateur
 * Utilise d'abord le userProfile du contexte, puis fallback sur Supabase
 */
export async function fetchUsername(
  user: User,
  supabase: SupabaseClient,
  userProfile?: UserProfile | null
): Promise<string> {
  // OPTIMISATION : Utiliser le profil déjà chargé dans le contexte
  if (userProfile?.username) {
    logger.debug('✅ Username récupéré depuis le contexte')
    return userProfile.username
  }

  // Fallback : Récupérer depuis Supabase
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      logger.error('Erreur lors de la récupération du user:', error)
      return user.email || 'Joueur'
    }

    return data.user?.user_metadata?.username || data.user?.email || 'Joueur'
  } catch (error) {
    logger.error('Erreur lors de la récupération du username:', error)
    return user.email || 'Joueur'
  }
}

/**
 * Récupère le token d'authentification
 * Utilise d'abord localStorage, puis fallback sur Supabase
 */
export async function fetchAuthToken(supabase: SupabaseClient): Promise<string | null> {
  // OPTIMISATION : Récupérer le token depuis localStorage d'abord
  let token = tokenManager.getToken()
  
  if (!token || tokenManager.isTokenExpired()) {
    logger.debug('Token local absent ou expiré, récupération depuis Supabase')
    const {
      data: { session },
    } = await supabase.auth.getSession()
    token = session?.access_token || null
  }

  return token
}

/**
 * Récupère l'ID de session serveur depuis localStorage
 */
export function getServerRestartId(): string | null {
  return localStorage.getItem('serverRestartId')
}

/**
 * Sauvegarde l'ID de session serveur dans localStorage
 */
export function saveServerRestartId(restartId: string): void {
  localStorage.setItem('serverRestartId', restartId)
}

/**
 * Supprime l'ID de session serveur de localStorage
 */
export function clearServerRestartId(): void {
  localStorage.removeItem('serverRestartId')
}

