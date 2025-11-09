/**
 * Utilitaires pour la gestion de la base de données des parties
 * Centralise les opérations DB pour éviter la duplication
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { GameState } from '../types/game'

/**
 * Met à jour une partie terminée dans la base de données
 * Enregistre le statut, le gagnant et les scores des joueurs
 */
export async function updateFinishedGame(
  supabase: SupabaseClient,
  roomId: string,
  gameState: GameState
): Promise<{ success: boolean; error?: string }> {
  // Formater les scores des joueurs
  const playersScores = gameState.players.map((p) => ({
    id: p.id,
    name: p.name,
    user_id: p.userId,
    score: p.totalScore,
    abandoned: p.abandoned,
  }))

  try {
    const { error } = await supabase
      .from('games')
      .update({
        status: 'finished',
        winner: gameState.winner,
        players_scores: playersScores,
      })
      .eq('id', roomId)

    if (error) {
      console.error('[DB] Erreur mise à jour de la partie:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[DB] Exception lors de la mise à jour:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Met à jour le statut d'une partie
 */
export async function updateGameStatus(
  supabase: SupabaseClient,
  roomId: string,
  status: 'waiting' | 'in_progress' | 'finished'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('games')
      .update({ status })
      .eq('id', roomId)

    if (error) {
      console.error('[DB] Erreur mise à jour du status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[DB] Exception lors de la mise à jour du status:', err)
    return { success: false, error: String(err) }
  }
}

