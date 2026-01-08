/**
 * Gestionnaires d'événements Socket.IO pour la déconnexion
 * Gère disconnect et la notification aux autres joueurs
 * Avec un délai de grâce de 60 secondes avant de considérer un abandon
 */

import { Server, Socket } from 'socket.io'
import { SupabaseClient } from '@supabase/supabase-js'
import { removePlayer, getGameState } from './gameManager'
import { updateUserStats, countYamsInScoreSheet, getUserProfile } from '../lib/userStats'

// Délai de grâce en millisecondes (60 secondes)
const DISCONNECT_GRACE_PERIOD = 60000

// Map pour stocker les timers de déconnexion en attente
// Key: roomId-userId, Value: NodeJS.Timeout
const disconnectTimers = new Map<string, NodeJS.Timeout>()

/**
 * Annule un timer de déconnexion si il existe
 */
export function cancelDisconnectTimer(roomId: string, userId: string) {
  const timerKey = `${roomId}-${userId}`
  const existingTimer = disconnectTimers.get(timerKey)
  
  if (existingTimer) {
    console.log(`[DISCONNECT] Annulation du timer pour ${userId} dans ${roomId}`)
    clearTimeout(existingTimer)
    disconnectTimers.delete(timerKey)
    return true
  }
  
  return false
}

/**
 * Configure les gestionnaires d'événements pour la déconnexion
 */
