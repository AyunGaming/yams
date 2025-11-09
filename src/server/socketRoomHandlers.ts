/**
 * Gestionnaires d'événements Socket.IO pour les rooms (salle d'attente)
 * Gère join_room, leave_room, start_game
 */

import { Server, Socket } from 'socket.io'
import { SupabaseClient } from '@supabase/supabase-js'
import { initializeGame } from './gameManager'
import { startTurnTimerWithCallbacks } from './timerUtils'
import { updateGameStatus } from './gameDbUtils'
import { verifyGameExists, verifyNotAlreadyInWaitingRoom, verifyCanReconnectToGame, fetchUserAvatar } from './roomSecurityHelpers'
import { handlePlayerReconnection } from './roomReconnectionHelpers'

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
    const gameExists = await verifyGameExists(supabase, roomId, socket)
    if (!gameExists) return

    // Utiliser le username authentifié
    const playerName = socket.data.username
    socket.data.playerName = playerName

    // Récupérer l'avatar de l'utilisateur depuis la base de données
    const userId = socket.data.userId
    if (userId) {
      socket.data.avatar = await fetchUserAvatar(supabase, userId)
    }

    // Vérifier si la partie est déjà en cours
    const roomState = roomStates.get(roomId)
    const isGameStarted = roomState?.started || false

    // SÉCURITÉ : Vérifier avant de rejoindre la room
    if (!isGameStarted) {
      // Partie pas encore démarrée : vérifier que l'utilisateur n'est pas déjà dans la waiting room
      const canJoin = verifyNotAlreadyInWaitingRoom(io, roomId, userId, socket.id, socket, getPlayersInRoom)
      if (!canJoin) return
    } else {
      // Partie en cours : vérifier que l'utilisateur fait partie de cette partie (reconnexion légitime)
      const canReconnect = verifyCanReconnectToGame(roomId, userId, socket)
      if (!canReconnect) return
    }

    // Rejoindre la room (seulement après toutes les vérifications)
    socket.join(roomId)

    // Récupérer les joueurs dans la room
    const players = getPlayersInRoom(io, roomId)

    if (isGameStarted) {
      // La partie est en cours : gérer la reconnexion
      handlePlayerReconnection(io, socket, roomId, userId, playerName)
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
    updateGameStatus(supabase, roomId, 'in_progress')

    // Émettre l'événement de démarrage
    io.to(roomId).emit('game_started', gameState)
    
    // Annoncer le début du premier tour
    io.to(roomId).emit('system_message', '🎯 Début du tour 1')
    
    // Annoncer quel joueur commence
    const firstPlayer = gameState.players[0]
    io.to(roomId).emit('system_message', `C'est au tour de ${firstPlayer.name}`)
    
    // Démarrer le timer pour le premier tour
    startTurnTimerWithCallbacks(io, roomId)
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

