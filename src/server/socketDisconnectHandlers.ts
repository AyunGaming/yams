/**
 * Gestionnaires d'événements Socket.IO pour la déconnexion
 * Gère disconnect et la notification aux autres joueurs
 */

import { Server, Socket } from 'socket.io'
import { SupabaseClient } from '@supabase/supabase-js'
import { removePlayer } from './gameManager'

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
          // Partie en cours : marquer comme abandonné
          console.log(`[DISCONNECT] ${playerName} a abandonné la partie ${roomId}`)
          
          // Envoyer le message AVANT de modifier le game state
          console.log(`[DISCONNECT] Envoi du message d'abandon à la room: ${roomId}`)
          io.to(roomId).emit('system_message', `${playerName} a abandonné la partie`)
          console.log(`[DISCONNECT] Message envoyé`)
          
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

