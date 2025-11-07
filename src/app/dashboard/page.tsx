'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import CreateGame from '@/components/CreateGame'
import JoinGame from '@/components/JoinGame'

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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [interruptedGames, setInterruptedGames] = useState<Game[]>([])
  const [showInterruptedAlert, setShowInterruptedAlert] = useState(true)

  const copyGameId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Redirection si pas connecté
  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

  // Charger les parties de l'utilisateur
  useEffect(() => {
    const fetchGames = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('owner', user.id)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else {
        setGames(data || [])
        // Filtrer les parties interrompues
        const interrupted = (data || []).filter(g => g.status === 'server_interrupted')
        setInterruptedGames(interrupted)
      }
      setLoading(false)
    }

    fetchGames()
  }, [user, supabase])

  if (loading) return <p className="text-center mt-8">Chargement...</p>
  
  return (
    <div className="space-y-8 mt-6">
      
      {/* Alerte pour les parties interrompues */}
      {interruptedGames.length > 0 && showInterruptedAlert && (
        <div className="alert alert-warning shadow-lg">
          <div className="flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <h3 className="font-bold">Partie(s) interrompue(s)</h3>
              <div className="text-sm">
                {interruptedGames.length === 1 
                  ? 'Une de vos parties a été interrompue suite à un redémarrage du serveur. Cette partie ne compte pas et il n\'y a pas de vainqueur.'
                  : `${interruptedGames.length} de vos parties ont été interrompues suite à un redémarrage du serveur. Ces parties ne comptent pas et il n'y a pas de vainqueur.`
                }
              </div>
            </div>
          </div>
          <div className="flex-none">
            <button 
              onClick={() => setShowInterruptedAlert(false)}
              className="btn btn-sm btn-ghost"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎲 Mes Parties</h1>
        <CreateGame />
      </div>

      {/* Section pour rejoindre une partie */}
      <div className="card bg-base-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Rejoindre une partie existante</h2>
        <JoinGame />
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
                          : g.status === 'server_interrupted'
                          ? 'badge-warning'
                          : 'badge-ghost'
                      }`}
                    >
                      {g.status === 'server_interrupted' ? 'interrompue' : g.status}
                    </span>
                  </td>
                  <td>{g.winner ?? '-'}</td>
                  <td>{new Date(g.created_at).toLocaleString('fr-FR')}</td>
                  <td className="flex gap-2">
                    <button
                      onClick={() => copyGameId(g.id)}
                      className="btn btn-sm btn-ghost"
                      title="Copier le code"
                    >
                      {copiedId === g.id ? '✓' : '📋'}
                    </button>
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
