/**
 * Types pour le système utilisateur et les statistiques
 */

/**
 * Profil utilisateur complet avec toutes les statistiques
 */
export interface UserProfile {
  // Identité
  id: string
  username: string
  avatar_url: string

  // Stats de base
  parties_jouees: number
  parties_gagnees: number
  parties_abandonnees: number

  // Scores
  meilleur_score: number

  // Records spéciaux
  nombre_yams_realises: number
  meilleure_serie_victoires: number
  serie_victoires_actuelle: number

  // Métadonnées
  created_at: string
  updated_at: string
}

/**
 * Stats calculées (provenant de la vue leaderboard)
 */
export interface UserStats extends UserProfile {
  taux_victoire: number // Pourcentage
}

/**
 * Données minimales pour l'affichage rapide
 */
export interface UserBasic {
  id: string
  username: string
  avatar_url: string
}

/**
 * Paramètres pour mettre à jour les stats après une partie
 */
export interface UpdateStatsParams {
  user_id: string
  score: number
  won: boolean
  abandoned?: boolean
  yams_count?: number
}

/**
 * Données pour le formulaire de profil
 */
export interface UpdateProfileData {
  username?: string
  avatar_url?: string
}

