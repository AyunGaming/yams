// Types pour le jeu de Yams

export type ScoreCategory = 
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'threeOfKind' | 'fourOfKind' | 'fullHouse' 
  | 'smallStraight' | 'largeStraight' | 'yams' | 'chance'

export interface ScoreSheet {
  // Section supérieure
  ones: number | null
  twos: number | null
  threes: number | null
  fours: number | null
  fives: number | null
  sixes: number | null
  
  // Section inférieure
  threeOfKind: number | null
  fourOfKind: number | null
  fullHouse: number | null
  smallStraight: number | null
  largeStraight: number | null
  yams: number | null
  chance: number | null
}

export interface Die {
  value: number // 1-6
  locked: boolean // Si le dé est verrouillé (gardé pour le prochain lancer)
}

export interface PlayerGameState {
  id: string
  name: string
  userId?: string  // UUID de l'utilisateur (optionnel pour compatibilité)
  scoreSheet: ScoreSheet
  totalScore: number
  abandoned: boolean
}

export interface GameState {
  roomId: string
  players: PlayerGameState[]
  currentPlayerIndex: number
  dice: Die[]
  rollsLeft: number // 3, 2, 1, ou 0
  turnNumber: number // 1-13 (13 tours au total)
  gameStatus: 'waiting' | 'playing' | 'finished' | 'server_interrupted'
  winner: string | null
}

export interface RollDiceAction {
  roomId: string
  lockedDice: boolean[] // Array de 5 booléens indiquant quels dés garder
}

export interface ChooseScoreAction {
  roomId: string
  category: ScoreCategory
}

