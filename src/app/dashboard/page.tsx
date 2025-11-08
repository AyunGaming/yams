'use client'
export const dynamic = "force-dynamic";

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import CreateGame from '@/components/CreateGame'
import JoinGame from '@/components/JoinGame'
import UserProfile from '@/components/UserProfile'
import GameHistory from '@/components/GameHistory'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useSupabase()

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

  // Afficher un message de chargement pendant la vérification de l'authentification
  if (authLoading) {
    console.log('⏳ Dashboard en attente de chargement...')
    return (
      <div className="text-center mt-8">
        <p>Chargement...</p>
        <p className="text-sm text-base-content/60 mt-2">
          Vérification de l&apos;authentification...
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-8 mt-6">
      
      {/* Profil utilisateur */}
      <UserProfile detailed={true} />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎲 Tableau de bord</h1>
        <CreateGame />
      </div>

      {/* Section pour rejoindre une partie */}
      <div className="card bg-base-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Rejoindre une partie existante</h2>
        <JoinGame />
      </div>

      {/* Historique des parties */}
      <GameHistory />
    </div>
  )
}
