/**
 * Composant affichant l'historique des parties terminées
 */

'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/Providers'

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
}

export default function GameHistory() {
  const { supabase, user } = useSupabase()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // Charger les 10 dernières parties terminées de l'utilisateur
  useEffect(() => {
    const fetchGames = async () => {
      if (!user) return

      // Récupérer les parties terminées (limite augmentée pour filtrer ensuite)
      const { data, error } = await supabase
        .from('games')
        .select('id, owner, status, created_at, winner, players_scores')
        .eq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(50) // Optimisé : 50 au lieu de 100

      if (error) {
        console.error('Erreur lors du chargement de l\'historique:', error)
        setLoading(false)
        return
      }

      // Filtrer les parties où l'utilisateur a participé et garder les 10 plus récentes
      const myGames = (data || [])
        .filter((game) => {
          // Vérifier si l'utilisateur est l'owner
          if (game.owner === user.id) return true
          
          // Vérifier si l'utilisateur est dans players_scores
          if (game.players_scores && Array.isArray(game.players_scores)) {
            return game.players_scores.some((p: PlayerScore) => p.user_id === user.id)
          }
          
          return false
        })
        .slice(0, 10) // Garder seulement les 10 plus récentes

      setGames(myGames)
      setLoading(false)
    }

    fetchGames()
  }, [user, supabase])

  if (loading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title">📜 Historique des parties</h2>
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <div className="flex justify-between items-center mb-2">
          <h2 className="card-title">📜 Historique des parties</h2>
          {games.length > 0 && (
            <span className="badge badge-primary">{games.length} / 10</span>
          )}
        </div>

        {games.length === 0 ? (
          <p className="text-base-content/70 text-center py-8">
            Aucune partie terminée pour le moment.
            <br />
            Jouez votre première partie !
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Votre score</th>
                  <th>Vainqueur</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  // Trouver le joueur (utilisateur) dans players_scores
                  const myPlayerData = g.players_scores && g.players_scores.length > 0
                    ? g.players_scores.find((p: PlayerScore) => p.user_id === user?.id)
                    : null
                  
                  const myScore = myPlayerData?.score ?? 'N/A'
                  const iAbandoned = myPlayerData?.abandoned ?? false
                  
                  // Vérifier si l'utilisateur est le vainqueur
                  const iWon = g.winner === user?.email || 
                               (myPlayerData && g.winner === myPlayerData.name)

                  return (
                    <tr key={g.id} className={iAbandoned ? 'opacity-60' : ''}>
                      <td>
                        {new Date(g.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{myScore}</span>
                          {iAbandoned && (
                            <span className="badge badge-warning badge-sm">Abandonné</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {iWon ? (
                            <span className="text-success font-bold">🏆 Vous</span>
                          ) : (
                            <span>{g.winner || 'Inconnu'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {games.length > 0 && (
          <div className="alert alert-info mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span className="text-sm">
              💡 Seules vos <strong>10 dernières parties</strong> sont affichées. 
              Les parties abandonnées sont marquées d&apos;un badge &quot;Abandonné&quot;.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

