'use client'

import { GameState } from '@/types/game'
import { useRouter } from 'next/navigation'
import { Socket } from 'socket.io-client'
import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/Providers'
import { v4 as uuidv4 } from 'uuid'

interface GameOverProps {
  gameState: GameState
  mySocketId: string | undefined
  socket: Socket | null
}

export default function GameOver({ gameState, mySocketId, socket }: GameOverProps) {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const [creatingRematch, setCreatingRematch] = useState(false)
  const [rematchAvailable, setRematchAvailable] = useState<string | null>(null)
  
  // Déterminer si je suis l'hôte basé sur le premier joueur de la partie
  const amIHost = gameState.players[0]?.id === mySocketId
  
  // Trier les joueurs : actifs par score décroissant, puis abandonnés à la fin
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.abandoned && !b.abandoned) return 1
    if (!a.abandoned && b.abandoned) return -1
    return b.totalScore - a.totalScore
  })
  
  const winner = sortedPlayers.find(p => !p.abandoned) || sortedPlayers[0]
  const isWinner = winner.id === mySocketId && !winner.abandoned

  // Créer une nouvelle partie (rematch)
  const handleRematch = async () => {
    if (!user || !socket) return

    setCreatingRematch(true)
    const newGameId = uuidv4()

    // Créer la nouvelle partie dans la base de données
    const { error } = await supabase.from('games').insert([
      {
        id: newGameId,
        status: 'waiting',
        owner: user.id,
        created_at: new Date().toISOString(),
      },
    ])

    setCreatingRematch(false)

    if (error) {
      console.error('Erreur lors de la création de la revanche:', error)
      alert("Erreur lors de la création de la partie.")
      return
    }

    // Notifier les autres joueurs qu'une nouvelle partie est disponible
    socket.emit('rematch_created', {
      oldRoomId: gameState.roomId,
      newRoomId: newGameId,
      hostName: gameState.players[0]?.name || 'L\'hôte',
    })

    // Rediriger l'hôte vers la nouvelle partie
    router.push(`/game/${newGameId}`)
  }

  // Écouter les notifications de rematch
  useEffect(() => {
    if (!socket || amIHost) return

    const handleRematchAvailable = (data: { newRoomId: string; hostName: string }) => {
      console.log('🔔 Rematch disponible:', data)
      setRematchAvailable(data.newRoomId)
    }

    socket.on('rematch_available', handleRematchAvailable)

    return () => {
      socket.off('rematch_available', handleRematchAvailable)
    }
  }, [socket, amIHost])

  // Calculer le meilleur score de chaque section pour chaque joueur
  const getUpperSectionScore = (player: typeof sortedPlayers[0]) => {
    return (player.scoreSheet.ones || 0) +
           (player.scoreSheet.twos || 0) +
           (player.scoreSheet.threes || 0) +
           (player.scoreSheet.fours || 0) +
           (player.scoreSheet.fives || 0) +
           (player.scoreSheet.sixes || 0)
  }

  const getUpperBonus = (player: typeof sortedPlayers[0]) => {
    return getUpperSectionScore(player) >= 63 ? 35 : 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 to-base-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        
        {/* Bannière de victoire */}
        <div className="text-center space-y-4">
          {isWinner && (
            <div className="animate-bounce">
              <div className="text-6xl mb-2">🏆</div>
            </div>
          )}
          <h1 className={`text-4xl font-bold ${isWinner ? 'text-warning animate-pulse' : ''}`}>
            {isWinner ? 'Félicitations, vous avez gagné !' : `${winner.name} remporte la partie !`}
          </h1>
          <p className="text-xl text-base-content/70">
            Partie terminée • 13 tours
          </p>
        </div>

        {/* Podium */}
        <div className="card bg-base-200 shadow-2xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">🎯 Classement Final</h2>
            
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const isMe = player.id === mySocketId
                const upperScore = getUpperSectionScore(player)
                const upperBonus = getUpperBonus(player)
                
                return (
                  <div
                    key={player.id}
                    className={`
                      flex items-center gap-4 p-4 rounded-lg transition-all
                      ${index === 0 && !player.abandoned ? 'bg-gradient-to-r from-warning/20 to-warning/10 border-2 border-warning' : 'bg-base-100'}
                      ${isMe ? 'ring-2 ring-primary' : ''}
                      ${player.abandoned ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Position */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-base-300 flex items-center justify-center">
                      {index === 0 ? (
                        <span className="text-2xl">🥇</span>
                      ) : index === 1 ? (
                        <span className="text-2xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="text-xl font-bold">#{index + 1}</span>
                      )}
                    </div>

                    {/* Nom du joueur */}
                    <div className="flex-1">
                      <div className="font-bold text-lg">
                        {player.name}
                        {isMe && <span className="ml-2 text-sm text-primary">(Vous)</span>}
                        {player.abandoned && <span className="ml-2 text-sm text-error">(Abandonné)</span>}
                      </div>
                      <div className="text-sm text-base-content/60">
                        Section sup: {upperScore} {upperBonus > 0 && `+ Bonus: ${upperBonus}`}
                      </div>
                    </div>

                    {/* Score total */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">
                        {player.totalScore}
                      </div>
                      <div className="text-xs text-base-content/60">points</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-base-200">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">🎲</div>
              <div className="text-2xl font-bold">{sortedPlayers.length}</div>
              <div className="text-sm text-base-content/60">Joueurs</div>
            </div>
          </div>
          
          <div className="card bg-base-200">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">🏅</div>
              <div className="text-2xl font-bold">{winner.totalScore}</div>
              <div className="text-sm text-base-content/60">Score gagnant</div>
            </div>
          </div>
          
          <div className="card bg-base-200">
            <div className="card-body text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-2xl font-bold">
                {Math.round(sortedPlayers.reduce((sum, p) => sum + p.totalScore, 0) / sortedPlayers.length)}
              </div>
              <div className="text-sm text-base-content/60">Score moyen</div>
            </div>
          </div>
        </div>

        {/* Notification de rematch disponible (pour les non-hôtes) */}
        {!amIHost && rematchAvailable && (
          <div className="card bg-gradient-to-r from-primary to-secondary shadow-2xl border-2 border-primary/50 animate-pulse">
            <div className="card-body">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl animate-bounce">🎮</div>
                  <div>
                    <h3 className="text-xl font-bold text-primary-content">
                      Nouvelle partie disponible !
                    </h3>
                    <p className="text-sm text-primary-content/80 mt-1">
                      L&apos;hôte a créé une nouvelle partie. Prêt pour une revanche ?
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => router.push(`/game/${rematchAvailable}`)}
                    className="btn btn-success gap-2 shadow-lg hover:scale-105 transition-transform"
                  >
                    <span className="text-lg">🎯</span>
                    Rejoindre
                  </button>
                  <button
                    onClick={() => setRematchAvailable(null)}
                    className="btn btn-ghost btn-outline text-primary-content hover:bg-base-100/20"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary btn-lg"
          >
            🏠 Retour au Dashboard
          </button>
          {amIHost && (
            <button
              onClick={handleRematch}
              disabled={creatingRematch}
              className="btn btn-outline btn-lg"
            >
              {creatingRematch ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Création...
                </>
              ) : (
                '🔄 Nouvelle Partie'
              )}
            </button>
          )}
        </div>

        {/* Note */}
        <p className="text-center text-sm text-base-content/50">
          Merci d&apos;avoir joué ! 🎉
        </p>
      </div>
    </div>
  )
}

