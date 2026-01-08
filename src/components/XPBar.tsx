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
  // Si le joueur est au niveau maximum (50), afficher 0/0 XP
  const isMaxLevel = currentLevel >= 50
  
  // xpForLevel(n) retourne l'XP nécessaire pour atteindre le level n
  // L'XP repart de 0 à chaque level, donc l'XP nécessaire pour passer au level suivant
  // est directement xpForLevel(level + 1)
  
  // XP nécessaire pour passer au level suivant (directement la valeur de la formule)
  const xpNeededForNext = isMaxLevel ? 0 : xpForLevel(currentLevel + 1)
  
  // XP minimum pour être au level actuel (début du level)
  // C'est la somme de tous les XP nécessaires pour les levels précédents
  const xpMinForCurrentLevel = currentLevel === 1 ? 0 : xpForLevel(currentLevel)
  
  // XP gagné depuis le début du level actuel (repart de 0 à chaque level)
  const xpInCurrentLevel = isMaxLevel ? 0 : Math.max(0, currentXp - xpMinForCurrentLevel)
  
  // Pourcentage de progression vers le prochain level
  const progressPercent = isMaxLevel 
    ? 100 // Barre pleine au niveau max
    : (xpNeededForNext > 0 
      ? Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNext) * 100))
      : 100)
  
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
          <span className="text-base-content/60 hidden md:inline">•</span>
          <span className="text-base-content/70 hidden md:inline">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base-content/70 text-sm md:hidden">
            {xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
          </span>
          {!isMaxLevel && (
            <span className="text-base-content/60 hidden md:block">
              {currentXp.toLocaleString()} XP total
            </span>
          )}
        </div>
      </div>
      
      {/* Barre de progression */}
      <div className={`w-full bg-base-300 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="h-full transition-all duration-500 ease-out flex items-center justify-end pr-2"
          style={{ 
            width: `${progressPercent}%`,
            background: 'var(--gradient-secondary)'
          }}
        >
          {progressPercent > 15 && !isMaxLevel && (
            <span className="text-secondary-content font-semibold text-xs">
              {Math.round(progressPercent)}%
            </span>
          )}
        </div>
      </div>
      
      {/* Pourcentage si la barre est trop petite */}
      {progressPercent <= 15 && !isMaxLevel && (
        <div className="text-right mt-1 text-xs text-base-content/60 hidden md:block">
          {Math.round(progressPercent)}% vers Level {currentLevel + 1}
        </div>
      )}
    </div>
  )
}

