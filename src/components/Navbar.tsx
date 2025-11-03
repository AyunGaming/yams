'use client'
import Link from "next/link"
import { useState } from "react"
import { useSupabase } from "@/components/Providers"
import { tokenManager } from "@/lib/tokenManager"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  const { supabase, user } = useSupabase()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    console.log('🚪 Déconnexion en cours...')
    
    // Supprime les tokens
    tokenManager.clearTokens()
    
    // Déconnexion Supabase
    await supabase.auth.signOut()
    
    setLoading(false)
    console.log('✅ Déconnexion réussie')
    window.location.href = "/"
  }

  return (
    <div className="navbar bg-base-200 shadow">
      <div className="flex-1">
        <Link href="/" className="btn btn-ghost normal-case text-xl">🎲 Yams</Link>
      </div>

      <div className="flex-none gap-2">
        <ThemeToggle />

        {user ? (
          <>
            <Link href="/dashboard" className="btn btn-ghost">Dashboard</Link>
            <button onClick={handleLogout} className="btn btn-outline btn-sm" disabled={loading}>
              {loading ? "..." : "Déconnexion"}
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost">Connexion</Link>
            <Link href="/register" className="btn btn-primary">Inscription</Link>
          </>
        )}
      </div>
    </div>
  )
}
