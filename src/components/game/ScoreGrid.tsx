'use client'

import { ScoreSheet, ScoreCategory, GameVariant } from '@/types/game'
import { calculateScore } from '@/lib/yamsLogic'
import { getNextCategory, VARIANT_NAMES } from '@/lib/variantLogic'

interface ScoreGridProps {
  scoreSheet: ScoreSheet
  currentDice: number[]
  onChooseScore: (category: ScoreCategory) => void
  isMyTurn: boolean
  canChoose: boolean
  variant?: GameVariant
}
 
const CATEGORIES = {
  upper: [
    { key: 'ones' as ScoreCategory, label: 'As (1)', description: 'Somme des 1', targetScore: 3 },
    { key: 'twos' as ScoreCategory, label: 'Deux (2)', description: 'Somme des 2', targetScore: 6 },
    { key: 'threes' as ScoreCategory, label: 'Trois (3)', description: 'Somme des 3', targetScore: 9 },
    { key: 'fours' as ScoreCategory, label: 'Quatre (4)', description: 'Somme des 4', targetScore: 12 },
    { key: 'fives' as ScoreCategory, label: 'Cinq (5)', description: 'Somme des 5', targetScore: 15 },
    { key: 'sixes' as ScoreCategory, label: 'Six (6)', description: 'Somme des 6', targetScore: 18 },
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
  canChoose,
  variant = 'classic'
}: ScoreGridProps) {
  // Déterminer la prochaine catégorie à remplir (pour les variantes non-classiques)
  const nextCategory = variant !== 'classic' ? getNextCategory(variant, scoreSheet) : null
  
  const upperScore = (scoreSheet.ones || 0) + 
                     (scoreSheet.twos || 0) + 
                     (scoreSheet.threes || 0) + 
                     (scoreSheet.fours || 0) + 
                     (scoreSheet.fives || 0) + 
                     (scoreSheet.sixes || 0)
  
  const upperBonus = upperScore >= 63 ? 35 : 0
  const bonusProgress = Math.min(100, (upperScore / 63) * 100)

  // Calculer le score attendu en fonction des cases réellement remplies
  const expectedScore = CATEGORIES.upper
    .filter(cat => scoreSheet[cat.key] !== null)
    .reduce((sum, cat) => sum + cat.targetScore, 0)
  
  // Le joueur est "en avance" si son score est >= au score attendu pour les cases remplies
  const isOnTrack = expectedScore === 0 || upperScore >= expectedScore
  
  // Couleur de la barre de progression
  const progressColor = expectedScore === 0 
    ? 'progress-primary' 
    : isOnTrack 
      ? 'progress-success' 
      : 'progress-warning'

  return (
    <div className="w-full max-w-2xl">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title text-lg">Feuille de Score</h3>
            {variant !== 'classic' && (
              <div className="badge badge-primary">
                {VARIANT_NAMES[variant]}
              </div>
            )}
          </div>
          
          {/* Note: L'alerte "Prochaine catégorie" n'est plus affichée ici car elle est 
              maintenant dans ActiveCategoryCard au-dessus de la fiche */}
          
          {/* Section supérieure */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Section Supérieure</h4>
              <span className="text-sm">
                {upperScore}/63 pour bonus
              </span>
            </div>
            <progress 
              className={`progress ${progressColor} w-full mb-3`}
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
                  canChoose={variant === 'classic' && canChoose && isMyTurn && scoreSheet[cat.key] === null}
                  targetScore={cat.targetScore}
                  isNext={nextCategory === cat.key}
                  variant={variant}
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
                  canChoose={variant === 'classic' && canChoose && isMyTurn && scoreSheet[cat.key] === null}
                  isNext={nextCategory === cat.key}
                  variant={variant}
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
  category: { key: ScoreCategory; label: string; description: string; targetScore?: number }
  score: number | null
  potentialScore: number | null
  onChoose: () => void
  canChoose: boolean
  targetScore?: number
  isNext?: boolean
  variant?: GameVariant
}

function ScoreLine({ category, score, potentialScore, onChoose, canChoose, targetScore, isNext = false, variant = 'classic' }: ScoreLineProps) {
  const isChosen = score !== null
  
  // En mode non-classique, toutes les lignes sont en lecture seule
  const isReadOnly = variant !== 'classic'
  
  // Déterminer la couleur de fond si la ligne est remplie et qu'un target score existe
  let performanceColor = ''
  if (isChosen && targetScore !== undefined && score !== null) {
    if (score >= targetScore) {
      performanceColor = 'bg-success/20 border-l-4 border-success' // Bon score (au moins un triple)
    } else {
      performanceColor = 'bg-warning/20 border-l-4 border-warning' // Score en retard
    }
  }
  
  // Mettre en évidence la prochaine catégorie à remplir (uniquement en mode non-classique)
  if (isNext && !isChosen && isReadOnly) {
    performanceColor = 'bg-info/10 border-l-4 border-info' // Indication visuelle plus discrète
  }
  
  return (
    <button
      onClick={canChoose ? onChoose : undefined}
      disabled={!canChoose}
      className={`
        score-line
        ${canChoose ? '' : 'glass'}
        ${isReadOnly
          ? performanceColor || (isChosen 
            ? 'bg-base-300 cursor-default' 
            : 'bg-base-300/50 cursor-default opacity-70') // Lecture seule
          : performanceColor || (isChosen 
            ? 'bg-base-300 cursor-default' 
            : canChoose 
              ? 'bg-base-100 hover:bg-primary/20 cursor-pointer outline-2 outline outline-primary shadow-[0_0_8px_rgba(99,102,241,0.6)]' 
              : 'bg-base-100 cursor-not-allowed opacity-60'
          )
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

