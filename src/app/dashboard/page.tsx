'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import CreateGame from './CreateGame'

interface Game {
  id: string
  owner: string
  status: string
  created_at: string
  winner: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { supabase, user } = useSupabase()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // Redirection si pas connecté
  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  // Charger les parties de l’utilisateur
  useEffect(() => {
    const fetchGames = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('owner', user.id)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setGames(data || [])
      setLoading(false)
    }

    fetchGames()
  }, [user, supabase])

  if (loading) return <p className="text-center mt-8">Chargement...</p>
  
  return (
    <div className="space-y-8 mt-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎲 Mes Parties</h1>
        <CreateGame />
      </div>

      {games.length === 0 ? (
        <p className="text-base-content/70 text-center mt-10">
          Aucune partie pour l’instant.<br />Crée ta première !
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>Statut</th>
                <th>Gagnant</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td className="font-mono">{g.id.slice(0, 8)}…</td>
                  <td>
                    <span
                      className={`badge ${
                        g.status === 'in_progress'
                          ? 'badge-primary'
                          : g.status === 'finished'
                          ? 'badge-success'
                          : 'badge-ghost'
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td>{g.winner ?? '-'}</td>
                  <td>{new Date(g.created_at).toLocaleString('fr-FR')}</td>
                  <td>
                    <button
                      onClick={() => router.push(`/game/${g.id}`)}
                      className="btn btn-sm btn-outline"
                    >
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
