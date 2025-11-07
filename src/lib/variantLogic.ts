// Logique pour les variantes du Yams

import { GameVariant, ScoreCategory, ScoreSheet } from '@/types/game'

/**
 * Ordre des catégories pour chaque variante
 */
export const CATEGORY_ORDER: Record<GameVariant, ScoreCategory[]> = {
  // Mode classique : pas d'ordre imposé (le joueur choisit)
  classic: [],
  
  // Mode descendant : du haut vers le bas de la feuille
  descending: [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfKind', 'fourOfKind', 'fullHouse', 
    'smallStraight', 'largeStraight', 'yams', 'chance'
  ],
  
  // Mode montant : du bas vers le haut de la feuille
  ascending: [
    'chance', 'yams', 'largeStraight', 'smallStraight', 
    'fullHouse', 'fourOfKind', 'threeOfKind',
    'sixes', 'fives', 'fours', 'threes', 'twos', 'ones'
  ]
}

/**
 * Noms des variantes pour l'affichage
 */
export const VARIANT_NAMES: Record<GameVariant, string> = {
  classic: 'Classique',
  descending: 'Descendante',
  ascending: 'Montante'
}

/**
 * Descriptions des variantes
 */
export const VARIANT_DESCRIPTIONS: Record<GameVariant, string> = {
  classic: 'Choisissez librement où placer vos scores',
  descending: 'Remplissez la feuille du haut vers le bas (automatique)',
  ascending: 'Remplissez la feuille du bas vers le haut (automatique)'
}

/**
 * Trouve la prochaine catégorie à remplir selon la variante
 * @param variant - Le type de variante du jeu
 * @param scoreSheet - La feuille de score actuelle du joueur
 * @returns La prochaine catégorie à remplir, ou null si toutes sont remplies
 */
export function getNextCategory(variant: GameVariant, scoreSheet: ScoreSheet): ScoreCategory | null {
  // En mode classique, pas de catégorie imposée
  if (variant === 'classic') {
    return null
  }
  
  // Obtenir l'ordre des catégories selon la variante
  const order = CATEGORY_ORDER[variant]
  
  // Trouver la première catégorie non remplie
  for (const category of order) {
    if (scoreSheet[category] === null) {
      return category
    }
  }
  
  // Toutes les catégories sont remplies
  return null
}

/**
 * Vérifie si une catégorie peut être choisie par le joueur
 * @param variant - Le type de variante du jeu
 * @param category - La catégorie que le joueur veut choisir
 * @param scoreSheet - La feuille de score actuelle du joueur
 * @returns true si la catégorie peut être choisie, false sinon
 */
export function canChooseCategory(
  variant: GameVariant, 
  category: ScoreCategory, 
  scoreSheet: ScoreSheet
): boolean {
  // La catégorie ne doit pas déjà être remplie
  if (scoreSheet[category] !== null) {
    return false
  }
  
  // En mode classique, toutes les catégories vides peuvent être choisies
  if (variant === 'classic') {
    return true
  }
  
  // En modes montant/descendant, seule la prochaine catégorie peut être choisie
  const nextCategory = getNextCategory(variant, scoreSheet)
  return category === nextCategory
}

