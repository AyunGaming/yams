/**
 * Gestionnaires d'événements Socket.IO pour la déconnexion
 * Gère disconnect et la notification aux autres joueurs
 */

import { Server, Socket } from 'socket.io'

/**
 * Configure les gestionnaires d'événements pour la déconnexion
 */
export function setupDisconnectHandlers(io: Server, socket: Socket) {
  socket.on('disconnect', () => {
    // Notifier toutes les rooms auxquelles le joueur appartenait
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        // Ignore la room personnelle du socket
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

        io.to(roomId).emit(
          'system_message',
          `${socket.data.playerName || 'Un joueur'} a quitté la partie`
        )
      }
    })
  })
}

