// Gestionnaire de l'état des parties côté serveur

import { GameState, PlayerGameState, Die, ScoreCategory } from '../types/game'
import { calculateScore, calculateTotalScore, createEmptyScoreSheet } from '../lib/yamsLogic'

// Stocker les états de jeu en mémoire
const games = new Map<string, GameState>()

/**
 * Initialise une nouvelle partie
 */
export function initializeGame(roomId: string, players: { id: string; name: string }[]): GameState {
  const gameState: GameState = {
    roomId,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      scoreSheet: createEmptyScoreSheet(),
      totalScore: 0,
    })),
    currentPlayerIndex: 0,
    dice: createDice(),
    rollsLeft: 3,
    turnNumber: 1,
    gameStatus: 'playing',
    winner: null,
  }
  
  games.set(roomId, gameState)
  return gameState
}

/**
 * Crée 5 dés avec des valeurs aléatoires
 */
function createDice(): Die[] {
  return Array(5).fill(null).map(() => ({
    value: rollSingleDie(),
    locked: false,
  }))
}

/**
 * Lance un dé (valeur entre 1 et 6)
 */
function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

/**
 * Lance les dés (sauf ceux qui sont verrouillés)
 */
export function rollDice(roomId: string): GameState | null {
  const game = games.get(roomId)
  if (!game) return null
  
  if (game.rollsLeft <= 0) {
    console.log('⚠️ Plus de lancers disponibles')
    return game
  }
  
  // Lancer uniquement les dés non verrouillés
  game.dice = game.dice.map(die => ({
    ...die,
    value: die.locked ? die.value : rollSingleDie(),
  }))
  
  game.rollsLeft--
  
  return game
}

/**
 * Verrouille/déverrouille un dé
 */
export function toggleDieLock(roomId: string, dieIndex: number): GameState | null {
  const game = games.get(roomId)
  if (!game || dieIndex < 0 || dieIndex >= 5) return null
  
  game.dice[dieIndex].locked = !game.dice[dieIndex].locked
  
  return game
}

/**
 * Choisit une catégorie de score et passe au joueur suivant
 */
export function chooseScore(
  roomId: string, 
  playerId: string, 
  category: ScoreCategory
): GameState | null {
  const game = games.get(roomId)
  if (!game) return null
  
  const currentPlayer = game.players[game.currentPlayerIndex]
  if (currentPlayer.id !== playerId) {
    console.log('⚠️ Ce n\'est pas le tour de ce joueur')
    return game
  }
  
  // Vérifier que la catégorie n'est pas déjà remplie
  if (currentPlayer.scoreSheet[category] !== null) {
    console.log('⚠️ Cette catégorie est déjà remplie')
    return game
  }
  
  // Calculer et enregistrer le score
  const diceValues = game.dice.map(d => d.value)
  const score = calculateScore(category, diceValues)
  currentPlayer.scoreSheet[category] = score
  currentPlayer.totalScore = calculateTotalScore(currentPlayer.scoreSheet)
  
  console.log(`✅ ${currentPlayer.name} a marqué ${score} dans ${category}`)
  
  // Passer au joueur suivant
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length
  
  // Si on revient au premier joueur, on passe au tour suivant
  if (game.currentPlayerIndex === 0) {
    game.turnNumber++
  }
  
  // Réinitialiser pour le prochain tour
  game.dice = createDice()
  game.rollsLeft = 3
  
  // Vérifier si la partie est terminée (13 tours)
  if (game.turnNumber > 13) {
    game.gameStatus = 'finished'
    // Déterminer le gagnant
    const winner = game.players.reduce((prev, current) => 
      current.totalScore > prev.totalScore ? current : prev
    )
    game.winner = winner.name
    console.log(`🏆 Partie terminée ! Gagnant : ${winner.name} avec ${winner.totalScore} points`)
  }
  
  return game
}

/**
 * Récupère l'état d'une partie
 */
export function getGame(roomId: string): GameState | undefined {
  return games.get(roomId)
}

/**
 * Supprime une partie
 */
export function deleteGame(roomId: string): void {
  games.delete(roomId)
}

/**
 * Réinitialise les dés pour un nouveau tour
 */
export function resetDiceForNewTurn(roomId: string): GameState | null {
  const game = games.get(roomId)
  if (!game) return null
  
  game.dice = createDice()
  game.rollsLeft = 3
  
  return game
}

