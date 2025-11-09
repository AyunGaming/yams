// Gestionnaire de l'état des parties côté serveur

import { GameState, Die, ScoreCategory, GameVariant } from '../types/game'
import { calculateScore, calculateTotalScore, createEmptyScoreSheet, isScoreSheetComplete } from '../lib/yamsLogic'
import { canChooseCategory } from '../lib/variantLogic'

// Stocker les états de jeu en mémoire
const games = new Map<string, GameState>()

/**
 * Nettoie tous les gestionnaires de jeu (utilisé au redémarrage du serveur)
 */
export function clearAllGames(): void {
  const count = games.size
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
  const gameState: GameState = {
    roomId,
    players: players.sort(() => Math.random() - 0.5).map(p => ({
      id: p.id,
      name: p.name,
      userId: p.userId,
      scoreSheet: createEmptyScoreSheet(),
      totalScore: 0,
      abandoned: false,
    })),
    currentPlayerIndex: 0,
    dice: createDice(),
    rollsLeft: 3,
    turnNumber: 1,
    gameStatus: 'playing',
    winner: null,
    variant,
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
    games.delete(roomId)
    return null
  } else if (activePlayers.length === 1) {
    // Un seul joueur reste, il gagne
    game.gameStatus = 'finished'
    game.winner = activePlayers[0].name
    return game
  } else {
    // 2+ joueurs restent, passer au prochain joueur actif
    if (playerIndex === game.currentPlayerIndex) {
      // Si c'était le tour du joueur qui abandonne, passer au suivant
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
