/**
 * Composant de barre d'XP
 * Affiche l'XP actuel et l'XP requis pour le prochain level
 */

'use client'

import { xpForLevel } from '@/lib/userStats'

interface XPBarProps {
  /** XP actuel du joueur */
  currentXp: number
  /** Level actuel du joueur */
  currentLevel: number
  /** Taille de la barre (petite, moyenne, grande) */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Composant de barre d'XP
 */
export default function XPBar({ currentXp, currentLevel, size = 'md' }: XPBarProps) {
  // xpForLevel(n) retourne l'XP total nécessaire pour atteindre le level n
  // La fonction levelFromXp vérifie: xpForLevel(level + 1) > xp pour déterminer le level
  // Donc:
  // - Level 1: 0 <= xp < xpForLevel(2)
  // - Level 2: xpForLevel(2) <= xp < xpForLevel(3)
  // - Level n: xpForLevel(n) <= xp < xpForLevel(n + 1)
  
  // XP minimum pour être au level actuel (début du level)
  const xpMinForCurrentLevel = currentLevel === 1 ? 0 : xpForLevel(currentLevel)
  
  // XP minimum pour être au level suivant (fin du level actuel)
  const xpMinForNextLevel = xpForLevel(currentLevel + 1)
  
  // XP nécessaire pour passer du level actuel au prochain level
  const xpNeededForNext = xpMinForNextLevel - xpMinForCurrentLevel
  
  // XP gagné depuis le début du level actuel
  const xpInCurrentLevel = Math.max(0, currentXp - xpMinForCurrentLevel)
  
  // Pourcentage de progression vers le prochain level
  const progressPercent = xpNeededForNext > 0 
    ? Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100))
    : 100
  
  // Tailles de la barre
  const sizeClasses = {
    sm: 'h-2 text-xs',
    md: 'h-3 text-sm',
    lg: 'h-4 text-base',
  }
  
  return (
    <div className="w-full">
      {/* Informations XP */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Level {currentLevel}</span>
          <span className="text-base-content/60">•</span>
          <span className="text-base-content/70">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
          </span>
        </div>
        <div className="text-base-content/60">
          {currentXp.toLocaleString()} XP total
        </div>
      </div>
      
      {/* Barre de progression */}
      <div className={`w-full bg-base-300 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out flex items-center justify-end pr-2"
          style={{ width: `${progressPercent}%` }}
        >
          {progressPercent > 15 && (
            <span className="text-primary-content font-semibold text-xs">
              {Math.round(progressPercent)}%
            </span>
          )}
        </div>
      </div>
      
      {/* Pourcentage si la barre est trop petite */}
      {progressPercent <= 15 && (
        <div className="text-right mt-1 text-xs text-base-content/60">
          {Math.round(progressPercent)}% vers Level {currentLevel + 1}
        </div>
      )}
    </div>
  )
}

