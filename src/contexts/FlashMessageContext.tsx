/**
 * Contexte pour gérer les flash messages d'achievements
 */

'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Achievement } from '@/types/achievement'

interface FlashMessage {
  id: string
  achievement: Achievement
  timestamp: number
}

interface FlashMessageContextType {
  showAchievement: (achievement: Achievement) => void
  messages: FlashMessage[]
  removeMessage: (id: string) => void
}

const FlashMessageContext = createContext<FlashMessageContextType | undefined>(undefined)

export function FlashMessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<FlashMessage[]>([])

  const showAchievement = (achievement: Achievement) => {
    const id = `${achievement.id}-${Date.now()}`
    const newMessage: FlashMessage = {
      id,
      achievement,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, newMessage])

    // Auto-remove après 8 secondes
    setTimeout(() => {
      removeMessage(id)
    }, 8000)
  }

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id))
  }

  return (
    <FlashMessageContext.Provider value={{ showAchievement, messages, removeMessage }}>
      {children}
    </FlashMessageContext.Provider>
  )
}

export function useFlashMessage() {
  const context = useContext(FlashMessageContext)
  if (!context) {
    throw new Error('useFlashMessage must be used within FlashMessageProvider')
  }
  return context
}

