/**
 * Module de gestion des dés
 * Responsable de la création et du lancer des dés
 */

import { Die } from '../types/game'

/**
 * Lance un dé (valeur entre 1 et 6)
 */
function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Crée 5 dés avec des valeurs aléatoires
 */
export function createDice(): Die[] {
  return Array(5).fill(null).map(() => ({
    value: rollSingleDie(),
    locked: false,
  }))
}

/**
 * Lance les dés non verrouillés
 */
export function rollUnlockedDice(dice: Die[]): Die[] {
  return dice.map(die => ({
    ...die,
    value: die.locked ? die.value : rollSingleDie(),
  }))
}

