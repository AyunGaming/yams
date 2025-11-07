/**
 * Middleware d'authentification pour Socket.IO
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Instance Supabase (créée de manière lazy)
let supabaseInstance: SupabaseClient | null = null

/**
 * Récupère ou crée l'instance Supabase
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL est manquant dans les variables d\'environnement')
    }

    if (!supabaseServiceKey) {
      throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant')
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey)
    console.log('✅ Client Supabase initialisé pour l\'authentification')
  }

  return supabaseInstance
}

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

    // Récupérer l'instance Supabase
    const supabase = getSupabaseClient()

    // Vérifier le token avec Supabase
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      console.error('❌ Token invalide:', error?.message)
      return { valid: false, error: error?.message || 'Token invalide' }
    }

    console.log('✅ Token valide pour l\'utilisateur:', data.user.id)
    return { 
      valid: true, 
      userId: data.user.id 
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du token:', error)
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }
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
    // Récupérer l'instance Supabase
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('❌ Erreur lors de la récupération du username:', error)
      return 'Joueur'
    }

    return data.username
  } catch (error) {
    console.error('❌ Erreur:', error)
    return 'Joueur'
  }
}

