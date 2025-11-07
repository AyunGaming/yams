/**
 * Middleware d'authentification pour Socket.IO
 * Vérifie les tokens JWT et gère la détection de redémarrage serveur
 */

import { Socket } from 'socket.io'
import { verifyToken, getUsernameFromId } from './authMiddleware'

/**
 * Middleware d'authentification Socket.IO
 * @param serverRestartId - ID unique du serveur pour détecter les redémarrages
 */
export function createAuthMiddleware(serverRestartId: string) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Vérifier l'ID de session serveur pour détecter les redémarrages
      const clientServerRestartId = socket.handshake.auth.serverRestartId

      if (clientServerRestartId && clientServerRestartId !== serverRestartId) {
        return next(new Error('SERVER_RESTARTED'))
      }

      // Extraire le token des handshake auth ou query
      const token = socket.handshake.auth.token || socket.handshake.query.token

      if (!token) {
        console.error('[SOCKET] Connexion refusée: Token manquant')
        return next(new Error('Authentication error: Token manquant'))
      }

      // Vérifier le token
      const { valid, userId, error } = await verifyToken(token as string)

      if (!valid || !userId) {
        console.error('[SOCKET] Connexion refusée: Token invalide -', error)
        return next(new Error(`Authentication error: ${error}`))
      }

      // Stocker les infos utilisateur dans socket.data
      socket.data.userId = userId
      socket.data.authenticated = true

      // Récupérer le username depuis la base de données
      const username = await getUsernameFromId(userId)
      socket.data.username = username
      socket.data.serverRestartId = serverRestartId

      next()
    } catch (error) {
      console.error("[SOCKET] Erreur d'authentification:", error)
      next(new Error('Authentication error'))
    }
  }
}

