'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useSupabase } from '@/components/Providers'
import { UserStats } from '@/types/user'

export default function Leaderboard() {
  const { user } = useSupabase()
  const [leaderboardData, setLeaderboardData] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    async function loadLeaderboard() {
      if (hasFetched.current) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      hasFetched.current = true

      try {
        const res = await fetch('/api/leaderboard')
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'Erreur lors du chargement du classement.')
          setLoading(false)
          return
        }
        setLeaderboardData((json.data || []) as UserStats[])
        setLoading(false)
      } catch (e) {
        console.error('❌ Erreur chargement classement:', e)
        setError('Erreur inattendue lors du chargement du classement.')
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Chargement du classement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="alert alert-error">
          <span>Erreur lors du chargement du classement: {error}</span>
        </div>
      </div>
    )
  }

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="card bg-base-200 p-6">
        <div className="alert alert-info">
          <span>Aucun joueur dans le classement pour le moment.</span>
        </div>
      </div>
    )
  }

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return `${position}.`
  }

  return (
    <div className="card bg-base-200 p-6">
      <h2 className="text-2xl font-bold mb-6">🏆 Top 10 des meilleurs joueurs</h2>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th className="text-center">Rang</th>
              <th>Joueur</th>
              <th className="text-center">Parties jouées</th>
              <th className="text-center">Victoires</th>
              <th className="text-center">Taux de victoire</th>
              <th className="text-center">Meilleur score</th>
              <th className="text-center">Yams réalisés</th>
              <th className="text-center">Série actuelle</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((player, index) => {
              const position = index + 1
              const isCurrentUser = user?.id === player.id

              return (
                <tr
                  key={player.id}
                  className={`${isCurrentUser ? 'bg-primary/20 font-bold' : ''}`}
                >
                  <td className="text-center text-lg">
                    {getMedalEmoji(position)}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full relative overflow-hidden">
                          {player.avatar_url ? (
                            <Image
                              src={player.avatar_url}
                              alt={`Avatar de ${player.username}`}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
                              <span className="text-xl">
                                {player.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">
                          {player.username}
                          {isCurrentUser && (
                            <span className="ml-2 badge badge-primary badge-sm">Vous</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">{player.parties_jouees}</td>
                  <td className="text-center">{player.parties_gagnees}</td>
                  <td className="text-center">
                    <span className="badge badge-success">
                      {player.taux_victoire.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center font-bold text-primary">
                    {player.meilleur_score}
                  </td>
                  <td className="text-center">
                    {player.nombre_yams_realises > 0 ? (
                      <span className="badge badge-warning">
                        🎲 {player.nombre_yams_realises}
                      </span>
                    ) : (
                      <span className="text-base-content/50">0</span>
                    )}
                  </td>
                  <td className="text-center">
                    {player.serie_victoires_actuelle > 0 ? (
                      <span className="badge badge-info">
                        🔥 {player.serie_victoires_actuelle}
                      </span>
                    ) : (
                      <span className="text-base-content/50">0</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-sm text-base-content/60">
        <p>💡 Le classement est basé sur le taux de victoire des joueurs ayant joué au moins une partie.</p>
      </div>
    </div>
  )
}

