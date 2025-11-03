'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { GameState, ScoreCategory } from '@/types/game'
import Dice from '@/components/game/Dice'
import ScoreGrid from '@/components/game/ScoreGrid'

type Player = { id: string; name: string }

export default function GamePage() {
  const params = useParams()
  const uuid = params?.uuid as string
  const router = useRouter()
  const { user, supabase } = useSupabase()

  const [players, setPlayers] = useState<Player[]>([])
  const [started, setStarted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [copied, setCopied] = useState(false)
  const [systemMessages, setSystemMessages] = useState<string[]>([])
  const [gameEnded, setGameEnded] = useState(false)
  const [endMessage, setEndMessage] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const isConnectingRef = useRef(false)

  const copyGameId = () => {
    navigator.clipboard.writeText(uuid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!uuid || !user) return

    // Évite les connexions multiples - vérification stricte
    if (socketRef.current) {
      console.log('⚠️ Socket déjà existant, on ne se reconnecte pas')
      return
    }

    if (isConnectingRef.current) {
      console.log('⚠️ Connexion déjà en cours, on attend...')
      return
    }

    // Fonction asynchrone pour gérer la connexion Socket
    const initSocket = async () => {
      isConnectingRef.current = true
      // Récupère le username de l'utilisateur depuis Supabase
      const fetchUsername = async () => {
        try {
          // Récupère les données utilisateur complètes depuis Supabase
          const { data, error } = await supabase.auth.getUser()
          
          if (error) {
            console.error('❌ Erreur lors de la récupération du user:', error)
            return user.email || 'Joueur'
          }

          const fetchedUsername = data.user?.user_metadata?.username || data.user?.email || 'Joueur'
          console.log('✅ Username récupéré:', fetchedUsername)
          return fetchedUsername
        } catch (error) {
          console.error('❌ Erreur lors de la récupération du username:', error)
          return user.email || 'Joueur'
        }
      }

      // Récupère le username avant de se connecter
      const playerName = await fetchUsername()
      if (!playerName) return

      // Connect to Socket.IO server
      console.log('🔌 Création d\'une nouvelle connexion Socket...')
      const newSocket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: false, // Désactive la reconnexion automatique pour éviter les doublons
      })

      socketRef.current = newSocket

      newSocket.on('connect', () => {
        console.log('✅ Connecté au serveur Socket avec ID:', newSocket.id)
        isConnectingRef.current = false
        newSocket.emit('join_room', {
          roomId: uuid,
          playerName: playerName,
        })
      })

      // Listener générique pour déboguer TOUS les événements
      newSocket.onAny((eventName, ...args) => {
        console.log(`🔔 Événement reçu: ${eventName}`, args)
      })

      newSocket.on('room_update', (room: { players: Player[]; started: boolean }) => {
        setPlayers(room.players)
        setStarted(room.started)
        const amIHost = room.players[0]?.id === newSocket.id
        setIsHost(amIHost)
      })

      newSocket.on('game_started', (initialState: GameState) => {
        console.log('📥 Événement game_started reçu:', initialState)
        setStarted(true)
        setGameState(initialState)
        console.log('✅ Partie démarrée! État mis à jour')
      })

      newSocket.on('game_update', (updatedState: GameState) => {
        setGameState(updatedState)
        console.log('🔄 État du jeu mis à jour', updatedState)
      })

      newSocket.on('system_message', (message: string) => {
        console.log('📢', message)
        setSystemMessages((prev) => [...prev, message])
      })

      newSocket.on('game_ended', (data: { winner: string; reason: string; message: string }) => {
        console.log('🏁 Partie terminée:', data)
        setGameEnded(true)
        setEndMessage(data.message)
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Erreur de connexion:', error)
        isConnectingRef.current = false
      })

      newSocket.on('disconnect', () => {
        console.log('🔌 Socket déconnecté')
        isConnectingRef.current = false
      })
    }

    initSocket()

    return () => {
      if (socketRef.current) {
        console.log('🔌 Nettoyage: Déconnexion du socket:', socketRef.current.id)
        socketRef.current.disconnect()
        socketRef.current = null
        isConnectingRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, user])

  const handleStart = () => {
    if (!uuid || !socketRef.current) return
    socketRef.current.emit('start_game', uuid)
  }

  const handleLeave = () => {
    if (socketRef.current) {
      if (started) {
        // Si la partie est démarrée, c'est un abandon
        console.log('🏳️ Le joueur abandonne la partie')
        socketRef.current.emit('abandon_game', uuid)
      } else {
        // Sinon, c'est juste quitter la salle d'attente
        console.log('🚪 Le joueur quitte la salle d\'attente')
        socketRef.current.emit('leave_room', uuid)
      }
      socketRef.current.disconnect()
      socketRef.current = null
    }
    router.push('/dashboard')
  }

  // Actions de jeu
  const handleRollDice = () => {
    if (socketRef.current && gameState) {
      socketRef.current.emit('roll_dice', uuid)
    }
  }

  const handleToggleDieLock = (dieIndex: number) => {
    if (socketRef.current && gameState) {
      socketRef.current.emit('toggle_die_lock', { roomId: uuid, dieIndex })
    }
  }

  const handleChooseScore = (category: ScoreCategory) => {
    if (socketRef.current && gameState) {
      socketRef.current.emit('choose_score', { roomId: uuid, category })
    }
  }

  // Helpers
  const isMyTurn = () => {
    if (!gameState || !socketRef.current) return false
    const currentPlayer = gameState.players[gameState.currentPlayerIndex]
    return currentPlayer.id === socketRef.current.id
  }

  // affichage
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <h1 className="text-3xl font-bold">Salle d&apos;attente 🎮</h1>
        
        <div className="flex items-center gap-3 bg-base-200 p-4 rounded-lg">
          <div>
            <p className="text-sm text-base-content/70 mb-1">Code de la partie :</p>
            <code className="text-lg font-mono">{uuid}</code>
          </div>
          <button
            onClick={copyGameId}
            className="btn btn-sm btn-ghost"
            title="Copier le code"
          >
            {copied ? '✓ Copié' : '📋 Copier'}
          </button>
        </div>

        <ul className="bg-base-200 p-4 rounded w-full max-w-md space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.name}</span>
              {p.id === players[0]?.id && <span className="badge badge-primary">Hôte</span>}
            </li>
          ))}
        </ul>

        {systemMessages.length > 0 && (
          <div className="bg-info/20 p-3 rounded w-full max-w-md">
            <p className="text-xs font-semibold mb-2">📢 Messages système :</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {systemMessages.slice(-3).map((msg, idx) => (
                <p key={idx} className="text-xs text-base-content/80">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-base-content/70">
          {players.length < 2
            ? "En attente d&apos;au moins un autre joueur..."
            : `${players.length} joueur${players.length > 1 ? 's' : ''} présent${players.length > 1 ? 's' : ''}, prêt à démarrer !`}
        </p>

        <div className="flex gap-3">
          {isHost && players.length >= 2 && (
            <button onClick={handleStart} className="btn btn-success">
              🚀 Démarrer la partie
            </button>
          )}
          <button onClick={handleLeave} className="btn btn-outline btn-error">
            🚪 Quitter la partie
          </button>
        </div>
      </div>
    )
  }

  // affichage quand la partie démarre
  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Chargement du jeu...</p>
      </div>
    )
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myTurn = isMyTurn()

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* En-tête */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">🎲 Yams - Tour {gameState.turnNumber}/13</h1>
        <p className="text-sm text-base-content/70">Partie #{uuid.slice(0, 8)}</p>
      </div>
      
      {gameEnded ? (
        <div className="text-center space-y-4">
          <div className="alert alert-success max-w-md mx-auto">
            <span className="text-lg">🏁 {endMessage}</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary"
          >
            Retour au dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Info joueur actif */}
          <div className={`alert ${myTurn ? 'alert-info' : 'alert-warning'} max-w-md mx-auto`}>
            {myTurn ? (
              <span>🎯 C&apos;est votre tour !</span>
            ) : (
              <span>⏳ Au tour de {currentPlayer.name}</span>
            )}
          </div>

          {/* Dés */}
          {myTurn && (
            <div className="card bg-base-200 max-w-2xl mx-auto">
              <div className="card-body items-center">
                <h3 className="card-title">Dés</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  Lancers restants : {gameState.rollsLeft}
                </p>
                
                <Dice 
                  dice={gameState.dice}
                  onToggleLock={handleToggleDieLock}
                  canRoll={gameState.rollsLeft > 0}
                />
                
                <button
                  onClick={handleRollDice}
                  disabled={gameState.rollsLeft === 0}
                  className="btn btn-primary mt-4"
                >
                  {gameState.rollsLeft === 3 ? '🎲 Lancer les dés' : '🎲 Relancer'}
                </button>
                
                <p className="text-xs text-base-content/60 mt-2">
                  Cliquez sur les dés pour les verrouiller/déverrouiller
                </p>
              </div>
            </div>
          )}

          {/* Grilles de score */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            {gameState.players.map((player) => (
              <div key={player.id}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">
                    {player.name}
                    {player.id === socketRef.current?.id && ' (Vous)'}
                  </h3>
                  <span className="badge badge-lg">
                    Score: {player.totalScore}
                  </span>
                </div>
                
                <ScoreGrid
                  scoreSheet={player.scoreSheet}
                  currentDice={gameState.dice.map(d => d.value)}
                  onChooseScore={handleChooseScore}
                  isMyTurn={myTurn && player.id === socketRef.current?.id}
                  canChoose={gameState.rollsLeft < 3}
                />
              </div>
            ))}
          </div>

          {/* Messages système */}
          {systemMessages.length > 0 && (
            <div className="bg-info/20 p-3 rounded max-w-md mx-auto">
              <p className="text-xs font-semibold mb-2">📢 Messages :</p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {systemMessages.slice(-3).map((msg, idx) => (
                  <p key={idx} className="text-xs text-base-content/80">
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Bouton abandonner */}
          <div className="text-center">
            <button
              onClick={handleLeave}
              className="btn btn-outline btn-error btn-sm"
            >
              🏳️ Abandonner
            </button>
          </div>
        </>
      )}
    </div>
  )
}
