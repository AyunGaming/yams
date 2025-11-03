'use client'

import { Die } from '@/types/game'

interface DiceProps {
  dice: Die[]
  onToggleLock: (index: number) => void
  canRoll: boolean
}

export default function Dice({ dice, onToggleLock, canRoll }: DiceProps) {
  return (
    <div className="flex gap-3 justify-center">
      {dice.map((die, index) => (
        <DieComponent
          key={index}
          die={die}
          index={index}
          onToggleLock={onToggleLock}
          canInteract={canRoll}
        />
      ))}
    </div>
  )
}

interface DieComponentProps {
  die: Die
  index: number
  onToggleLock: (index: number) => void
  canInteract: boolean
}

function DieComponent({ die, index, onToggleLock, canInteract }: DieComponentProps) {
  return (
    <button
      onClick={() => canInteract && onToggleLock(index)}
      disabled={!canInteract}
      className={`
        w-16 h-16 rounded-lg font-bold text-2xl
        transition-all duration-200
        ${die.locked 
          ? 'bg-primary text-primary-content border-2 border-primary' 
          : 'bg-base-100 border-2 border-base-300 hover:border-primary'
        }
        ${canInteract ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
        flex items-center justify-center
      `}
    >
      {getDieFace(die.value)}
    </button>
  )
}

function getDieFace(value: number): string {
  const faces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
  return faces[value] || String(value)
}

