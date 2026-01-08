/**
 * Fonctions utilitaires pour gérer les statistiques utilisateur
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { UpdateStatsParams, UserProfile } from '@/types/user'
import { ScoreSheet } from '@/types/game'
import { LEVELING_BASE, LEVELING_GROWTH } from './levelingConfig'

/**
 * Calcule l'XP nécessaire pour atteindre un level donné
 * Formule: floor(base * ((growth^(level+1) - 1) / (growth - 1)))
 * Utilise les constantes globales de configuration
 */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0
  return Math.floor(
    LEVELING_BASE * ((Math.pow(LEVELING_GROWTH, level + 1) - 1) / (LEVELING_GROWTH - 1))
  )
}

/**
 * Calcule le level à partir de l'XP total
 * Trouve le level maximum tel que xpForLevel(level) <= xpTotal
 * Utilise les constantes globales de configuration
 * Le niveau est bloqué à 50 maximum
 */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1

  let level = 1
  while (true) {
    const xpForNextLevel = xpForLevel(level + 1)
    if (xpForNextLevel > xp) {
      // Bloquer le niveau à 50 maximum
      return Math.min(level, 50)
    }
    level++
    // Sécurité: éviter les boucles infinies (level max 50)
    if (level > 50) return 50
  }
}

/**
 * Met à jour les statistiques d'un utilisateur après une partie
 * Utilise la fonction PostgreSQL update_user_stats
 */
export async function updateUserStats(
  supabase: SupabaseClient,
  params: UpdateStatsParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('update_user_stats', {
      p_user_id: params.user_id,
      p_score: params.score,
      p_won: params.won,
      p_abandoned: params.abandoned || false,
      p_yams_count: params.yams_count || 0,
      p_xp_gained: params.xp_gained || 0,
    })

    if (error) {
      console.error('❌ Erreur lors de la mise à jour des stats:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Stats mises à jour avec succès')
    return { success: true }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Compte le nombre de Yams dans une feuille de score
 * Un Yams = 5 dés identiques = 50 points
 */
export function countYamsInScoreSheet(scoreSheet: ScoreSheet): number {
  let yamsCount = 0
  
  // Vérifier si le joueur a marqué des points pour "yams"
  // Note: yams peut être 50 (réussi), 0 (raté), ou null (pas encore joué)
  if (scoreSheet.yams !== null && scoreSheet.yams === 50) {
    yamsCount++
    console.log('🎲 Yams détecté dans la feuille de score !')
  }
  
  // Vérifier les bonus Yams (si implémenté dans votre logique)
  // Note: actuellement non implémenté dans le jeu, mais préparé pour l'avenir
  // if (scoreSheet.yams_bonus && scoreSheet.yams_bonus > 0) {
  //  yamsCount += Math.floor(scoreSheet.yams_bonus / 100)
  // }
  
  return yamsCount
}

/**
 * Récupère le profil d'un utilisateur
 */
export async function getUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: UserProfile | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Erreur lors de la récupération du profil:', error)
      return { data: null, error: error.message }
    }

    return { data: data as UserProfile }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Met à jour le profil d'un utilisateur (username, avatar)
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: { username?: string; avatar_url?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) {
      console.error('❌ Erreur lors de la mise à jour du profil:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Profil mis à jour avec succès')
    return { success: true }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Récupère le classement (leaderboard)
 */
export async function getLeaderboard(
  supabase: SupabaseClient,
  limit: number = 10
): Promise<{ data: any[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(limit)

    if (error) {
      console.error('❌ Erreur lors de la récupération du classement:', error)
      return { data: null, error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du classement:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

 
