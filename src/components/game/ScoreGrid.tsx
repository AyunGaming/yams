'use client'

import { ScoreSheet, ScoreCategory } from '@/types/game'
import { calculateScore } from '@/lib/yamsLogic'

interface ScoreGridProps {
  scoreSheet: ScoreSheet
  currentDice: number[]
  onChooseScore: (category: ScoreCategory) => void
  isMyTurn: boolean
  canChoose: boolean
}

const CATEGORIES = {
  upper: [
    { key: 'ones' as ScoreCategory, label: 'As (1)', description: 'Somme des 1' },
    { key: 'twos' as ScoreCategory, label: 'Deux (2)', description: 'Somme des 2' },
    { key: 'threes' as ScoreCategory, label: 'Trois (3)', description: 'Somme des 3' },
    { key: 'fours' as ScoreCategory, label: 'Quatre (4)', description: 'Somme des 4' },
    { key: 'fives' as ScoreCategory, label: 'Cinq (5)', description: 'Somme des 5' },
    { key: 'sixes' as ScoreCategory, label: 'Six (6)', description: 'Somme des 6' },
  ],
  lower: [
    { key: 'threeOfKind' as ScoreCategory, label: 'Brelan', description: '3 dés identiques' },
    { key: 'fourOfKind' as ScoreCategory, label: 'Carré', description: '4 dés identiques' },
    { key: 'fullHouse' as ScoreCategory, label: 'Full', description: '3 + 2 identiques (25 pts)' },
    { key: 'smallStraight' as ScoreCategory, label: 'Petite suite', description: '4 dés consécutifs (30 pts)' },
    { key: 'largeStraight' as ScoreCategory, label: 'Grande suite', description: '5 dés consécutifs (40 pts)' },
    { key: 'yams' as ScoreCategory, label: 'Yams', description: '5 dés identiques (50 pts)' },
    { key: 'chance' as ScoreCategory, label: 'Chance', description: 'Somme de tous les dés' },
  ],
}

export default function ScoreGrid({ 
  scoreSheet, 
  currentDice, 
  onChooseScore, 
  isMyTurn,
  canChoose 
}: ScoreGridProps) {
  const upperScore = (scoreSheet.ones || 0) + 
                     (scoreSheet.twos || 0) + 
                     (scoreSheet.threes || 0) + 
                     (scoreSheet.fours || 0) + 
                     (scoreSheet.fives || 0) + 
                     (scoreSheet.sixes || 0)
  
  const upperBonus = upperScore >= 63 ? 35 : 0
  const bonusProgress = Math.min(100, (upperScore / 63) * 100)

  return (
    <div className="w-full max-w-2xl">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-4">
          <h3 className="card-title text-lg mb-4">Feuille de Score</h3>
          
          {/* Section supérieure */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Section Supérieure</h4>
              <span className="text-sm">
                {upperScore}/63 pour bonus
              </span>
            </div>
            <progress 
              className="progress progress-primary w-full mb-3" 
              value={bonusProgress} 
              max="100"
            />
            
            <div className="space-y-1">
              {CATEGORIES.upper.map(cat => (
                <ScoreLine
                  key={cat.key}
                  category={cat}
                  score={scoreSheet[cat.key]}
                  potentialScore={currentDice.length > 0 ? calculateScore(cat.key, currentDice) : null}
                  onChoose={() => onChooseScore(cat.key)}
                  canChoose={canChoose && isMyTurn && scoreSheet[cat.key] === null}
                />
              ))}
            </div>
            
            {upperBonus > 0 && (
              <div className="mt-2 p-2 bg-success/20 rounded flex justify-between">
                <span className="font-semibold">Bonus (≥63)</span>
                <span className="font-bold text-success">+35</span>
              </div>
            )}
          </div>
          
          {/* Section inférieure */}
          <div>
            <h4 className="font-semibold mb-2">Section Inférieure</h4>
            <div className="space-y-1">
              {CATEGORIES.lower.map(cat => (
                <ScoreLine
                  key={cat.key}
                  category={cat}
                  score={scoreSheet[cat.key]}
                  potentialScore={currentDice.length > 0 ? calculateScore(cat.key, currentDice) : null}
                  onChoose={() => onChooseScore(cat.key)}
                  canChoose={canChoose && isMyTurn && scoreSheet[cat.key] === null}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ScoreLineProps {
  category: { key: ScoreCategory; label: string; description: string }
  score: number | null
  potentialScore: number | null
  onChoose: () => void
  canChoose: boolean
}

function ScoreLine({ category, score, potentialScore, onChoose, canChoose }: ScoreLineProps) {
  const isChosen = score !== null
  
  return (
    <button
      onClick={canChoose ? onChoose : undefined}
      disabled={!canChoose}
      className={`
        w-full p-2 rounded flex justify-between items-center
        transition-colors
        ${isChosen 
          ? 'bg-base-300 cursor-default' 
          : canChoose 
            ? 'bg-base-100 hover:bg-primary/20 cursor-pointer border border-primary/50' 
            : 'bg-base-100 cursor-not-allowed opacity-60'
        }
      `}
    >
      <div className="text-left">
        <div className="font-medium">{category.label}</div>
        <div className="text-xs text-base-content/60">{category.description}</div>
      </div>
      <div className="text-right">
        {isChosen ? (
          <span className="font-bold text-lg">{score}</span>
        ) : potentialScore !== null && canChoose ? (
          <span className="font-bold text-lg text-primary">{potentialScore}</span>
        ) : (
          <span className="text-base-content/40">-</span>
        )}
      </div>
    </button>
  )
}

