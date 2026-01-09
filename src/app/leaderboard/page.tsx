'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import Leaderboard from '@/components/Leaderboard'

export default function LeaderboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useSupabase()

  // Redirection si pas connecté
  useEffect(() => {
    if (!authLoading && user === null) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Afficher un message de chargement pendant la vérification de l'authentification
  if (authLoading) {
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🏆 Classement</h1>
      </div>

      <Leaderboard />
    </div>
  )
}

