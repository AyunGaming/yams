/**
 * Utilitaires pour la gestion des timers de tour
 * Centralise la logique de gestion du temps pour éviter la duplication
 */

import { Server } from 'socket.io'
import { handleTimerExpired, startTurnTimer } from './gameManager'
import { getCategoryLabel } from '../lib/categoryLabels'

/**
 * Gère l'expiration du timer et redémarre le timer suivant
 * Utilisé par les handlers de room et de jeu
 */
export function handleTimerExpiredAndRestart(io: Server, roomId: string): void {
  const result = handleTimerExpired(roomId)
  if (!result) return
  
  const { gameState: updatedGameState, category, score, playerName } = result
  
  // Message de score avec (afk)
  const categoryLabel = getCategoryLabel(category)
  const message = `${playerName} a marqué ${score} point${score > 1 ? 's' : ''} en ${categoryLabel} (afk)`
  console.log('[TIMER] Émission du message système:', message)
  io.to(roomId).emit('system_message', message)
  
  io.to(roomId).emit('game_update', updatedGameState)
  
  // Si la partie est terminée
  if (updatedGameState.gameStatus === 'finished') {
    io.to(roomId).emit('game_ended', {
      winner: updatedGameState.winner,
      reason: 'completed',
      message: `${updatedGameState.winner} remporte la partie !`,
    })
  } else {
    // Redémarrer le timer pour le joueur suivant
    const currentPlayer = updatedGameState.players[updatedGameState.currentPlayerIndex]
    io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
    
    // Redémarrer le timer (appel récursif)
    startTurnTimer(
      roomId,
      () => handleTimerExpiredAndRestart(io, roomId),
      (timeLeft: number) => io.to(roomId).emit('turn_timer_update', timeLeft)
    )
  }
}

/**
 * Démarre le timer pour un nouveau tour
 * Centralise la logique commune d'initialisation du timer
 */
export function startTurnTimerWithCallbacks(io: Server, roomId: string): void {
  startTurnTimer(
    roomId,
    () => handleTimerExpiredAndRestart(io, roomId),
    (timeLeft: number) => io.to(roomId).emit('turn_timer_update', timeLeft)
  )
}

