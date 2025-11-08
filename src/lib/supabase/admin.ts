/**
 * Client Supabase ADMIN avec Service Role Key
 * Pour code backend Node.js et Socket.IO
 * ATTENTION: Contourne la Row Level Security
 * NE JAMAIS exposer cote client
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Instance unique (singleton)
let supabaseAdmin: SupabaseClient | null = null

/**
 * Crée ou récupère le client admin Supabase
 */
export function getAdminClient(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL est manquant dans les variables environnement')
    }

    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant')
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    console.log('[SUPABASE] Client Admin initialise')
  }

  return supabaseAdmin
}

