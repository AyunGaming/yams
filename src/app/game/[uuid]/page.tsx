/**
 * Page de jeu principale
 * Gère l'état global de la partie et coordonne les composants
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { useGameSocket } from '@/hooks/useGameSocket'
import { useGameProtection } from '@/contexts/GameProtectionContext'
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
  const { setIsInActiveGame, setSocket, setRoomId } = useGameProtection()

  // Vérification de l'existence de la partie
  const [gameExists, setGameExists] = useState<boolean | null>(null)
  const isRedirectingRef = useRef(false)

  // État du jeu via le hook personnalisé
  const { socket, players, started, isHost, gameState, gameEnded, systemMessages, roomJoined, onDiceRolled, turnTimeLeft } = useGameSocket(
    {
      uuid,
      user,
      supabase: supabase!,
      authLoading,
      userProfile, // Passer le profil pour éviter une requête supplémentaire
      shouldConnect: gameExists === true, // Ne se connecter que si la partie existe
    }
  )

  // État local pour les animations des dés
  const [isRolling, setIsRolling] = useState(false)
  const [rollCount, setRollCount] = useState(0)
  
  // État pour la variante de la partie
  const [variant, setVariant] = useState<GameVariant>('classic')
  const [variantLoading, setVariantLoading] = useState(true)

  // Référence pour savoir si on peut quitter sans confirmation
  const canLeaveWithoutWarning = useRef(false)

  // Signaler au contexte global si on est en partie active + passer socket et roomId
  useEffect(() => {
    console.log('[PROTECTION] Démarrage vérification', {
      hasGameState: !!gameState,
      hasPlayers: !!gameState?.players,
      started,
      gameEnded
    })
    
    // Si pas de gameState, pas de protection
    if (!gameState || !gameState.players) {
      console.log('[PROTECTION] Pas de gameState ou players, pas de protection')
      setIsInActiveGame(false)
      return
    }
    
    console.log('[PROTECTION] Recherche joueur:', {
      userId: user?.id,
      socketId: socket?.id,
      allPlayers: gameState.players.map(p => ({
        name: p.name,
        userId: p.userId,
        socketId: p.id,
        abandoned: p.abandoned
      }))
    })
    
    // Vérifier si le joueur actuel a abandonné (spectateur)
    // Chercher par userId (plus fiable) ou par socket.id
    const myPlayer = gameState.players.find(
      p => p.userId === user?.id || p.id === socket?.id
    )
    const isAbandoned = myPlayer?.abandoned || false
    
    // Ne protéger que si en partie active ET que le joueur n'a pas abandonné
    const isInActiveGame = started && !gameEnded && gameState.gameStatus !== 'finished' && !isAbandoned
    
    console.log('[PROTECTION] Résultat:', { 
      myPlayerFound: !!myPlayer,
      myPlayerName: myPlayer?.name,
      myPlayerAbandoned: myPlayer?.abandoned,
      isAbandoned, 
      isInActiveGame
    })
    
    setIsInActiveGame(isInActiveGame)
    setSocket(socket)
    setRoomId(uuid)
  }, [started, gameEnded, gameState, socket, uuid, user?.id, setIsInActiveGame, setSocket, setRoomId])

  // Protection contre la navigation accidentelle pendant une partie
  useEffect(() => {
    // Si pas de gameState, pas de protection
    if (!gameState || !gameState.players) {
      return
    }
    
    // Vérifier si le joueur actuel a abandonné (spectateur)
    // Chercher par userId (plus fiable) ou par socket.id
    const myPlayer = gameState.players.find(
      p => p.userId === user?.id || p.id === socket?.id
    )
    const isAbandoned = myPlayer?.abandoned || false
    
    console.log('[PROTECTION] beforeunload check:', {
      isAbandoned,
      myPlayerName: myPlayer?.name
    }) 
    
    // Ne protéger que si la partie est en cours ET que le joueur n'a pas abandonné
    if (!started || gameEnded || gameState.gameStatus === 'finished' || isAbandoned) {
      return
    }

    // 1. Protection contre la fermeture/rafraîchissement de la page
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Le message personnalisé n'est plus supporté par les navigateurs modernes
      // mais on doit quand même définir returnValue pour que ça marche
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [started, gameEnded, gameState, socket?.id, user?.id])

  // SÉCURITÉ : Vérifier l'existence de la partie AVANT tout
  useEffect(() => {
    const checkGameExists = async () => {
      if (!uuid || !supabase || authLoading || isRedirectingRef.current) return
      
      try {
        const { data, error } = await supabase
          .from('games')
          .select('id, status, variant')
          .eq('id', uuid)
          .single()
        
        if (error || !data) {
          console.log('[GAME] ❌ Partie introuvable:', uuid)
          if (!isRedirectingRef.current) {
            isRedirectingRef.current = true
            alert('Cette partie n\'existe pas ou a été supprimée.')
            router.replace('/dashboard')
          }
          return
        }

        if (data.status === 'finished') {
          console.log('[GAME] ❌ Partie déjà terminée:', uuid)
          if (!isRedirectingRef.current) {
            isRedirectingRef.current = true
            alert('Cette partie est déjà terminée.')
            router.replace('/dashboard')
          }
          return
        }

        // La partie existe, on peut continuer
        setGameExists(true)
        setVariant(data.variant || 'classic')
        setVariantLoading(false)
      } catch (err) {
        console.error('Erreur lors de la vérification de la partie:', err)
        if (!isRedirectingRef.current) {
          isRedirectingRef.current = true
          alert('Erreur lors de la vérification de la partie.')
          router.replace('/dashboard')
        }
      }
    }
    
    checkGameExists()
  }, [uuid, supabase, authLoading, router])

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

  // Déclencher l'animation quand les dés sont lancés (événement socket)
  useEffect(() => {
    if (onDiceRolled) {
      setIsRolling(true)
      setRollCount(prev => prev + 1)
      onDiceRolled() // Réinitialiser le trigger
    }
  }, [onDiceRolled])

  /**
   * Gestionnaires d'événements
   */
  const onStart = () => handleStartGame(socket, uuid)

  const onLeave = () => {
    // Autoriser la navigation après avoir cliqué sur "Abandonner"
    canLeaveWithoutWarning.current = true
    handleLeaveGame(socket, uuid, started, () => {
      router.push('/dashboard')
    })
  }

  const onRollDice = () => handleRollDice(socket, uuid, setIsRolling, setRollCount)

  const onToggleDieLock = (dieIndex: number) => handleToggleDieLock(socket, uuid, dieIndex)

  const onChooseScore = (category: ScoreCategory) => handleChooseScore(socket, uuid, category)

  /**
   * Affichage conditionnel selon l'état de la partie
   */

  // Vérification de l'existence de la partie en cours
  if (gameExists === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Vérification de la partie...</p>
      </div>
    )
  }

  // Attente de confirmation du serveur avant d'afficher la waiting room
  if (!started && !roomJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Connexion à la partie...</p>
      </div>
    )
  }

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
      turnTimeLeft={turnTimeLeft}
      onRollDice={onRollDice}
      onToggleDieLock={onToggleDieLock}
      onChooseScore={onChooseScore}
      onLeave={onLeave}
    />
  )
}
