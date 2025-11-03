import { Server as HTTPServer } from "http"
import { Socket } from "net"
import { Server as IOServer } from "socket.io"

export interface NextApiResponseServerIO extends Response {
  socket: Socket & {
    server: HTTPServer & {
      io?: IOServer
    }
  }
}