/**
 * Composant pour afficher la catégorie active à remplir
 * Utilisé dans les variantes montante et descendante
 */

'use client'

import { ScoreCategory } from '@/types/game'

interface ActiveCategoryCardProps {
  category: ScoreCategory
  categoryLabel: string
  categoryDescription: string
  potentialScore: number
  onValidate: () => void
  canValidate: boolean // Vrai si au moins un lancer a été effectué
}

/**
 * Descriptions des catégories pour l'affichage
 */
const CATEGORY_DESCRIPTIONS: Record<ScoreCategory, string> = {
  ones: 'Somme des 1',
  twos: 'Somme des 2',
  threes: 'Somme des 3',
  fours: 'Somme des 4',
  fives: 'Somme des 5',
  sixes: 'Somme des 6',
  threeOfKind: '3 dés identiques',
  fourOfKind: '4 dés identiques',
  fullHouse: '3 + 2 identiques (25 pts)',
  smallStraight: '4 dés consécutifs (30 pts)',
  largeStraight: '5 dés consécutifs (40 pts)',
  yams: '5 dés identiques (50 pts)',
  chance: 'Somme de tous les dés',
}

/**
 * Carte affichant la catégorie active et le bouton de validation
 */
export default function ActiveCategoryCard({
  category,
  categoryLabel,
  categoryDescription,
  potentialScore,
  onValidate,
  canValidate,
}: ActiveCategoryCardProps) {
  // Utiliser la description depuis le dictionnaire si disponible
  const description = CATEGORY_DESCRIPTIONS[category] || categoryDescription

  return (
    <div className="card shadow-xl max-w-3xl mx-auto">
      <div className="card-body p-4">
        {/* En-tête */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-bold text-lg">Catégorie en cours</h3>
        </div>

        {/* Ligne de catégorie (ressemble à ScoreLine mais plus grande) */}
        <div className="glass rounded-lg p-4 shadow-md border-l-4 border-primary">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <div className="font-bold text-xl">{categoryLabel}</div>
              <div className="text-sm text-base-content/70">{description}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-3xl text-primary">
                {potentialScore}
              </div>
              <div className="text-xs text-base-content/60">points</div>
            </div>
          </div>
        </div>

        {/* Bouton de validation */}
        <button
          onClick={onValidate}
          disabled={!canValidate}
          className={`btn btn-lg gap-2 mt-3 ${
            canValidate ? 'btn-primary' : 'btn-disabled'
          }`}
        >
          {canValidate ? (
            <>
              <span>✓</span>
              <span>Valider ce score</span>
            </>
          ) : (
            <>
              <span>🎲</span>
              <span>Lancez les dés pour commencer</span>
            </>
          )}
        </button>

        {/* Indication */}
        {canValidate && (
          <p className="text-xs text-center text-base-content/60 mt-2">
            💡 Vous pouvez valider maintenant ou relancer les dés
          </p>
        )}
      </div>
    </div>
  )
}

