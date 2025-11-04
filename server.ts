// Charger les variables d'environnement en premier
import dotenv from 'dotenv'
import { resolve } from 'path'

// Charger .env.local en priorité (comme Next.js), puis .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as IOServer } from 'socket.io'
import { createClient } from '@supabase/supabase-js'
import { initializeGame, rollDice, toggleDieLock, chooseScore, removePlayer } from './src/server/gameManager'
import { ScoreCategory } from './src/types/game'

// Initialiser Supabase côté serveur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes!')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓' : '✗')
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new IOServer(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Stocker l'état des rooms (si la partie est démarrée ou non)
  const roomStates = new Map<string, { started: boolean }>()

  io.on('connection', (socket) => {
    console.log('✅ Client connecté :', socket.id)

    socket.on('join_room', ({ roomId, playerName }) => {
      // Store player name in socket data FIRST
      socket.data.playerName = playerName
      
      // Join the room
      socket.join(roomId)
      
      // Get all sockets in the room
      const room = io.sockets.adapter.rooms.get(roomId)
      const socketsInRoom = room ? Array.from(room) : []
      
      // Get player info for all sockets in room (now playerName is already set)
      const players = socketsInRoom.map(socketId => {
        const s = io.sockets.sockets.get(socketId)
        return {
          id: socketId,
          name: s?.data?.playerName || 'Unknown',
        }
      })
      
      // Emit room update to all players in the room
      io.to(roomId).emit('room_update', {
        players,
        started: false,
      })
      
      io.to(roomId).emit('system_message', `${playerName} a rejoint la partie`)
      console.log(`${playerName} a rejoint la room ${roomId}`)
    })

    socket.on('start_game', (roomId: string) => {
      // Marquer que la partie a démarré
      roomStates.set(roomId, { started: true })
      
      // Récupérer les joueurs de la room
      const room = io.sockets.adapter.rooms.get(roomId)
      const socketsInRoom = room ? Array.from(room) : []
      
      const players = socketsInRoom.map(socketId => {
        const s = io.sockets.sockets.get(socketId)
        return {
          id: socketId,
          name: s?.data?.playerName || 'Unknown',
        }
      })
      
      // Initialiser l'état du jeu
      const gameState = initializeGame(roomId, players)
      
      console.log(`🎮 État du jeu initialisé:`, JSON.stringify(gameState, null, 2))
      
      // Mettre à jour le status dans la base de données
      supabase
        .from('games')
        .update({ status: 'in_progress' })
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ Erreur lors de la mise à jour du status:', error)
          } else {
            console.log('✅ Status mis à jour en "in_progress"')
          }
        })
      
      // Émettre l'événement de démarrage avec l'état initial
      io.to(roomId).emit('game_started', gameState)
      console.log(`✅ Partie démarrée dans la room ${roomId} avec ${players.length} joueurs`)
      console.log(`📤 Événement 'game_started' émis vers ${socketsInRoom.length} clients`)
    })

    // Fonction pour quitter la room (avant que la partie démarre)
    socket.on('leave_room', (roomId: string) => {
      const playerName = socket.data.playerName || 'Un joueur'
      console.log(`${playerName} quitte volontairement la room ${roomId}`)
      
      // Quitter la room
      socket.leave(roomId)
      
      // Mettre à jour les joueurs restants
      const room = io.sockets.adapter.rooms.get(roomId)
      const socketsInRoom = room ? Array.from(room) : []
      
      const players = socketsInRoom.map(socketId => {
        const s = io.sockets.sockets.get(socketId)
        return {
          id: socketId,
          name: s?.data?.playerName || 'Unknown',
        }
      })
      
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
        console.log(`🔄 Nouvel hôte: ${newHost.name}`)
      }
    })

    // Fonction pour abandonner une partie en cours
    socket.on('abandon_game', (roomId: string) => {
      const playerName = socket.data.playerName || 'Un joueur'
      const roomState = roomStates.get(roomId)
      
      if (!roomState || !roomState.started) {
        console.log(`⚠️ Tentative d'abandon d'une partie non démarrée`)
        return
      }
      
      console.log(`🏳️ ${playerName} (${socket.id}) abandonne la partie ${roomId}`)
      
      // Retirer le joueur du gameState
      const updatedGame = removePlayer(roomId, socket.id)
      
      // Quitter la room socket
      socket.leave(roomId)
      
      io.to(roomId).emit('system_message', `${playerName} a abandonné la partie`)
      
      if (!updatedGame) {
        // Plus de joueurs, partie annulée
        console.log(`❌ Partie ${roomId} annulée (aucun joueur restant)`)
        roomStates.delete(roomId)
      } else if (updatedGame.gameStatus === 'finished') {
        // Un seul joueur reste, il gagne
        console.log(`🏆 ${updatedGame.winner} gagne par abandon dans ${roomId}`)
        
        // Mettre à jour la base de données
        supabase
          .from('games')
          .update({
            status: 'finished',
            winner: updatedGame.winner,
          })
          .eq('id', roomId)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Erreur lors de la mise à jour de la partie:', error)
            } else {
              console.log('✅ Partie mise à jour dans la BDD (victoire par abandon)')
            }
          })
        
        io.to(roomId).emit('game_update', updatedGame)
        io.to(roomId).emit('game_ended', {
          winner: updatedGame.winner,
          reason: 'abandon',
          message: `${updatedGame.winner} remporte la partie par abandon !`
        })
        roomStates.delete(roomId)
      } else {
        // 2+ joueurs restent, la partie continue
        console.log(`▶️ La partie ${roomId} continue avec ${updatedGame.players.length} joueurs`)
        
        // Envoyer le gameState mis à jour
        io.to(roomId).emit('game_update', updatedGame)
        io.to(roomId).emit('system_message', `La partie continue avec ${updatedGame.players.length} joueurs`)
        
        const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex]
        io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
      }
    })

    // ========== Événements de jeu ==========

    // Lancer les dés
    socket.on('roll_dice', (roomId: string) => {
      const gameState = rollDice(roomId)
      if (gameState) {
        io.to(roomId).emit('game_update', gameState)
        console.log(`🎲 Dés lancés dans ${roomId}, lancers restants: ${gameState.rollsLeft}`)
      }
    })

    // Verrouiller/déverrouiller un dé
    socket.on('toggle_die_lock', ({ roomId, dieIndex }: { roomId: string; dieIndex: number }) => {
      const gameState = toggleDieLock(roomId, dieIndex)
      if (gameState) {
        io.to(roomId).emit('game_update', gameState)
        console.log(`🔒 Dé ${dieIndex} verrouillé/déverrouillé dans ${roomId}`)
      }
    })

    // Choisir une catégorie de score
    socket.on('choose_score', ({ roomId, category }: { roomId: string; category: ScoreCategory }) => {
      const playerId = socket.id
      const gameState = chooseScore(roomId, playerId, category)
      
      if (gameState) {
        io.to(roomId).emit('game_update', gameState)
        
        if (gameState.gameStatus === 'finished') {
          // Mettre à jour la base de données
          supabase
            .from('games')
            .update({
              status: 'finished',
              winner: gameState.winner,
            })
            .eq('id', roomId)
            .then(({ error }) => {
              if (error) {
                console.error('❌ Erreur lors de la mise à jour de la partie:', error)
              } else {
                console.log('✅ Partie mise à jour dans la BDD')
              }
            })

          io.to(roomId).emit('game_ended', {
            winner: gameState.winner,
            reason: 'completed',
            message: `${gameState.winner} remporte la partie !`,
          })
          console.log(`🏆 Partie terminée dans ${roomId}, gagnant: ${gameState.winner}`)
        } else {
          const currentPlayer = gameState.players[gameState.currentPlayerIndex]
          io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
        }
      }
    })

    socket.on('disconnect', () => {
      console.log('❌ Déconnexion :', socket.id, socket.data.playerName || 'Unknown')
      
      // Notifier toutes les rooms auxquelles le joueur appartenait
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id) { // Ignore la room personnelle du socket
          const room = io.sockets.adapter.rooms.get(roomId)
          const socketsInRoom = room ? Array.from(room) : []
          
          const players = socketsInRoom.map(socketId => {
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
          
          io.to(roomId).emit('system_message', `${socket.data.playerName || 'Un joueur'} a quitté la partie`)
        }
      })
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('🧩 Socket.IO server initialized')
  })
})
