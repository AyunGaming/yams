"use client";

/**
 * Client Supabase pour le NAVIGATEUR
 * Pour composants Client avec "use client"
 * NE PAS utiliser cote serveur
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('url', url);
  console.log('key', key);

  // ✅ Empêche le crash pendant le build Docker
  if (!url || !key) {
    console.warn("⚠️ Supabase browser client créé en mode BUILD (credentials absents).");
    // Client mocké pour permettre le build
    return createBrowserClient("http://localhost", "public-anon-key");
  }


   return createBrowserClient(url, key);
}

