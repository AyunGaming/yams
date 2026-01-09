/**
 * Utilitaires pour l'authentification
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { tokenManager } from './tokenManager'
import { logger } from './logger'

/**
 * Supprime tous les cookies Supabase (auth-token)
 * Utile quand signOut() échoue ou timeout
 */
function clearSupabaseCookies(): void {
  // Liste des cookies Supabase à supprimer
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
  ]
  
  cookieNames.forEach(name => {
    // Supprimer pour tous les domaines possibles
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
  })
  
  // Supprimer tous les cookies qui commencent par 'sb-' (format Supabase SSR)
  document.cookie.split(';').forEach(cookie => {
    const cookieName = cookie.split('=')[0].trim()
    if (cookieName.startsWith('sb-')) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
    }
  })
}

/**
 * Déconnecte l'utilisateur (déconnexion LOCALE uniquement, sans appel réseau)
 * @param supabase - Client Supabase
 * @returns Promise qui se résout toujours avec le résultat
 */
export async function signOutLocal(
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    // Déconnexion locale uniquement (pas d'appel réseau à Supabase)
    // Cela supprime la session du client mais pas du serveur
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    
    if (error) {
      console.error('Erreur signOut local:', error)
      return { success: false, error: error.message }
    }
    
    logger.success('Déconnexion locale Supabase réussie')
    return { success: true }
  } catch (error) {
    console.error('Erreur inattendue signOut:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Nettoie complètement la session utilisateur (localStorage + Supabase + Cookies)
 * Version ULTRA-SIMPLIFIÉE : déconnexion IMMÉDIATE sans attendre Supabase
 * @param supabase - Client Supabase
 * @param redirectUrl - URL de redirection après nettoyage
 */
export async function cleanupSession(
  supabase: SupabaseClient,
  redirectUrl: string = '/'
): Promise<void> {
  logger.info('Déconnexion IMMÉDIATE en cours...')

  try {
    // 1. Nettoyage localStorage (synchrone, immédiat)
    tokenManager.clearTokens()
    localStorage.removeItem('serverRestartId')
    logger.success('Tokens locaux supprimés')

    // 2. Suppression cookies Supabase (synchrone, immédiat)
    clearSupabaseCookies()
    logger.success('Cookies Supabase supprimés')

    // 3. Déconnexion Supabase en arrière-plan (non-bloquante)
    // On ne l'attend PAS pour ne pas bloquer l'utilisateur
    signOutLocal(supabase).catch(err => {
      console.warn('⚠️ Erreur signOut Supabase (non-bloquant):', err)
    })

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
  }

  logger.info('Redirection IMMÉDIATE vers', redirectUrl)
  
  // 4. Redirection IMMÉDIATE (sans délai, sans await)
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
  logger.warn('État incohérent détecté - Nettoyage de la session')

  // Déconnexion locale
  await signOutLocal(supabase)
  
  // Nettoyage complet
  tokenManager.clearTokens()
  localStorage.removeItem('serverRestartId')
  clearSupabaseCookies()
  
  logger.success('Session nettoyée avec succès')

  if (onCleanupComplete) {
    onCleanupComplete()
  }
}

