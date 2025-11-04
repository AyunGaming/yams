'use client'

import { GameState } from '@/types/game'
import { useRouter } from 'next/navigation'

interface GameOverProps {
  gameState: GameState
  mySocketId: string | undefined
}

export default function GameOver({ gameState, mySocketId }: GameOverProps) {
  const router = useRouter()
  
  // Trier les joueurs : actifs par score décroissant, puis abandonnés à la fin
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.abandoned && !b.abandoned) return 1
    if (!a.abandoned && b.abandoned) return -1
    return b.totalScore - a.totalScore
  })
  
  const winner = sortedPlayers.find(p => !p.abandoned) || sortedPlayers[0]
  const isWinner = winner.id === mySocketId && !winner.abandoned

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

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary btn-lg"
          >
            🏠 Retour au Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-lg"
          >
            🔄 Nouvelle Partie
          </button>
        </div>

        {/* Note */}
        <p className="text-center text-sm text-base-content/50">
          Merci d&apos;avoir joué ! 🎉
        </p>
      </div>
    </div>
  )
}

