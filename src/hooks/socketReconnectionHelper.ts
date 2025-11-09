/**
 * Helper pour la gestion de la reconnexion après redémarrage serveur
 */

import { Socket } from 'socket.io-client'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { clearServerRestartId } from './socketHelpers'

/**
 * Gère la reconnexion automatique après un redémarrage serveur
 */
export async function handleServerRestart(
  error: Error & { message: string },
  socketRef: { current: Socket | null },
  supabase: SupabaseClient,
  router: AppRouterInstance,
  initSocket: () => Promise<void>
): Promise<boolean> {
  // Détection de redémarrage serveur
  if (error.message !== 'SERVER_RESTARTED') {
    return false
  }

  logger.warn('Le serveur a redémarré - Tentative de reconnexion automatique')

  // Nettoyer l'ancien serverRestartId
  clearServerRestartId()

  // Nettoyer l'ancien socket
  if (socketRef.current) {
    socketRef.current.removeAllListeners()
    socketRef.current.disconnect()
    socketRef.current = null
  }

  try {
    // Régénérer un nouveau token depuis Supabase
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.access_token) {
      logger.error('Impossible de récupérer une session valide:', sessionError)
      alert('Le serveur a redémarré et votre session a expiré. Veuillez vous reconnecter.')
      router.push('/login')
      return true
    }

    // Attendre un peu pour laisser le serveur se stabiliser
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Réinitialiser la connexion
    await initSocket()
    return true
  } catch (err) {
    logger.error('Erreur lors de la reconnexion automatique:', err)
    alert('Impossible de se reconnecter automatiquement. Veuillez actualiser la page.')
    return true
  }
}

