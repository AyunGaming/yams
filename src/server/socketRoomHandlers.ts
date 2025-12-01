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
type RoomState = { started: boolean }

// Stocke les timers de compte à rebours par room
const countdownTimers = new Map<string, NodeJS.Timeout>()

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
  roomStates: Map<string, RoomState>,
  supabase: SupabaseClient
) {
  /**
   * Lance réellement la partie après le compte à rebours
   */
  async function startGame(roomId: string) {
    // Éviter les doubles démarrages
    const existingState = roomStates.get(roomId)
    if (existingState?.started) {
      return
    }

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
  }

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

    // Vérifier le nombre max de joueurs si la partie n'a pas démarré
    if (!isGameStarted) {
      try {
        const { data: gameData } = await supabase
          .from('games')
          .select('max_players, owner')
          .eq('id', roomId)
          .single()

        if (gameData && gameData.max_players) {
          const maxPlayers = gameData.max_players
          if (players.length >= maxPlayers) {
            socket.emit('error', { message: `La partie est complète (${maxPlayers} joueurs maximum).` })
            socket.leave(roomId)
            return
          }
        }
      } catch (err) {
        console.error('[ROOM] Erreur vérification max_players:', err)
      }
    }

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
   * Mettre à jour le nombre maximum de joueurs (owner seulement)
   */
  socket.on('update_max_players', async ({ roomId, maxPlayers }: { roomId: string; maxPlayers: number }) => {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Non authentifié' })
      return
    }

    // Vérifier que maxPlayers est valide
    if (maxPlayers < 2 || maxPlayers > 8) {
      socket.emit('error', { message: 'Le nombre de joueurs doit être entre 2 et 8.' })
      return
    }

    try {
      // Vérifier que l'utilisateur est l'owner de la partie
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('owner, status')
        .eq('id', roomId)
        .single()

      if (gameError || !gameData) {
        socket.emit('error', { message: 'Partie introuvable.' })
        return
      }

      const userId = socket.data.userId
      if (gameData.owner !== userId) {
        socket.emit('error', { message: 'Seul l\'hôte peut modifier le nombre maximum de joueurs.' })
        return
      }

      // Vérifier que la partie n'a pas démarré
      if (gameData.status !== 'waiting') {
        socket.emit('error', { message: 'Impossible de modifier le nombre de joueurs une fois la partie démarrée.' })
        return
      }

      // Vérifier que le nouveau max n'est pas inférieur au nombre actuel de joueurs
      const players = getPlayersInRoom(io, roomId)
      if (maxPlayers < players.length) {
        socket.emit('error', { message: `Impossible de réduire à ${maxPlayers} joueurs car il y a déjà ${players.length} joueur(s) dans la partie.` })
        return
      }

      // Mettre à jour dans la base de données
      const { error: updateError } = await supabase
        .from('games')
        .update({ max_players: maxPlayers })
        .eq('id', roomId)

      if (updateError) {
        console.error('[ROOM] Erreur mise à jour max_players:', updateError)
        socket.emit('error', { message: 'Erreur lors de la mise à jour.' })
        return
      }

      // Notifier tous les joueurs de la room
      io.to(roomId).emit('max_players_updated', { maxPlayers })
      io.to(roomId).emit('system_message', `Le nombre maximum de joueurs a été modifié à ${maxPlayers}.`)
    } catch (err) {
      console.error('[ROOM] Exception update_max_players:', err)
      socket.emit('error', { message: 'Erreur inattendue lors de la mise à jour.' })
    }
  })

  /**
   * Lancer un compte à rebours avant le début de la partie
   */
  socket.on('start_countdown', (roomId: string) => {
    console.log('[ROOM] start_countdown reçu pour room', roomId, 'socket', socket.id)

    const roomState = roomStates.get(roomId)

    // Si la partie a déjà démarré ou qu'un compte à rebours est en cours, ne rien faire
    if (roomState?.started || countdownTimers.has(roomId)) {
      return
    }

    const players = getPlayersInRoom(io, roomId)
    console.log('[ROOM] Joueurs dans la room pour le compte à rebours:', players.length)

    // Ne démarrer le compte à rebours que s'il y a au moins 2 joueurs
    if (players.length < 2) {
      console.log('[ROOM] Pas assez de joueurs pour démarrer le compte à rebours')
      socket.emit('system_message', 'Au moins 2 joueurs sont nécessaires pour démarrer la partie.')
      return
    }

    const TOTAL_SECONDS = 10
    let remaining = TOTAL_SECONDS

    // Notifier tout le monde du début du compte à rebours
    io.to(roomId).emit('countdown_started', remaining)

    const interval = setInterval(async () => {
      remaining -= 1

      // Si plus assez de joueurs pendant le compte à rebours, l'annuler
      const currentPlayers = getPlayersInRoom(io, roomId)
      if (currentPlayers.length < 2) {
        clearInterval(interval)
        countdownTimers.delete(roomId)
        io.to(roomId).emit('countdown_cancelled')
        io.to(roomId).emit('system_message', 'Compte à rebours annulé (pas assez de joueurs).')
        return
      }

      if (remaining > 0) {
        io.to(roomId).emit('countdown_tick', remaining)
        return
      }

      // Fin du compte à rebours
      clearInterval(interval)
      countdownTimers.delete(roomId)

      // Lance la partie
      await startGame(roomId)
    }, 1000)

    countdownTimers.set(roomId, interval)
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

    // Annuler un éventuel compte à rebours si plus assez de joueurs
    if (players.length < 2) {
      const countdown = countdownTimers.get(roomId)
      if (countdown) {
        clearInterval(countdown)
        countdownTimers.delete(roomId)
        io.to(roomId).emit('countdown_cancelled')
        io.to(roomId).emit('system_message', 'Compte à rebours annulé (pas assez de joueurs).')
      }
    }

    // Si c'était l'hôte et qu'il reste des joueurs, notifier le transfert
    if (players.length > 0) {
      const newHost = players[0]
      io.to(roomId).emit('system_message', `${newHost.name} est maintenant l'hôte`)
    }
  })
}

