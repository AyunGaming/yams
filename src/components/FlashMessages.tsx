/**
 * Composant pour afficher les flash messages d'achievements
 */

'use client'

import Image from 'next/image'
import { useFlashMessage } from '@/contexts/FlashMessageContext'
import { AchievementRarity } from '@/types/achievement'

const rarityColors: Record<AchievementRarity, string> = {
  Bronze: 'bg-amber-600',
  Silver: 'bg-gray-400',
  Gold: 'bg-yellow-500',
  Crystal: 'bg-cyan-400',
}

export default function FlashMessages() {
  const { messages } = useFlashMessage()

  if (messages.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`card shadow-lg ${rarityColors[msg.achievement.rarity]} text-white animate-slide-in-right`}
        >
          <div className="card-body p-3 py-3">
            <div className="flex items-center gap-2">
              <Image
                src={msg.achievement.image_path}
                alt={msg.achievement.name}
                width={80}
                height={80}
                className="w-16 h-16 md:w-20 md:h-20 object-contain flex-shrink-0 rounded-full bg-black/10 mr-2"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-base mb-0.5">
                  Succès débloqué ! 🏆
                </h3>
                <p className="font-semibold text-xs md:text-sm mb-0.5 line-clamp-1">
                  {msg.achievement.name}
                </p>
                <p className="text-[11px] md:text-xs opacity-90 leading-snug line-clamp-2">
                  {msg.achievement.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

