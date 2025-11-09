/**
 * Gestionnaires d'événements Socket.IO pour les rooms (salle d'attente)
 * Gère join_room, leave_room, start_game
 */

import { Server, Socket } from 'socket.io'
import { SupabaseClient } from '@supabase/supabase-js'
import { initializeGame, getGameState, updatePlayerSocketId } from './gameManager'

type Player = { id: string; name: string; userId?: string; avatar?: string }

/**
 * Récupère les joueurs dans une room
 */
function getPlayersInRoom(io: Server, roomId: string): Player[] {
  const room = io.sockets.adapter.rooms.get(roomId)
  const socketsInRoom = room ? Array.from(room) : []

  return socketsInRoom.map((socketId) => {
    const s = io.sockets.sockets.get(socketId)
    return {
      id: socketId,
      name: s?.data?.playerName || 'Unknown',
      userId: s?.data?.userId || undefined,
      avatar: s?.data?.avatar || undefined,
    }
  })
}

/**
 * Configure les gestionnaires d'événements pour les rooms
 */
export function setupRoomHandlers(
  io: Server,
  socket: Socket,
  roomStates: Map<string, { started: boolean }>,
  supabase: SupabaseClient
) {
  /**
   * Rejoindre une room
   */
  socket.on('join_room', async (roomId: string) => {
    // Vérifier que l'utilisateur est authentifié
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Non authentifié' })
      return
    }

    // SÉCURITÉ : Vérifier que la partie existe dans la base de données
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, status')
        .eq('id', roomId)
        .single()

      if (gameError || !gameData) {
        console.log(`[ROOM] ❌ Tentative de rejoindre une partie inexistante: ${roomId}`)
        socket.emit('game_not_found', { 
          message: 'Cette partie n\'existe pas ou a été supprimée.' 
        })
        return
      }

      // Vérifier que la partie n'est pas déjà terminée
      if (gameData.status === 'finished') {
        console.log(`[ROOM] ❌ Tentative de rejoindre une partie terminée: ${roomId}`)
        socket.emit('game_not_found', { 
          message: 'Cette partie est terminée.' 
        })
        return
      }
    } catch (err) {
      console.error('[ROOM] Erreur lors de la vérification de la partie:', err)
      socket.emit('error', { message: 'Erreur lors de la vérification de la partie' })
      return
    }

    // Utiliser le username authentifié
    const playerName = socket.data.username
    socket.data.playerName = playerName

    // Récupérer l'avatar de l'utilisateur depuis la base de données
    const userId = socket.data.userId
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', userId)
          .single()

        if (!error && data) {
          socket.data.avatar = data.avatar_url
        }
      } catch (err) {
        console.error('[ROOM] Erreur lors de la récupération de l\'avatar:', err)
      }
    }

    // Vérifier si la partie est déjà en cours
    const roomState = roomStates.get(roomId)
    const isGameStarted = roomState?.started || false

    // SÉCURITÉ : Vérifier avant de rejoindre la room
    if (!isGameStarted) {
      // Partie pas encore démarrée : vérifier que l'utilisateur n'est pas déjà dans la waiting room
      const existingPlayers = getPlayersInRoom(io, roomId)
      const alreadyInRoom = existingPlayers.some(player => 
        player.userId && player.userId === userId && player.id !== socket.id
      )
      
      if (alreadyInRoom) {
        console.log(`[ROOM] ❌ ${playerName} (${userId}) tente de rejoindre une partie où il est déjà présent`)
        socket.emit('error', { 
          message: 'Vous êtes déjà dans cette partie. Vous ne pouvez pas jouer contre vous-même.' 
        })
        // Déconnecter le socket après un court délai pour s'assurer que le message soit envoyé
        setTimeout(() => {
          socket.disconnect()
        }, 100)
        return
      }
    } else {
      // Partie en cours : vérifier que l'utilisateur fait partie de cette partie (reconnexion légitime)
      const gameState = getGameState(roomId)
      if (gameState && userId) {
        const isPlayerInGame = gameState.players.some(p => p.userId === userId)
        if (!isPlayerInGame) {
          console.log(`[ROOM] ❌ ${playerName} (${userId}) tente de rejoindre une partie en cours où il n'est pas joueur`)
          socket.emit('error', { 
            message: 'Vous ne pouvez pas rejoindre cette partie en cours.' 
          })
          // Déconnecter le socket après un court délai pour s'assurer que le message soit envoyé
          setTimeout(() => {
            socket.disconnect()
          }, 100)
          return
        }
      }
    }

    // Rejoindre la room (seulement après toutes les vérifications)
    socket.join(roomId)

    // Récupérer les joueurs dans la room
    const players = getPlayersInRoom(io, roomId)

    if (isGameStarted) {
      // La partie est en cours : gérer la reconnexion
      const gameState = getGameState(roomId)
      if (gameState) {
        console.log(`[ROOM] ${playerName} se reconnecte à une partie en cours`)
        
        // Mettre à jour le socket.id du joueur dans le gameState
        if (userId) {
          const updated = updatePlayerSocketId(roomId, userId, socket.id)
          if (updated) {
            console.log(`[ROOM] Socket.id mis à jour pour ${playerName}`)
          }
        }
        
        // Récupérer l'état mis à jour
        const updatedGameState = getGameState(roomId)
        if (updatedGameState) {
          // Envoyer l'état actuel au joueur qui se reconnecte
          socket.emit('game_started', updatedGameState)
          
          // Envoyer l'état mis à jour à TOUS les joueurs (pour sync les socket.id)
          io.to(roomId).emit('game_update', updatedGameState)
          
          // Vérifier si le joueur est en statut abandonné
          const reconnectingPlayer = updatedGameState.players.find(p => p.userId === userId)
          const isAbandoned = reconnectingPlayer?.abandoned || false
          
          // Notifier les autres joueurs de la reconnexion
          if (isAbandoned) {
            socket.to(roomId).emit('system_message', `${playerName} s'est reconnecté (spectateur)`)
            console.log(`[ROOM] ${playerName} se reconnecte en tant que spectateur (abandonné)`)
          } else {
            socket.to(roomId).emit('system_message', `${playerName} s'est reconnecté`)
            
            // Si c'est le tour du joueur qui se reconnecte, le notifier
            const currentPlayer = updatedGameState.players[updatedGameState.currentPlayerIndex]
            if (currentPlayer.userId === userId) {
              console.log(`[ROOM] C'est le tour de ${playerName} (reconnecté)`)
              io.to(roomId).emit('system_message', `C'est au tour de ${playerName}`)
            }
          }
        }
      }
    } else {
      // La partie n'a pas démarré : envoyer la room_update
      io.to(roomId).emit('room_update', {
        players,
        started: false,
      })
      io.to(roomId).emit('system_message', `${playerName} a rejoint la partie`)
    }
  })

  /**
   * Démarrer une partie
   */
  socket.on('start_game', async (roomId: string) => {
    // Marquer que la partie a démarré
    roomStates.set(roomId, { started: true })

    // Récupérer les joueurs
    const players = getPlayersInRoom(io, roomId)

    // Récupérer la variante depuis la base de données
    let variant: 'classic' | 'descending' | 'ascending' = 'classic'
    try {
      const { data, error } = await supabase
        .from('games')
        .select('variant')
        .eq('id', roomId)
        .single()

      if (!error && data) {
        variant = data.variant || 'classic'
      }
    } catch (err) {
      console.error('[GAME] Erreur lors de la récupération de la variante:', err)
    }

    // Initialiser l'état du jeu avec la variante
    const gameState = initializeGame(roomId, players, variant)

    // Mettre à jour le status dans la base de données
    supabase
      .from('games')
      .update({ status: 'in_progress' })
      .eq('id', roomId)
      .then(({ error }) => {
        if (error) {
          console.error('[GAME] Erreur lors de la mise à jour du status:', error)
        }
      })

    // Émettre l'événement de démarrage
    io.to(roomId).emit('game_started', gameState)
    
    // Annoncer le début du premier tour
    io.to(roomId).emit('system_message', '🎯 Début du tour 1')
    
    // Annoncer quel joueur commence
    const firstPlayer = gameState.players[0]
    io.to(roomId).emit('system_message', `C'est au tour de ${firstPlayer.name}`)
  })

  /**
   * Quitter une room (avant que la partie démarre)
   */
  socket.on('leave_room', (roomId: string) => {
    const playerName = socket.data.playerName || 'Un joueur'

    // Quitter la room
    socket.leave(roomId)

    // Récupérer les joueurs restants
    const players = getPlayersInRoom(io, roomId)

    // Notifier les joueurs restants
    io.to(roomId).emit('room_update', {
      players,
      started: false,
    })

    io.to(roomId).emit('system_message', `${playerName} a quitté la partie`)

    // Si c'était l'hôte et qu'il reste des joueurs, notifier le transfert
    if (players.length > 0) {
      const newHost = players[0]
      io.to(roomId).emit('system_message', `${newHost.name} est maintenant l'hôte`)
    }
  })
}

