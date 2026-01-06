/**
 * Composant d'écran de fin de partie
 * Affiche les résultats, le classement et les actions disponibles
 */

'use client'

import { useEffect, useRef } from 'react'
import { GameState } from '@/types/game'
import { Socket } from 'socket.io-client'
import { useSupabase } from '@/components/Providers'
import { useSaveGameStats } from '@/hooks/useSaveGameStats'
import { useCheckAchievements } from '@/hooks/useCheckAchievements'
import { useFlashMessage } from '@/contexts/FlashMessageContext'
import FinalLeaderboard from './FinalLeaderboard'
import GameOverActions from './GameOverActions'

interface GameOverProps {
  gameState: GameState
  mySocketId: string | undefined
  socket: Socket | null
  amIHost: boolean
}

/**
 * Composant d'écran de fin de partie
 */
export default function GameOver({ gameState, mySocketId, socket, amIHost }: GameOverProps) {
  const { userProfile, refreshUserProfile } = useSupabase()
  const { showAchievement } = useFlashMessage()
  const winAyunAchievementSentRef = useRef(false)

  // Trier les joueurs pour trouver le gagnant
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.abandoned && !b.abandoned) return 1
    if (!a.abandoned && b.abandoned) return -1
    return b.totalScore - a.totalScore
  })

  const winner = sortedPlayers.find((p) => !p.abandoned) || sortedPlayers[0]

  // Tous les joueurs actifs ayant le meilleur score sont considérés comme vainqueurs
  const activePlayers = gameState.players.filter((p) => !p.abandoned)
  const topScore =
    activePlayers.length > 0
      ? Math.max(...activePlayers.map((p) => p.totalScore))
      : null

  const myPlayer = mySocketId
    ? gameState.players.find((p) => p.id === mySocketId)
    : null

  const isWinner =
    !!myPlayer &&
    !myPlayer.abandoned &&
    topScore !== null &&
    myPlayer.totalScore === topScore

  // Sauvegarder les statistiques automatiquement
  useSaveGameStats({
    gameState,
    mySocketId,
    // On ne passe que l'ID utilisateur, typé simplement
    user: userProfile ? { id: userProfile.id } : null,
    isWinner,
    refreshUserProfile,
  })

  // Vérifier et débloquer les achievements
  useCheckAchievements({
    gameState,
    mySocketId,
    userProfile,
    isWinner,
  })

  // Succès spécial : gagner une partie contre Ayun (le créateur)
  useEffect(() => {
    if (winAyunAchievementSentRef.current) return
    if (!userProfile || !isWinner || !myPlayer) return

    // Trouver le joueur "Ayun" dans la partie (même s'il a abandonné)
    const ayunPlayer = gameState.players.find(
      (p) => p.name.trim().toLowerCase() === 'ayun'
    )

    // Conditions : Ayun est dans la partie et a un score strictement plus bas
    // (même s'il a abandonné, le joueur qui gagne mérite le succès)
    if (!ayunPlayer) return
    if (ayunPlayer.totalScore >= myPlayer.totalScore) return

    winAyunAchievementSentRef.current = true

    ;(async () => {
      try {
        const res = await fetch('/api/achievements/unlock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ achievementId: 'win_ayun' }),
        })

        if (res.ok) {
          const json = await res.json().catch(() => null)
          if (json?.achievement) {
            showAchievement(json.achievement)
          }
        }
      } catch (error) {
        console.warn('[GAME OVER] Impossible de débloquer le succès win_ayun:', error)
      }
    })()
  }, [gameState.players, isWinner, myPlayer, showAchievement, userProfile])

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Titre */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Partie terminée</h1>
        <p className="text-sm text-base-content/70">Partie #{gameState.roomId.slice(0, 8)}</p>
      </div>

      {/* Classement final */}
      <FinalLeaderboard
        gameState={gameState}
        mySocketId={mySocketId}
        winner={winner}
        isWinner={isWinner}
      />

      {/* Actions */}
      <GameOverActions
        gameState={gameState}
        mySocketId={mySocketId}
        socket={socket}
        user={userProfile ? { id: userProfile.id } : null}
        amIHost={amIHost}
      />
    </div>
  )
}
