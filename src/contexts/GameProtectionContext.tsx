/**
 * Contexte pour protéger contre l'abandon accidentel d'une partie en cours
 */

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Socket } from 'socket.io-client'

interface GameProtectionContextType {
  isInActiveGame: boolean
  setIsInActiveGame: (value: boolean) => void
  socket: Socket | null
  setSocket: (socket: Socket | null) => void
  roomId: string | null
  setRoomId: (roomId: string | null) => void
  handleAbandonBeforeNavigation: () => void
}

const GameProtectionContext = createContext<GameProtectionContextType | undefined>(undefined)

export function GameProtectionProvider({ children }: { children: ReactNode }) {
  const [isInActiveGame, setIsInActiveGame] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)

  const handleAbandonBeforeNavigation = () => {
    if (socket && roomId && isInActiveGame) {
      console.log('[NAV] Émission abandon_game avant navigation')
      socket.emit('abandon_game', roomId)
      // Attendre un peu pour que l'événement soit traité avant de déconnecter
      setTimeout(() => {
        socket.disconnect()
      }, 100)
    }
  }

  return (
    <GameProtectionContext.Provider 
      value={{ 
        isInActiveGame, 
        setIsInActiveGame, 
        socket, 
        setSocket,
        roomId,
        setRoomId,
        handleAbandonBeforeNavigation
      }}
    >
      {children}
    </GameProtectionContext.Provider>
  )
}

export function useGameProtection() {
  const context = useContext(GameProtectionContext)
  if (context === undefined) {
    throw new Error('useGameProtection must be used within a GameProtectionProvider')
  }
  return context
}

