import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as IOServer } from 'socket.io'

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
      
      io.to(roomId).emit('game_started')
      console.log(`✅ Partie démarrée dans la room ${roomId}`)
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
      
      console.log(`🏳️ ${playerName} abandonne la partie ${roomId}`)
      
      // Quitter la room
      socket.leave(roomId)
      
      // Vérifier combien de joueurs restent
      const room = io.sockets.adapter.rooms.get(roomId)
      const socketsInRoom = room ? Array.from(room) : []
      
      const players = socketsInRoom.map(socketId => {
        const s = io.sockets.sockets.get(socketId)
        return {
          id: socketId,
          name: s?.data?.playerName || 'Unknown',
        }
      })
      
      io.to(roomId).emit('system_message', `${playerName} a abandonné la partie`)
      
      // Logique selon le nombre de joueurs restants
      if (players.length === 0) {
        // Plus personne, partie annulée
        console.log(`❌ Partie ${roomId} annulée (aucun joueur restant)`)
        roomStates.delete(roomId)
      } else if (players.length === 1) {
        // Un seul joueur reste, il gagne par défaut
        const winner = players[0]
        console.log(`🏆 ${winner.name} gagne par abandon dans ${roomId}`)
        io.to(roomId).emit('game_ended', {
          winner: winner.name,
          reason: 'abandon',
          message: `${winner.name} remporte la partie par abandon !`
        })
        roomStates.delete(roomId)
      } else {
        // 2+ joueurs restent, la partie continue
        console.log(`▶️ La partie ${roomId} continue avec ${players.length} joueurs`)
        io.to(roomId).emit('room_update', {
          players,
          started: true,
        })
        io.to(roomId).emit('system_message', `La partie continue avec ${players.length} joueurs`)
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
