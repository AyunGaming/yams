// Gestionnaire de l'état des parties côté serveur

import { GameState, Die, ScoreCategory, GameVariant, ScoreSheet } from '../types/game'
import { calculateScore, calculateTotalScore, createEmptyScoreSheet, createDevScoreSheet, isScoreSheetComplete } from '../lib/yamsLogic'
import { canChooseCategory } from '../lib/variantLogic'

// Stocker les états de jeu en mémoire
const games = new Map<string, GameState>()

// Stocker les timers actifs (timeouts et intervals)
const turnTimers = new Map<string, { timeout: NodeJS.Timeout; interval: NodeJS.Timeout }>()

// Durée du timer en secondes
const TURN_DURATION = 90

/**
 * Nettoie tous les gestionnaires de jeu (utilisé au redémarrage du serveur)
 */
export function clearAllGames(): void {
  const count = games.size
  
  // Nettoyer tous les timers actifs
  turnTimers.forEach(({ timeout, interval }) => {
    clearTimeout(timeout)
    clearInterval(interval)
  })
  turnTimers.clear()
  
  games.clear()
  console.log(`🧹 ${count} partie(s) supprimée(s) de la mémoire`)
}

/**
 * Récupère l'état d'une partie
 */
export function getGameState(roomId: string): GameState | null {
  return games.get(roomId) || null
}

/**
 * Met à jour le socket.id d'un joueur (reconnexion)
 * @param roomId - ID de la partie
 * @param userId - UUID de l'utilisateur
 * @param newSocketId - Nouveau socket.id
 */
export function updatePlayerSocketId(roomId: string, userId: string, newSocketId: string): boolean {
  const game = games.get(roomId)
  if (!game) return false

  const player = game.players.find(p => p.userId === userId)
  if (!player) return false

  const oldSocketId = player.id
  player.id = newSocketId
  
  console.log(`[GAME] Mise à jour socket.id pour ${player.name}: ${oldSocketId} → ${newSocketId}`)
  return true
}

/**
 * Initialise une nouvelle partie
 */
export function initializeGame(
  roomId: string, 
  players: { id: string; name: string; userId?: string }[],
  variant: GameVariant = 'classic'
): GameState {
  // Mode développement : pré-remplir les scores pour des tests rapides
  const isDevelopment = process.env.NODE_ENV !== 'production'
  
  const gameState: GameState = {
    roomId,
    players: players.sort(() => Math.random() - 0.5).map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      scoreSheet: isDevelopment ? createDevScoreSheet() : createEmptyScoreSheet(),
      totalScore: isDevelopment ? calculateTotalScore(createDevScoreSheet()) : 0,
      abandoned: false,
    })),
    currentPlayerIndex: 0,
    dice: createDice(),
    rollsLeft: 3,
    turnNumber: isDevelopment ? 13 : 1, // Dernier tour en mode dev
    gameStatus: 'playing',
    winner: null,
    variant,
  }
  
  if (isDevelopment) {
    console.log('🔧 Mode développement : Scores pré-remplis (sauf "chance") pour tests rapides')
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
    return game
  }
  
  // Vérifier que le joueur n'a pas abandonné
  if (currentPlayer.abandoned) {
    return game
  }
  
  // Vérifier que la catégorie peut être choisie selon la variante
  if (!canChooseCategory(game.variant, category, currentPlayer.scoreSheet)) {
    console.log(`[GAME] Catégorie ${category} non autorisée pour la variante ${game.variant}`)
    return game
  }
  
  // Nettoyer le timer du tour actuel
  clearTurnTimer(roomId)
  
  // Calculer et enregistrer le score
  const diceValues = game.dice.map(d => d.value)
  const score = calculateScore(category, diceValues)
  currentPlayer.scoreSheet[category] = score
  currentPlayer.totalScore = calculateTotalScore(currentPlayer.scoreSheet)
  
  
  // Passer au joueur suivant actif (non-abandonné)
  const oldIndex = game.currentPlayerIndex
  game.currentPlayerIndex = getNextActivePlayerIndex(game)
  
  // Si on revient au premier joueur, on passe au tour suivant
  if (game.currentPlayerIndex <= oldIndex) {
    game.turnNumber++
  }
  
  // Réinitialiser pour le prochain tour
  game.dice = createDice()
  game.rollsLeft = 3
  
  // Vérifier si la partie est terminée (13 tours OU tous les joueurs actifs ont fini)
  const activePlayers = game.players.filter(p => !p.abandoned)
  const allActivePlayersFinished = activePlayers.every(p => isScoreSheetComplete(p.scoreSheet))
  
  if (game.turnNumber > 13 || allActivePlayersFinished) {
    game.gameStatus = 'finished'
    // Déterminer le gagnant parmi les joueurs actifs (non-abandonnés)
    const winner = activePlayers.reduce((prev, current) => 
      current.totalScore > prev.totalScore ? current : prev
    )
    game.winner = winner.name
  }
  
  return game
}

/**
 * Marque un joueur comme ayant abandonné
 */
