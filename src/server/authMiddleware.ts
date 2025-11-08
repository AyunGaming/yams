/**
 * Middleware d'authentification pour Socket.IO
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Vérifie un token JWT Supabase
 */
export async function verifyToken(token: string): Promise<{ 
  valid: boolean
  userId?: string
  error?: string 
}> {
  try {
    if (!token) {
      return { valid: false, error: 'Token manquant' }
    }

    // Récupérer le client Supabase Admin
    const supabase = createAdminClient()
    if (!supabase) {
      return { valid: false, error: 'Supabase admin client non disponible' }
    }
    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return { valid: false, error: error?.message || 'Token invalide' }
    }
    return { valid: true, userId: data.user.id }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Extrait le token depuis différents formats
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null

  // Format: "Bearer <token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Format direct: "<token>"
  return authHeader
}

/**
 * Récupère le username depuis l'ID utilisateur
 */
export async function getUsernameFromId(userId: string): Promise<string> {
  try {
    // Récupérer le client Supabase Admin
    const supabase = createAdminClient()
    if (!supabase) {
      return 'Joueur'
    }
    
    const { data, error } = await supabase.from('users').select('username').eq('id', userId).single()
    if (error || !data) {
      return 'Joueur'
    }
    return data.username
  } catch (error) {
    return 'Joueur'
  }
}

