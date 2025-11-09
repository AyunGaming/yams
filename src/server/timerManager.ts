/**
 * Module de gestion des timers de tour
 * Responsable de la gestion des timeouts et intervals pour les tours de jeu
 */

import { getGameState } from './gameStateManager'

// Stocker les timers actifs (timeouts et intervals)
const turnTimers = new Map<string, { timeout: NodeJS.Timeout; interval: NodeJS.Timeout }>()

// Durée du timer en secondes
const TURN_DURATION = 90

/**
 * Nettoie les timers d'une partie
 */
export function clearTurnTimer(roomId: string): void {
  const timers = turnTimers.get(roomId)
  if (timers) {
    clearTimeout(timers.timeout)
    clearInterval(timers.interval)
    turnTimers.delete(roomId)
  }
}

/**
 * Nettoie tous les timers (utilisé au redémarrage du serveur)
 */
export function clearAllTimers(): void {
  turnTimers.forEach(({ timeout, interval }) => {
    clearTimeout(timeout)
    clearInterval(interval)
  })
  turnTimers.clear()
}

/**
 * Démarre le timer pour le tour d'un joueur
 * @param roomId - ID de la partie
 * @param onTimerExpired - Callback appelée quand le timer expire
 * @param onTimerUpdate - Callback appelée chaque seconde pour mettre à jour le temps restant
 */
export function startTurnTimer(
  roomId: string,
  onTimerExpired: () => void,
  onTimerUpdate: (timeLeft: number) => void
): void {
  // Nettoyer le timer précédent s'il existe
  clearTurnTimer(roomId)
  
  const game = getGameState(roomId)
  if (!game) return
  
  // Initialiser le temps de début
  game.turnStartTime = Date.now()
  game.turnTimeLeft = TURN_DURATION
  
  // Mettre à jour chaque seconde
  const interval = setInterval(() => {
    const game = getGameState(roomId)
    if (!game) {
      clearTurnTimer(roomId)
      return
    }
    
    const elapsed = Math.floor((Date.now() - (game.turnStartTime || 0)) / 1000)
    const timeLeft = Math.max(0, TURN_DURATION - elapsed)
    game.turnTimeLeft = timeLeft
    
    onTimerUpdate(timeLeft)
  }, 1000)
  
  // Expirer après TURN_DURATION secondes
  const timeout = setTimeout(() => {
    clearTurnTimer(roomId)
    onTimerExpired()
  }, TURN_DURATION * 1000)
  
  turnTimers.set(roomId, { timeout, interval })
}

