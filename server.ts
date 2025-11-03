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
      io.to(roomId).emit('game_started')
      console.log(`Partie démarrée dans la room ${roomId}`)
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
