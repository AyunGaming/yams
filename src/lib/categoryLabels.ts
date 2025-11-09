/**
 * Labels en français pour les catégories de score
 */

import { ScoreCategory } from '@/types/game'

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  ones: 'As (1)',
  twos: 'Deux (2)',
  threes: 'Trois (3)',
  fours: 'Quatre (4)',
  fives: 'Cinq (5)',
  sixes: 'Six (6)',
  threeOfKind: 'Brelan',
  fourOfKind: 'Carré',
  fullHouse: 'Full',
  smallStraight: 'Petite suite',
  largeStraight: 'Grande suite',
  yams: 'Yams',
  chance: 'Chance',
}

/**
 * Obtient le label en français d'une catégorie
 */
export function getCategoryLabel(category: ScoreCategory): string {
  return CATEGORY_LABELS[category] || category
}

