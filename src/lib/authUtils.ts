/**
 * Utilitaires pour l'authentification
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { tokenManager } from './tokenManager'
import { logger } from './logger'

/**
 * Déconnecte l'utilisateur avec un timeout pour éviter les blocages
 * @param supabase - Client Supabase
 * @param timeoutMs - Timeout en millisecondes (par défaut 5000)
 * @returns Promise qui se résout toujours (succès ou timeout)
 */
export async function signOutWithTimeout(
  supabase: SupabaseClient,
  timeoutMs: number = 5000
): Promise<{ success: boolean; timedOut: boolean }> {
  try {
    const signOutPromise = supabase.auth.signOut()
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )

    await Promise.race([signOutPromise, timeoutPromise])
    logger.success('Déconnexion Supabase réussie')
    return { success: true, timedOut: false }
  } catch (error) {
    if (error instanceof Error && error.message === 'Timeout') {
      logger.warn('Timeout lors de la déconnexion Supabase')
      return { success: false, timedOut: true }
    }
    logger.error('Erreur lors de la déconnexion:', error)
    return { success: false, timedOut: false }
  }
}

/**
 * Nettoie complètement la session utilisateur (localStorage + Supabase)
 * @param supabase - Client Supabase
 * @param redirectUrl - URL de redirection après nettoyage
 */
export async function cleanupSession(
  supabase: SupabaseClient,
  redirectUrl: string = '/'
): Promise<void> {
  logger.info('Nettoyage de session en cours...')

  const result = await signOutWithTimeout(supabase, 5000)

  if (result.success) {
    // Nettoyage après succès de signOut
    tokenManager.clearTokens()
    localStorage.removeItem('serverRestartId')
  }

  // Redirection (même en cas de timeout pour éviter l'état incohérent)
  window.location.href = redirectUrl
}

/**
 * Gère un état incohérent entre localStorage et Supabase
 * @param supabase - Client Supabase
 * @param onCleanupComplete - Callback appelé après le nettoyage
 */
export async function handleInconsistentState(
  supabase: SupabaseClient,
  onCleanupComplete?: () => void
): Promise<void> {
  logger.warn('État incohérent détecté - Nettoyage de la session Supabase')

  const result = await signOutWithTimeout(supabase, 3000)

  if (result.success) {
    tokenManager.clearTokens()
    localStorage.removeItem('serverRestartId')
    logger.success('Session nettoyée avec succès')
  } else if (result.timedOut) {
    // En cas de timeout, rechargement automatique
    logger.warn('Rechargement automatique pour réinitialiser l\'état')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  if (onCleanupComplete) {
    onCleanupComplete()
  }
}

