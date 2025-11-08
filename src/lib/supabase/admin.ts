/**
 * Client Supabase ADMIN avec Service Role Key
 * Pour code backend Node.js et Socket.IO
 * ATTENTION: Contourne la Row Level Security
 * NE JAMAIS exposer cote client
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ✅ Sécurise le build
  if (!url || !serviceRole) {
    console.warn("⚠️ Supabase admin client mocké (build mode).");
    return null;
  }

  return createClient(url, serviceRole);
}