export function setupDisconnectHandlers(
  io: Server, 
  socket: Socket,
  roomStates: Map<string, { started: boolean }>,
  supabase: SupabaseClient
) {
  // Utiliser 'disconnecting' au lieu de 'disconnect' pour avoir accès aux rooms
  socket.on('disconnecting', () => {
    const playerName = socket.data.playerName || 'Un joueur'
    console.log(`[DISCONNECT] ${playerName} (${socket.id}) est en train de se déconnecter`)

    // Copier les rooms AVANT de faire quoi que ce soit
    const roomsCopy = Array.from(socket.rooms)
    console.log(`[DISCONNECT] Rooms du joueur:`, roomsCopy)

    // Notifier toutes les rooms auxquelles le joueur appartenait
    roomsCopy.forEach((roomId) => {
      if (roomId !== socket.id) {
        // Ignore la room personnelle du socket
        console.log(`[DISCONNECT] Traitement de la room: ${roomId}`)
        const roomState = roomStates.get(roomId)
        const isGameStarted = roomState?.started || false
        console.log(`[DISCONNECT] Room ${roomId} - Partie commencée: ${isGameStarted}`)

        if (isGameStarted) {
          // Vérifier si la partie est déjà terminée
          const gameState = getGameState(roomId)
          const isGameFinished = gameState?.gameStatus === 'finished'
          
          if (isGameFinished) {
            console.log(`[DISCONNECT] ${playerName} quitte une partie terminée, pas de timer`)
            // Partie déjà terminée, pas besoin de timer d'abandon
            return
          }

          // Vérifier si c'est un abandon volontaire (bouton Abandonner)
          if (socket.data.voluntaryAbandon) {
            console.log(`[DISCONNECT] ${playerName} a abandonné volontairement, pas de délai de grâce`)
            // Pas de timer de grâce pour un abandon volontaire
            return
          }
          
          // Partie en cours : attendre 60 secondes avant de considérer comme abandonné
          const userId = socket.data.userId
          
          if (userId) {
            console.log(`[DISCONNECT] ${playerName} s'est déconnecté, délai de grâce de 60s`)
            
            // Notifier les autres joueurs de la déconnexion temporaire
            io.to(roomId).emit('system_message', `${playerName} s'est déconnecté (60s pour revenir)`)
            
            const timerKey = `${roomId}-${userId}`
            
            // Créer un timer pour l'abandon après 60 secondes
            const abandonTimer = setTimeout(async () => {
              console.log(`[DISCONNECT] Timer expiré pour ${playerName} dans ${roomId}`)
              
              // Récupérer le gameState AVANT de retirer le joueur pour sauvegarder ses stats
              const gameBeforeRemoval = getGameState(roomId)
              
              // Enregistrer les stats avec perte d'XP si le joueur existe dans le gameState
              if (gameBeforeRemoval && userId) {
                // Trouver le joueur qui abandonne par userId (car socket.id n'est plus valide)
                const abandoningPlayer = gameBeforeRemoval.players.find((p) => p.userId === userId)
                
                if (abandoningPlayer) {
                  // Compter les Yams réalisés
                  const yamsCount = countYamsInScoreSheet(abandoningPlayer.scoreSheet)
                  
                  // Récupérer le niveau actuel du joueur pour calculer la perte d'XP
                  const { data: userProfile } = await getUserProfile(supabase, userId)
                  const currentLevel = userProfile?.level || 1
                  
                  // Calculer la perte d'XP: exp -= lvl * 10
                  const xpLoss = currentLevel * 10
                  const xpGained = -xpLoss
                  
                  // Enregistrer les statistiques d'abandon
                  const result = await updateUserStats(supabase, {
                    user_id: userId,
                    score: abandoningPlayer.totalScore,
                    won: false,
                    abandoned: true,
                    yams_count: yamsCount,
                    xp_gained: xpGained,
                  })
                  
                  if (!result.success) {
                    console.error(`[STATS] Erreur sauvegarde stats d'abandon (déconnexion):`, result.error)
                  } else {
                    console.log(`[STATS] ${playerName} a perdu ${xpLoss} XP (niveau ${currentLevel}) suite à l'abandon par déconnexion`)
                  }
                }
              }
              
              // Le joueur ne s'est pas reconnecté, marquer comme abandonné
              io.to(roomId).emit('system_message', `${playerName} a abandonné la partie`)
              
              // Retirer le joueur du gameState (utiliser socket.id sauvegardé)
              const updatedGame = removePlayer(roomId, socket.id)
              
              if (!updatedGame) {
                // Plus de joueurs, partie annulée
                console.log('[DISCONNECT] Plus aucun joueur dans la partie')
                roomStates.delete(roomId)
              } else if (updatedGame.gameStatus === 'finished') {
                // Un seul joueur reste, il gagne
                const playersScores = updatedGame.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  user_id: p.userId,
                  score: p.totalScore,
                  abandoned: p.abandoned,
                }))

                // Mettre à jour la base de données
                supabase
                  .from('games')
                  .update({
                    status: 'finished',
                    winner: updatedGame.winner,
                    players_scores: playersScores,
                  })
                  .eq('id', roomId)
                  .then(({ error }) => {
                    if (error) {
                      console.error('[DISCONNECT] Erreur mise à jour de la partie:', error)
                    }
                  })

                io.to(roomId).emit('game_update', updatedGame)
                io.to(roomId).emit('game_ended', {
                  winner: updatedGame.winner,
                  reason: 'abandon',
                  message: `${updatedGame.winner} remporte la partie par abandon !`,
                })
                roomStates.delete(roomId)
                console.log(`[DISCONNECT] Partie ${roomId} terminée par abandon`)
              } else {
                // 2+ joueurs restent, continuer
                // Compter les joueurs actifs (non-abandonnés)
                const activePlayers = updatedGame.players.filter(p => !p.abandoned)
                const activePlayersCount = activePlayers.length
                
                io.to(roomId).emit('game_update', updatedGame)
                io.to(roomId).emit(
                  'system_message',
                  `La partie continue avec ${activePlayersCount} joueur${activePlayersCount > 1 ? 's' : ''}`
                )
                
                const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex]
                io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
                console.log(`[DISCONNECT] Partie continue, tour de ${currentPlayer.name}`)
              }
              
              // Nettoyer le timer
              disconnectTimers.delete(timerKey)
            }, DISCONNECT_GRACE_PERIOD)
            
            // Stocker le timer
            disconnectTimers.set(timerKey, abandonTimer)
          }
        } else {
          // Salle d'attente : simple notification
          console.log(`[DISCONNECT] ${playerName} quitte la salle d'attente ${roomId}`)
          
          // Envoyer le message AVANT de récupérer la nouvelle liste
          console.log(`[DISCONNECT] Envoi du message de déconnexion à la room: ${roomId}`)
          io.to(roomId).emit('system_message', `${playerName} s'est déconnecté`)
          console.log(`[DISCONNECT] Message envoyé`)
          
          const room = io.sockets.adapter.rooms.get(roomId)
          const socketsInRoom = room ? Array.from(room) : []

          const players = socketsInRoom.map((socketId) => {
            const s = io.sockets.sockets.get(socketId)
            return {
              id: socketId,
              name: s?.data?.playerName || 'Unknown',
            }
          })

          io.to(roomId).emit('room_update', {
            players,
            started: false,
          })
          
          console.log(`[DISCONNECT] ${players.length} joueur(s) restant(s) dans ${roomId}`)
        }
      }
    })
  })
}

