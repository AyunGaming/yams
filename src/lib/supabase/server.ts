/**
 * Client Supabase pour le cote SERVEUR
 * Pour Server Components, API Routes, Server Actions
 * NE PAS utiliser cote client
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClientWrapper() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // ✅ Empêche les erreurs au build
  if (!url || !key) {
    console.warn("⚠️ Supabase server client mocké (build mode).");
    return null;
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
