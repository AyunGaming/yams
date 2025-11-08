/**
 * Client Supabase ADMIN avec Service Role Key
 * Pour code backend Node.js et Socket.IO
 * ATTENTION: Contourne la Row Level Security
 * NE JAMAIS exposer cote client
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  // Essayer SUPABASE_URL d'abord, puis fallback sur NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ✅ Sécurise le build
  if (!url || !serviceRole) {
    console.error("❌ Variables d'environnement manquantes pour Supabase Admin:");
    console.error("  - SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL:", url ? "✅" : "❌");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY:", serviceRole ? "✅" : "❌");
    return null;
  }

  console.log("✅ Client Supabase Admin initialisé");
  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}


