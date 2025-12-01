'use client'
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabase } from "@/components/Providers"
import { useGameProtection } from "@/contexts/GameProtectionContext"
import { tokenManager } from "@/lib/tokenManager"
import ThemeToggle from "./ThemeToggle"

export default function Navbar() {
  const { user, userProfile, refreshUserProfile } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joinLoading, setJoinLoading] = useState(false)
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
    setIsMenuOpen(false)
    router.push('/login')
  }

  const handleJoinGame = async () => {
    const trimmed = joinCode.trim()
    if (!trimmed) {
      alert("Veuillez entrer un code de partie valide.")
      return
    }

    try {
      setJoinLoading(true)
      // On vide le champ dès que l'action est lancée
      setJoinCode("")
      // Petit délai pour laisser React afficher l'état de chargement
      await new Promise((resolve) => setTimeout(resolve, 50))
      router.push(`/game/${trimmed}`)
    } finally {
      setJoinLoading(false)
    }
  }

  const handleJoinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleJoinGame()
    }
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
 
    // Sur mobile on ferme le menu après clic
    setIsMenuOpen(false)
  }

  return (
    <div className="navbar bg-base-200 shadow">
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <Link 
          href="/" 
          className="btn btn-ghost normal-case text-xl flex-shrink-0"
          onClick={(e) => handleNavigation(e, '/')}
        >
          🎲 Yams
        </Link>

        {/* Zone création + rejoindre une partie - entre le nom du site et le menu */}
        {user && (
          <div className="flex-1 flex justify-center min-w-0">
            <div className="flex items-center gap-2 w-full max-w-xl">
              {/* Bouton créer une partie - visible seulement sur desktop */}
              <button
                type="button"
                className="hidden md:inline-flex btn btn-sm btn-primary whitespace-nowrap"
                onClick={() => router.push("/dashboard")}
              >
                ➕ Créer une partie
              </button>
              {/* Séparateur visuel entre création et jointure */}
              <div className="hidden md:block h-6 w-px bg-neutral/40 dark:bg-neutral/60" />
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  type="text"
                  placeholder="Code de la partie"
                  className="input input-sm input-bordered flex-1"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={handleJoinKeyDown}
                  disabled={joinLoading}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-secondary whitespace-nowrap"
                  onClick={handleJoinGame}
                  disabled={joinLoading || !joinCode.trim()}
                >
                  {joinLoading ? "..." : "Rejoindre"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-none flex items-center gap-2">
        <ThemeToggle />

        {/* Menu desktop */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link 
                href="/leaderboard" 
                className="btn btn-ghost"
                onClick={(e) => handleNavigation(e, '/leaderboard')}
              >
                🏆 Classement
              </Link>
              {/* Bulle utilisateur avec avatar + menu */}
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                  <div className="w-10 rounded-full overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <Image
                        src={userProfile.avatar_url}
                        alt={userProfile.username}
                        width={40}
                        height={40}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="bg-neutral-focus text-neutral-content w-full h-full flex items-center justify-center">
                        <span className="text-lg">
                          {userProfile?.username?.charAt(0).toUpperCase() ?? "U"}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300"
                >
                  <li>
                    <span className="font-semibold">{userProfile?.username ?? "Utilisateur"}</span>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      onClick={(e) => handleNavigation(e, "/dashboard")}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} disabled={loading}>
                      {loading ? "..." : "Déconnexion"}
                    </button>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Connexion</Link>
              <Link href="/register" className="btn btn-primary">Inscription</Link>
            </>
          )}
        </div>

        {/* Menu burger mobile */}
        <div className="md:hidden">
          <div className="dropdown dropdown-end">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsMenuOpen((prev) => !prev)}
            >
              <span className="sr-only">Ouvrir le menu</span>
              <div className="flex flex-col gap-1">
                <span className="h-0.5 w-5 bg-current rounded" />
                <span className="h-0.5 w-5 bg-current rounded" />
                <span className="h-0.5 w-5 bg-current rounded" />
              </div>
            </button>
            <ul
              className={`menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300 ${isMenuOpen ? "" : "hidden"}`}
            >
              {user ? (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        router.push("/dashboard")
                      }}
                    >
                      ➕ Créer une partie
                    </button>
                  </li>
                  <li>
                    <Link
                      href="/leaderboard"
                      onClick={(e) => handleNavigation(e, '/leaderboard')}
                    >
                      🏆 Classement
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard"
                      onClick={(e) => handleNavigation(e, '/dashboard')}
                    >
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} disabled={loading}>
                      {loading ? "..." : "Déconnexion"}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      Connexion
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                      Inscription
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
