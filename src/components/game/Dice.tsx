'use client'

import { Die } from '@/types/game'
import { useState, useEffect } from 'react'

interface DiceProps {
  dice: Die[]
  onToggleLock?: (index: number) => void
  canRoll: boolean
  isRolling?: boolean
  rollCount?: number
}

export default function Dice({ dice, onToggleLock, canRoll, isRolling = false, rollCount = 0 }: DiceProps) {
  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {dice.map((die, index) => (
        <DieComponent
          key={`${index}-${rollCount}`}
          die={die}
          index={index}
          onToggleLock={onToggleLock}
          canInteract={canRoll && !!onToggleLock}
          isRolling={isRolling && !die.locked}
        />
      ))}
    </div>
  )
}

interface DieComponentProps {
  die: Die
  index: number
  onToggleLock?: (index: number) => void
  canInteract: boolean
  isRolling: boolean
}

function DieComponent({ die, index, onToggleLock, canInteract, isRolling }: DieComponentProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [displayValue, setDisplayValue] = useState(die.value)

  useEffect(() => {
    // Quand on ne lance pas les dés, on s'assure d'afficher la vraie valeur
    if (!isRolling) {
      setDisplayValue(die.value)
      return
    }
  }, [isRolling, die.value])

  useEffect(() => {
    if (!isRolling) {
      setIsAnimating(false)
      return
    }

    setIsAnimating(true)

    // Pendant l'animation, faire défiler des valeurs aléatoires
    const interval = setInterval(() => {
      setDisplayValue((prev) => {
        // Générer une valeur entre 1 et 6, différente si possible
        let next = Math.floor(Math.random() * 6) + 1
        if (next === prev) {
          next = ((next % 6) || 6)
        }
        return next
      })
    }, 80)

    // Arrêter l'animation après 600ms et afficher la vraie valeur
    const timeout = setTimeout(() => {
      setIsAnimating(false)
      setDisplayValue(die.value)
    }, 600)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isRolling, die.value])

  return (
    <button
      onClick={() => canInteract && onToggleLock?.(index)}
      disabled={!canInteract}
      className={`
        relative w-20 h-20 rounded-xl font-bold text-4xl
        shadow-lg
        transition-all duration-200
        ${die.locked 
          ? 'bg-gradient-to-br from-primary to-primary-focus text-primary-content border-4 border-primary scale-95' 
          : 'bg-gradient-to-br from-base-100 to-base-200 border-4 border-base-300 hover:border-primary hover:scale-105'
        }
        ${canInteract ? 'cursor-pointer hover:shadow-xl' : 'cursor-not-allowed opacity-60'}
        ${isAnimating ? 'animate-roll' : ''}
        flex items-center justify-center
      `}
      style={{
        animationDelay: `${index * 50}ms`
      }}
    >
      {die.locked && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-error rounded-full flex items-center justify-center text-xs z-50">
          🔒
        </div>
      )}
      <DieDotsDisplay value={displayValue} />
    </button>
  )
}

function DieDotsDisplay({ value }: { value: number }) {

  const renderDots = () => {
    const patterns = {
      1: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div></div><div></div><div></div>
          <div></div><div className="flex items-center justify-center"><div className="die-dot"></div></div><div></div>
          <div></div><div></div><div></div>
        </div>
      ),
      2: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div className="flex items-start justify-start"><div className="die-dot"></div></div><div></div><div></div>
          <div></div><div></div><div></div>
          <div></div><div></div><div className="flex items-end justify-end"><div className="die-dot"></div></div>
        </div>
      ),
      3: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div className="flex items-start justify-start"><div className="die-dot"></div></div><div></div><div></div>
          <div></div><div className="flex items-center justify-center"><div className="die-dot"></div></div><div></div>
          <div></div><div></div><div className="flex items-end justify-end"><div className="die-dot"></div></div>
        </div>
      ),
      4: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div className="flex items-start justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-start justify-end"><div className="die-dot"></div></div>
          <div></div><div></div><div></div>
          <div className="flex items-end justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-end justify-end"><div className="die-dot"></div></div>
        </div>
      ),
      5: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div className="flex items-start justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-start justify-end"><div className="die-dot"></div></div>
          <div></div><div className="flex items-center justify-center"><div className="die-dot"></div></div><div></div>
          <div className="flex items-end justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-end justify-end"><div className="die-dot"></div></div>
        </div>
      ),
      6: (
        <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full p-2">
          <div className="flex items-start justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-start justify-end"><div className="die-dot"></div></div>
          <div className="flex items-center justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-center justify-end"><div className="die-dot"></div></div>
          <div className="flex items-end justify-start"><div className="die-dot"></div></div><div></div><div className="flex items-end justify-end"><div className="die-dot"></div></div>
        </div>
      ),
    }
    
    return patterns[value as keyof typeof patterns] || <span>{value}</span>
  }

  return (
    <div 
      className="w-full h-full flex items-center justify-center"
      style={{
        transform: 'rotate(0deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      {renderDots()}
    </div>
  )
}

