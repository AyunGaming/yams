/**
 * Page de jeu principale
 * Gère l'état global de la partie et coordonne les composants
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { useGameSocket } from '@/hooks/useGameSocket'
import {
  handleStartGame,
  handleLeaveGame,
  handleRollDice,
  handleToggleDieLock,
  handleChooseScore,
} from '@/lib/gameHandlers'
import { ScoreCategory, GameVariant } from '@/types/game'
import WaitingRoom from '@/components/game/WaitingRoom'
import GameBoard from '@/components/game/GameBoard'
import GameOver from '@/components/game/GameOver'

/**
 * Page de jeu
 */
export default function GamePage() {
  const params = useParams()
  const uuid = params?.uuid as string
  const router = useRouter()
  const { user, userProfile, supabase, isLoading: authLoading } = useSupabase()

  // État du jeu via le hook personnalisé
  const { socket, players, started, isHost, gameState, gameEnded, systemMessages } = useGameSocket(
    {
      uuid,
      user,
      supabase,
      authLoading,
      userProfile, // Passer le profil pour éviter une requête supplémentaire
    }
  )

  // État local pour les animations des dés
  const [isRolling, setIsRolling] = useState(false)
  const [rollCount, setRollCount] = useState(0)
  
  // État pour la variante de la partie
  const [variant, setVariant] = useState<GameVariant>('classic')
  const [variantLoading, setVariantLoading] = useState(true)

  // Charger la variante depuis la base de données
  useEffect(() => {
    const fetchVariant = async () => {
      if (!uuid) return
      
      try {
        const { data, error } = await supabase
          .from('games')
          .select('variant')
          .eq('id', uuid)
          .single()
        
        if (!error && data) {
          setVariant(data.variant || 'classic')
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la variante:', err)
      } finally {
        setVariantLoading(false)
      }
    }
    
    fetchVariant()
  }, [uuid, supabase])

  // Gérer l'animation des dés
  useEffect(() => {
    if (gameState && isRolling) {
      // Terminer l'animation après 600ms
      const timer = setTimeout(() => {
        setIsRolling(false)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [gameState, isRolling])

  /**
   * Gestionnaires d'événements
   */
  const onStart = () => handleStartGame(socket, uuid)

  const onLeave = () =>
    handleLeaveGame(socket, uuid, started, () => {
      router.push('/dashboard')
    })

  const onRollDice = () => handleRollDice(socket, uuid, setIsRolling, setRollCount)

  const onToggleDieLock = (dieIndex: number) => handleToggleDieLock(socket, uuid, dieIndex)

  const onChooseScore = (category: ScoreCategory) => handleChooseScore(socket, uuid, category)

  /**
   * Affichage conditionnel selon l'état de la partie
   */

  // Salle d'attente
  if (!started) {
    return (
      <WaitingRoom
        uuid={uuid}
        players={players}
        systemMessages={systemMessages}
        isHost={isHost}
        onStart={onStart}
        onLeave={onLeave}
        variant={variant}
        variantLoading={variantLoading}
      />
    )
  }

  // Chargement du jeu
  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Chargement du jeu...</p>
      </div>
    )
  }

  // Écran de fin de partie
  if (gameEnded || gameState.gameStatus === 'finished') {
    return <GameOver gameState={gameState} mySocketId={socket?.id} socket={socket} />
  }

  // Plateau de jeu
  return (
    <GameBoard
      uuid={uuid}
      gameState={gameState}
      socket={socket!}
      systemMessages={systemMessages}
      isRolling={isRolling}
      rollCount={rollCount}
      onRollDice={onRollDice}
      onToggleDieLock={onToggleDieLock}
      onChooseScore={onChooseScore}
      onLeave={onLeave}
    />
  )
}
