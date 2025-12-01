'use client'
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/Providers"
import { useGameProtection } from "@/contexts/GameProtectionContext"
import { tokenManager } from "@/lib/tokenManager"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  const { user, refreshUserProfile } = useSupabase()
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { isInActiveGame, handleAbandonBeforeNavigation } = useGameProtection()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    }

    tokenManager.clearTokens()
    await refreshUserProfile()

    setLoading(false)
    router.push('/login')
  }

  // Gestion de la navigation avec confirmation si en partie
  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isInActiveGame) {
      e.preventDefault()
      const confirmed = window.confirm(
        '⚠️ Vous êtes en pleine partie !\n\nSi vous quittez maintenant, cela sera considéré comme un abandon et vous perdrez la partie.\n\nÊtes-vous sûr de vouloir quitter ?'
      )
      if (confirmed) {
        // Émettre l'abandon AVANT de naviguer
        handleAbandonBeforeNavigation()
        // Petit délai pour laisser le temps au serveur de traiter l'abandon
        setTimeout(() => {
          router.push(href)
        }, 100)
      }
    }
  }

  return (
    <div className="navbar bg-base-200 shadow">
      <div className="flex-1">
        <Link 
          href="/" 
          className="btn btn-ghost normal-case text-xl"
          onClick={(e) => handleNavigation(e, '/')}
        >
          🎲 Yams
        </Link>
      </div>

      <div className="flex-none gap-2">
        <ThemeToggle />

        {user ? (
          <>
            <Link 
              href="/dashboard" 
              className="btn btn-ghost"
              onClick={(e) => handleNavigation(e, '/dashboard')}
            >
              Dashboard
            </Link>
            <Link 
              href="/leaderboard" 
              className="btn btn-ghost"
              onClick={(e) => handleNavigation(e, '/leaderboard')}
            >
              🏆 Classement
            </Link>
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
