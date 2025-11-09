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

  useEffect(() => {
    if (isRolling) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
  }, [isRolling])

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
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-error rounded-full flex items-center justify-center text-xs">
          🔒
        </div>
      )}
      <DieDotsDisplay value={die.value} />
      
      <style jsx>{`
        @keyframes roll {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(90deg) scale(1.1); }
          50% { transform: rotate(180deg) scale(0.9); }
          75% { transform: rotate(270deg) scale(1.1); }
        }
        .animate-roll {
          animation: roll 0.6s ease-in-out;
        }
      `}</style>
    </button>
  )
}

function DieDotsDisplay({ value }: { value: number }) {
  const renderDots = () => {
    const dotClass = "w-3 h-3 rounded-full bg-current"
    
    const patterns = {
      1: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div></div><div></div><div></div>
          <div></div><div className={dotClass}></div><div></div>
          <div></div><div></div><div></div>
        </div>
      ),
      2: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div className={dotClass}></div><div></div><div></div>
          <div></div><div></div><div></div>
          <div></div><div></div><div className={dotClass}></div>
        </div>
      ),
      3: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div className={dotClass}></div><div></div><div></div>
          <div></div><div className={dotClass}></div><div></div>
          <div></div><div></div><div className={dotClass}></div>
        </div>
      ),
      4: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
          <div></div><div></div><div></div>
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
        </div>
      ),
      5: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
          <div></div><div className={dotClass}></div><div></div>
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
        </div>
      ),
      6: (
        <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
          <div className={dotClass}></div><div></div><div className={dotClass}></div>
        </div>
      ),
    }
    
    return patterns[value as keyof typeof patterns] || <span>{value}</span>
  }

  return <div className="w-full h-full flex items-center justify-center">{renderDots()}</div>
}

