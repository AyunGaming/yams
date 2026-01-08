'use client'
export const dynamic = "force-dynamic";

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { useFlashMessage } from '@/contexts/FlashMessageContext'
import { Achievement } from '@/types/achievement'
import CreateGame from '@/components/CreateGame'
import JoinGame from '@/components/JoinGame'
import UserProfile from '@/components/UserProfile'
import GameHistory from '@/components/GameHistory'
import RecentAchievements from '@/components/RecentAchievements'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useSupabase()
  const { showAchievement } = useFlashMessage()

  // Logs de débogage
  useEffect(() => {
    console.log('🔍 Dashboard - État:', { authLoading, hasUser: !!user })
  }, [authLoading, user])

  // Redirection si pas connecté (attendre que la vérification soit terminée)
  useEffect(() => {
    if (!authLoading && user === null) {
      console.log('🚪 Utilisateur non connecté - Redirection vers /login')
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Vérifier et afficher les achievements en attente depuis sessionStorage
  useEffect(() => {
    if (authLoading) return

    try {
      const pendingAchievementsStr = sessionStorage.getItem('pending_achievements')
      if (pendingAchievementsStr) {
        const pendingAchievements = JSON.parse(pendingAchievementsStr) as Achievement[]
        
        // Afficher chaque achievement avec un petit délai pour l'animation
        pendingAchievements.forEach((achievement: Achievement, index: number) => {
          setTimeout(() => {
            showAchievement(achievement)
          }, index * 500) // Délai progressif pour plusieurs achievements
        })

        // Nettoyer sessionStorage après affichage
        sessionStorage.removeItem('pending_achievements')
      }
    } catch (e) {
      console.warn('[DASHBOARD] Erreur lors de la récupération des achievements en attente:', e)
      // Nettoyer en cas d'erreur
      sessionStorage.removeItem('pending_achievements')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  // Afficher un message de chargement pendant la vérification de l'authentification
  if (authLoading) {
    console.log('⏳ Dashboard en attente de chargement...')
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-4 font-semibold">Chargement...</p>
        <p className="text-sm text-base-content/60 mt-2">
          Vérification de l&apos;authentification...
        </p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 lg:px-3 xl:px-6 max-w-5xl lg:max-w-[calc(100%-1.5rem)] xl:max-w-6xl 2xl:max-w-7xl">
      <div className="space-y-8 mt-6">
      
      {/* Profil utilisateur */}
      <UserProfile detailed={true} />

      {/* Derniers achievements */}
      <RecentAchievements />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center gap-3">
          <svg 
            className="h-[1em] w-[1em]" 
            viewBox="0 0 32 32" 
            fill="var(--dice-color)" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <title>perspective-dice-one</title>
              <path d="M27.111 8.247l-9.531-5.514c-0.895-0.518-2.346-0.518-3.241 0l-9.531 5.514c-0.61 0.353-0.804 0.856-0.582 1.304l11.291 6.447c0.27 0.031 0.548 0.033 0.819 0.007l11.385-6.515c0.176-0.432-0.026-0.906-0.609-1.243zM17.397 9.982c-0.779 0.462-2.041 0.462-2.82 0s-0.779-1.211 0-1.673 2.041-0.462 2.82 0c0.779 0.462 0.779 1.211 0 1.673zM27.424 10.14l-10.366 5.932c-0.365 0.36-0.669 0.831-0.861 1.322v11.721c0.281 0.394 0.803 0.467 1.401 0.122l9.168-5.294c0.895-0.517 1.621-1.774 1.621-2.808v-9.84c0-0.763-0.396-1.191-0.963-1.155zM20.092 17.199c0.002 0.861-0.626 1.923-1.401 2.372s-1.405 0.116-1.407-0.745c0-0.002 0-0.004 0-0.006-0.002-0.861 0.626-1.923 1.401-2.372s1.405-0.116 1.407 0.745c0 0.002 0 0.004 0 0.006zM27.081 20.821c0.002 0.861-0.626 1.923-1.401 2.372s-1.405 0.116-1.407-0.745c0-0.002 0-0.004 0-0.006-0.002-0.861 0.626-1.923 1.401-2.372s1.405-0.116 1.407 0.745c0 0.002 0 0.004 0 0.006zM15.645 17.134c-0.165-0.345-0.383-0.671-0.635-0.944l-10.597-6.051c-0.504 0.027-0.846 0.446-0.846 1.156v9.84c0 1.034 0.726 2.291 1.621 2.808l9.168 5.294c0.525 0.303 0.992 0.284 1.289 0.008v-12.111h-0zM7.682 14.791c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006zM11.176 20.615c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006zM14.671 26.483c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006z"></path>
            </g>
          </svg>
          <span>Tableau de bord</span>
        </h1>
        <CreateGame />
      </div>

      {/* Section pour rejoindre une partie */}
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-xl font-display mb-4">Rejoindre une partie existante</h2>
          <JoinGame />
        </div>
      </div>

      {/* Historique des parties */}
      <GameHistory />
      </div>
    </div>
  )
}
