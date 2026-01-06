/**
 * Types pour le système d'achievements
 */

export type AchievementRarity = 'Bronze' | 'Silver' | 'Gold' | 'Crystal'
export type AchievementCategory = 'gameplay' | 'score' | 'victory' | 'streak' | 'level' | 'variant' | 'action' | 'classement' | 'special'

export interface Achievement {
  id: string
  name: string
  description: string
  image_path: string
  rarity: AchievementRarity
  category: AchievementCategory
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  achievement?: Achievement
}

export interface AchievementCheckContext {
  userProfile: {
    id: string
    nombre_yams_realises: number
    parties_gagnees: number
    meilleur_score: number
    serie_victoires_actuelle: number
    level: number
    parties_jouees: number
  }
  gameData: {
    score: number
    won: boolean
    yamsCount: number
    yamsByFace?: {
      1?: number
      2?: number
      3?: number
      4?: number
      5?: number
      6?: number
    }
    variant?: string
    hasBonus: boolean
  }
}

