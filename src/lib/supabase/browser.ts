/**
 * Client Supabase pour le NAVIGATEUR
 * Pour composants Client avec "use client"
 * NE PAS utiliser cote serveur
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

