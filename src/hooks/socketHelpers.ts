/**
 * Helpers pour la gestion des sockets côté client
 * Réduit la complexité de useGameSocket en extrayant les fonctions utilitaires
 */

import { logger } from '@/lib/logger'
import { tokenManager } from '@/lib/tokenManager'
import { UserProfile } from '@/types/user'

/**
 * Récupère le username de l'utilisateur
 * Utilise d'abord le userProfile du contexte
 */
export async function fetchUsername(
  user: { id: string; email?: string },
  userProfile?: UserProfile | null
): Promise<string> {
  // OPTIMISATION : Utiliser le profil déjà chargé dans le contexte
  if (userProfile?.username) {
    logger.debug('✅ Username récupéré depuis le contexte')
    return userProfile.username
  }

  // Fallback : utiliser l'email ou un nom générique
  return user.email || 'Joueur'
}

/**
 * Récupère le token d'authentification
 * Utilise le token applicatif stocké en localStorage
 */
export async function fetchAuthToken(): Promise<string | null> {
  const token = tokenManager.getToken()
  if (!token || tokenManager.isTokenExpired()) {
    logger.error('Token applicatif absent ou expiré')
    return null
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

