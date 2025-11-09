/**
 * Gestionnaires d'événements pour les actions de jeu
 * Encapsule toute la logique des interactions avec Socket.IO
 */

import { Socket } from 'socket.io-client'
import { ScoreCategory } from '@/types/game'

/**
 * Démarre la partie
 */
export function handleStartGame(socket: Socket | null, roomId: string): void {
  if (!socket || !roomId) return
  socket.emit('start_game', roomId)
}

/**
 * Quitte ou abandonne la partie
 */
export function handleLeaveGame(
  socket: Socket | null,
  roomId: string,
  started: boolean,
  onComplete: () => void
): void {
  if (socket) {
    if (started) {
      // Si la partie est démarrée, c'est un abandon
      // Émettre l'événement et attendre un peu pour qu'il soit traité par le serveur
      socket.emit('abandon_game', roomId)
      // Laisser 100ms pour que l'événement arrive au serveur avant de déconnecter
      setTimeout(() => {
        socket.disconnect()
        onComplete()
      }, 100)
    } else {
      // Sinon, c'est juste quitter la salle d'attente
      socket.emit('leave_room', roomId)
      socket.disconnect()
      onComplete()
    }
  } else {
    onComplete()
  }
}

/**
 * Lance les dés
 */
export function handleRollDice(
  socket: Socket | null,
  roomId: string,
  setIsRolling: (value: boolean) => void,
  setRollCount: (fn: (prev: number) => number) => void
): void {
  if (socket) {
    setIsRolling(true)
    setRollCount((prev) => prev + 1)
    socket.emit('roll_dice', roomId)
  }
}

/**
 * Verrouille/déverrouille un dé
 */
export function handleToggleDieLock(
  socket: Socket | null,
  roomId: string,
  dieIndex: number
): void {
  if (socket) {
    socket.emit('toggle_die_lock', { roomId, dieIndex })
  }
}

/**
 * Choisit une catégorie de score
 */
export function handleChooseScore(
  socket: Socket | null,
  roomId: string,
  category: ScoreCategory
): void {
  if (socket) {
    socket.emit('choose_score', { roomId, category })
  }
}

