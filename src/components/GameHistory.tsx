/**
 * Composant affichant l'historique des parties terminées
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSupabase } from '@/components/Providers'
import { GameVariant } from '@/types/game'
import { VARIANT_NAMES } from '@/lib/variantLogic'

interface PlayerScore {
  id: string
  name: string
  user_id?: string
  score: number
  abandoned: boolean
}

interface Game {
  id: string
  owner: string
  status: string
  created_at: string
  winner: string | null
  players_scores: PlayerScore[] | null
  variant: GameVariant
}

export default function GameHistory() {
  const { user } = useSupabase()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const lastFetchedUserId = useRef<string | null>(null)

  const userId = user?.id

  // Charger les 10 dernières parties terminées de l'utilisateur
  useEffect(() => {
    const fetchGames = async () => {
      if (!userId) return

      if (lastFetchedUserId.current === userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      lastFetchedUserId.current = userId

      try {
        const res = await fetch('/api/history', { credentials: 'include' })
        const json = await res.json()
        if (!res.ok) {
          console.error('Erreur lors du chargement de l\'historique:', json.error)
          setLoading(false)
          return
        }

        setGames((json.data || []) as Game[])
        setLoading(false)
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error)
        setLoading(false)
      }
    }

    fetchGames()
  }, [userId])

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-6">
          <div className="text-center">
            <span className="loading loading-spinner loading-lg"></span>
            <p className="mt-4">Chargement de l&apos;historique...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300">
      <div className="card-body p-4 md:p-6 lg:p-4 xl:p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">📜 Historique des parties</h2>

      {games.length === 0 ? (
        <div className="alert alert-info">
          <span>
            Aucune partie terminée pour le moment.
            <br />
            Jouez votre première partie !
          </span>
        </div>
      ) : (
        <>
          {/* Version mobile et tablette : cartes */}
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
            {games.map((g) => {
              const myPlayerData = g.players_scores && g.players_scores.length > 0
                ? g.players_scores.find((p: PlayerScore) => p.user_id === user?.id)
                : null
              
              const myScore = myPlayerData?.score ?? 'N/A'
              const iAbandoned = myPlayerData?.abandoned ?? false
              
              const iWon = g.winner === user?.email || 
                           (myPlayerData && g.winner === myPlayerData.name)
              
              const variant = g.variant || 'classic'
              const variantName = VARIANT_NAMES[variant]
              
              return (
                <div
                  key={g.id}
                  className={`card bg-base-100 shadow-xl border border-base-300 ${
                    iAbandoned ? 'opacity-60' : ''
                  } ${iWon ? 'ring-2 ring-success' : ''}`}
                >
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-lg mb-1">
                          {iWon ? '🏆 Vous avez gagné' : iAbandoned ? 'Abandonné' : 'Partie terminée'}
                        </div>
                        <div className={`text-sm ${iAbandoned ? 'text-base-content' : 'text-base-content/70'}`}>
                          {new Date(g.created_at).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <span className="badge badge-neutral badge-sm">
                        {variantName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-base-content/70">Votre score</span>
                        <span className="font-bold text-primary">{myScore}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base-content/70">Vainqueur</span>
                        <span className="font-semibold">
                          {iWon ? 'Vous' : g.winner || 'Inconnu'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Version desktop : tableau */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="table w-full table-compact xl:table-normal">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Variante</th>
                  <th className="text-center">Votre score</th>
                  <th>Vainqueur</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const myPlayerData = g.players_scores && g.players_scores.length > 0
                    ? g.players_scores.find((p: PlayerScore) => p.user_id === user?.id)
                    : null
                  
                  const myScore = myPlayerData?.score ?? 'N/A'
                  const iAbandoned = myPlayerData?.abandoned ?? false
                  
                  const iWon = g.winner === user?.email || 
                               (myPlayerData && g.winner === myPlayerData.name)
                  
                  const variant = g.variant || 'classic'
                  const variantName = VARIANT_NAMES[variant]
                  
                  return (
                    <tr 
                      key={g.id} 
                      className={`transition-colors hover:bg-base-300/50 ${
                        iAbandoned ? 'opacity-60' : ''
                      } ${iWon ? 'bg-success/20 font-bold' : ''}`}
                    >
                      <td className={`text-sm xl:text-base ${iAbandoned ? '' : 'text-base-content/50'}`}>
                        {new Date(g.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span className="badge badge-neutral badge-sm xl:badge-md w-full justify-center">
                          {variantName}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="inline-grid grid-rows-[auto_auto] gap-1 justify-items-center">
                          <span className="font-bold text-primary text-sm xl:text-base">
                            {myScore}
                          </span>
                          {iAbandoned && (
                            <span className="badge badge-warning badge-sm">Abandonné</span>
                          )}
                        </div>
                      </td>
                      <td className="text-sm xl:text-base">
                        {iWon ? (
                          <span className="text-success font-bold">🏆 Vous</span>
                        ) : (
                          <span>{g.winner || 'Inconnu'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {games.length > 0 && (
        <div className="mt-4 md:mt-6 text-xs md:text-sm text-base-content/60">
          <p>
            💡 Seules vos <strong>10 dernières parties</strong> sont affichées. 
            Les parties abandonnées sont marquées d&apos;un badge &quot;Abandonné&quot;.
          </p>
        </div>
      )}
      </div>
    </div>
  )
}