export function removePlayer(roomId: string, playerId: string): GameState | null {
  const game = games.get(roomId)
  if (!game) return null
  
  const playerIndex = game.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) return game
  
  const player = game.players[playerIndex]
  
  // Marquer le joueur comme ayant abandonné
  player.abandoned = true
  
  // Compter les joueurs actifs (non-abandonnés)
  const activePlayers = game.players.filter(p => !p.abandoned)
  
  if (activePlayers.length === 0) {
    // Plus personne, partie annulée
    clearTurnTimer(roomId)
    games.delete(roomId)
    return null
  } else if (activePlayers.length === 1) {
    // Un seul joueur reste, il gagne
    clearTurnTimer(roomId)
    game.gameStatus = 'finished'
    game.winner = activePlayers[0].name
    return game
  } else {
    // 2+ joueurs restent, passer au prochain joueur actif
    if (playerIndex === game.currentPlayerIndex) {
      // Si c'était le tour du joueur qui abandonne, passer au suivant
      clearTurnTimer(roomId)
      game.currentPlayerIndex = getNextActivePlayerIndex(game)
      // Réinitialiser les dés pour le prochain joueur
      game.dice = createDice()
      game.rollsLeft = 3
    }
    
    return game
  }
}

/**
 * Trouve l'index du prochain joueur actif (non-abandonné)
 */
function getNextActivePlayerIndex(game: GameState): number {
  let nextIndex = (game.currentPlayerIndex + 1) % game.players.length
  let attempts = 0
  
  // Chercher le prochain joueur non-abandonné
  while (game.players[nextIndex].abandoned && attempts < game.players.length) {
    nextIndex = (nextIndex + 1) % game.players.length
    attempts++
  }
  
  return nextIndex
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

/**
 * Trouve la meilleure catégorie disponible pour les dés actuels
 */
function findBestAvailableCategory(diceValues: number[], scoreSheet: ScoreSheet, variant: GameVariant): ScoreCategory | null {
  const categories: ScoreCategory[] = [
    'ones', 'twos', 'threes', 'fours', 'fives', 'sixes',
    'threeOfKind', 'fourOfKind', 'fullHouse', 
    'smallStraight', 'largeStraight', 'yams', 'chance'
  ]
  
  let bestCategory: ScoreCategory | null = null
  let bestScore = -1
  
  for (const category of categories) {
    // Vérifier si la catégorie est disponible
    if (scoreSheet[category] !== null) continue
    
    // Vérifier si la catégorie peut être choisie selon la variante
    if (!canChooseCategory(variant, category, scoreSheet)) continue
    
    const score = calculateScore(category, diceValues)
    
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }
  
  return bestCategory
}

/**
 * Nettoie les timers d'une partie
 */
export function clearTurnTimer(roomId: string): void {
  const timers = turnTimers.get(roomId)
  if (timers) {
    clearTimeout(timers.timeout)
    clearInterval(timers.interval)
    turnTimers.delete(roomId)
  }
}

/**
 * Démarre le timer pour le tour d'un joueur
 * @param roomId - ID de la partie
 * @param onTimerExpired - Callback appelée quand le timer expire
 * @param onTimerUpdate - Callback appelée chaque seconde pour mettre à jour le temps restant
 */
export function startTurnTimer(
  roomId: string,
  onTimerExpired: () => void,
  onTimerUpdate: (timeLeft: number) => void
): void {
  // Nettoyer le timer précédent s'il existe
  clearTurnTimer(roomId)
  
  const game = games.get(roomId)
  if (!game) return
  
  // Initialiser le temps de début
  game.turnStartTime = Date.now()
  game.turnTimeLeft = TURN_DURATION
  
  // Mettre à jour chaque seconde
  const interval = setInterval(() => {
    const game = games.get(roomId)
    if (!game) {
      clearTurnTimer(roomId)
      return
    }
    
    const elapsed = Math.floor((Date.now() - (game.turnStartTime || 0)) / 1000)
    const timeLeft = Math.max(0, TURN_DURATION - elapsed)
    game.turnTimeLeft = timeLeft
    
    onTimerUpdate(timeLeft)
  }, 1000)
  
  // Expirer après TURN_DURATION secondes
  const timeout = setTimeout(() => {
    clearTurnTimer(roomId)
    onTimerExpired()
  }, TURN_DURATION * 1000)
  
  turnTimers.set(roomId, { timeout, interval })
}

/**
 * Gère l'expiration du timer : choisit automatiquement le meilleur score
 * Retourne l'état du jeu mis à jour ainsi que la catégorie et le score choisis
 */
export function handleTimerExpired(roomId: string): { gameState: GameState; category: ScoreCategory; score: number; playerName: string } | null {
  const game = games.get(roomId)
  if (!game) return null
  
  const currentPlayer = game.players[game.currentPlayerIndex]
  const playerName = currentPlayer.name
  
  // Si aucun lancer n'a été fait, simuler un lancer
  if (game.rollsLeft === 3) {
    console.log(`[TIMER] ${currentPlayer.name} - Aucun lancer effectué, simulation...`)
    game.dice = createDice()
    game.rollsLeft = 2
  }
  
  // Trouver le meilleur score possible
  const diceValues = game.dice.map(d => d.value)
  const bestCategory = findBestAvailableCategory(diceValues, currentPlayer.scoreSheet, game.variant)
  
  if (!bestCategory) {
    console.log(`[TIMER] ${currentPlayer.name} - Aucune catégorie disponible`)
    return null
  }
  
  // Calculer le score avant de le choisir
  const scoreValue = calculateScore(bestCategory, diceValues)
  
  console.log(`[TIMER] ${currentPlayer.name} - Choix automatique: ${bestCategory} (${scoreValue} points)`)
  
  // Choisir automatiquement le meilleur score
  const updatedGameState = chooseScore(roomId, currentPlayer.id, bestCategory)
  
  if (!updatedGameState) return null
  
  return {
    gameState: updatedGameState,
    category: bestCategory,
    score: scoreValue,
    playerName
  }
}

/**
 * Supprime une partie et nettoie ses timers
 */
export function deleteGameAndTimers(roomId: string): void {
  clearTurnTimer(roomId)
  deleteGame(roomId)
}
