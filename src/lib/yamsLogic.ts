// Logique du jeu de Yams

import { ScoreCategory, ScoreSheet } from '@/types/game'

/**
 * Calcule le score pour une catégorie donnée avec les dés actuels
 */
export function calculateScore(category: ScoreCategory, diceValues: number[]): number {
  const sorted = [...diceValues].sort((a, b) => a - b)
  const counts = getCounts(diceValues)
  
  switch (category) {
    case 'ones':
      return sumOfNumber(diceValues, 1)
    case 'twos':
      return sumOfNumber(diceValues, 2)
    case 'threes':
      return sumOfNumber(diceValues, 3)
    case 'fours':
      return sumOfNumber(diceValues, 4)
    case 'fives':
      return sumOfNumber(diceValues, 5)
    case 'sixes':
      return sumOfNumber(diceValues, 6)
    case 'threeOfKind':
      return hasNOfKind(counts, 3) ? sumAll(diceValues) : 0
    case 'fourOfKind':
      return hasNOfKind(counts, 4) ? sumAll(diceValues) : 0
    case 'fullHouse':
      return isFullHouse(counts) ? 25 : 0
    case 'smallStraight':
      return isSmallStraight(sorted) ? 30 : 0
    case 'largeStraight':
      return isLargeStraight(sorted) ? 40 : 0
    case 'yams':
      return hasNOfKind(counts, 5) ? 50 : 0
    case 'chance':
      return sumAll(diceValues)
    default:
      return 0
  }
}

/**
 * Compte les occurrences de chaque valeur de dé
 */
function getCounts(diceValues: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const value of diceValues) {
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

/**
 * Somme tous les dés d'une valeur spécifique
 */
function sumOfNumber(diceValues: number[], target: number): number {
  return diceValues.filter(v => v === target).reduce((sum, v) => sum + v, 0)
}

/**
 * Somme tous les dés
 */
function sumAll(diceValues: number[]): number {
  return diceValues.reduce((sum, v) => sum + v, 0)
}

/**
 * Vérifie si on a au moins N dés identiques
 */
function hasNOfKind(counts: Map<number, number>, n: number): boolean {
  return Array.from(counts.values()).some(count => count >= n)
}

/**
 * Vérifie si c'est un Full House (3 identiques + 2 identiques)
 */
function isFullHouse(counts: Map<number, number>): boolean {
  const values = Array.from(counts.values()).sort()
  return values.length === 2 && values[0] === 2 && values[1] === 3
}

/**
 * Vérifie si c'est une petite suite (4 dés consécutifs)
 */
function isSmallStraight(sorted: number[]): boolean {
  const unique = [...new Set(sorted)]
  const straights = [
    [1, 2, 3, 4],
    [2, 3, 4, 5],
    [3, 4, 5, 6]
  ]
  return straights.some(straight => 
    straight.every(num => unique.includes(num))
  )
}

/**
 * Vérifie si c'est une grande suite (5 dés consécutifs)
 */
function isLargeStraight(sorted: number[]): boolean {
  const unique = [...new Set(sorted)]
  if (unique.length !== 5) return false
  
  return (
    JSON.stringify(unique) === JSON.stringify([1, 2, 3, 4, 5]) ||
    JSON.stringify(unique) === JSON.stringify([2, 3, 4, 5, 6])
  )
}

/**
 * Calcule le score total d'une feuille de score
 */
export function calculateTotalScore(scoreSheet: ScoreSheet): number {
  let total = 0
  
  // Section supérieure
  const upperSection = (scoreSheet.ones || 0) + 
                       (scoreSheet.twos || 0) + 
                       (scoreSheet.threes || 0) + 
                       (scoreSheet.fours || 0) + 
                       (scoreSheet.fives || 0) + 
                       (scoreSheet.sixes || 0)
  
  // Bonus si section supérieure >= 63
  const upperBonus = upperSection >= 63 ? 35 : 0
  total += upperSection + upperBonus
  
  // Section inférieure
  total += (scoreSheet.threeOfKind || 0)
  total += (scoreSheet.fourOfKind || 0)
  total += (scoreSheet.fullHouse || 0)
  total += (scoreSheet.smallStraight || 0)
  total += (scoreSheet.largeStraight || 0)
  total += (scoreSheet.yams || 0)
  total += (scoreSheet.chance || 0)
  
  return total
}

/**
 * Crée une feuille de score vide
 */
export function createEmptyScoreSheet(): ScoreSheet {
  return {
    ones: null,
    twos: null,
    threes: null,
    fours: null,
    fives: null,
    sixes: null,
    threeOfKind: null,
    fourOfKind: null,
    fullHouse: null,
    smallStraight: null,
    largeStraight: null,
    yams: null,
    chance: null,
  }
}

/**
 * Vérifie si toutes les catégories sont remplies
 */
export function isScoreSheetComplete(scoreSheet: ScoreSheet): boolean {
  return Object.values(scoreSheet).every(score => score !== null)
}

