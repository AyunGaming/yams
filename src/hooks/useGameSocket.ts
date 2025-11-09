/**
 * Hook personnalisé pour gérer la connexion Socket.IO d'une partie
 * Gère l'authentification, la reconnexion automatique et les événements
 */

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/navigation'
import { SupabaseClient, User } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { tokenManager } from '@/lib/tokenManager'
import { GameState } from '@/types/game'
import { UserProfile } from '@/types/user'

type Player = { id: string; name: string }

interface UseGameSocketParams {
  uuid: string
  user: User | null
  supabase: SupabaseClient
  authLoading: boolean
  userProfile?: UserProfile | null
  shouldConnect?: boolean // Permet de retarder la connexion
}

interface UseGameSocketReturn {
  socket: Socket | null
  players: Player[]
  started: boolean
  isHost: boolean
  gameState: GameState | null
  gameEnded: boolean
  systemMessages: string[]
  isConnecting: boolean
  roomJoined: boolean // Indique si le serveur a confirmé l'accès à la room
  onDiceRolled: (() => void) | null // Callback appelé quand les dés sont lancés
  turnTimeLeft: number | null // Temps restant pour le tour actuel en secondes
}

/**
 * Hook pour gérer la connexion Socket.IO et l'état du jeu
 */
export function useGameSocket({
  uuid,
  user,
  supabase,
  authLoading,
  userProfile,
  shouldConnect = true, // Par défaut, on se connecte
}: UseGameSocketParams): UseGameSocketReturn {
  const router = useRouter()
  const socketRef = useRef<Socket | null>(null)
  const isConnectingRef = useRef(false)

  const [players, setPlayers] = useState<Player[]>([])
  const [started, setStarted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameEnded, setGameEnded] = useState(false)
  const [systemMessages, setSystemMessages] = useState<string[]>([])
  const [roomJoined, setRoomJoined] = useState(false)
  const [diceRolledTrigger, setDiceRolledTrigger] = useState(0)
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (authLoading) return

    // Ne pas se connecter si shouldConnect est false
    if (!shouldConnect) {
      logger.debug('Socket: connexion bloquée (shouldConnect=false)')
      return
    }

    // Rediriger vers login si pas connecté
    if (!user) {
      router.push('/login')
      return
    }

    if (!uuid) return

    // Évite les connexions multiples
    if (socketRef.current || isConnectingRef.current) {
      return
    }

    logger.debug('Socket: démarrage de la connexion (shouldConnect=true)')

    /**
     * Récupère le username de l'utilisateur (optimisé)
     * Utilise d'abord le userProfile du contexte, puis fallback sur Supabase
     */
    const fetchUsername = async (): Promise<string> => {
      // OPTIMISATION : Utiliser le profil déjà chargé dans le contexte
      if (userProfile?.username) {
        logger.debug('✅ Username récupéré depuis le contexte')
        return userProfile.username
      }

      // Fallback : Récupérer depuis Supabase
      try {
        const { data, error } = await supabase.auth.getUser()

        if (error) {
          logger.error('Erreur lors de la récupération du user:', error)
          return user.email || 'Joueur'
        }

        return data.user?.user_metadata?.username || data.user?.email || 'Joueur'
      } catch (error) {
        logger.error('Erreur lors de la récupération du username:', error)
        return user.email || 'Joueur'
      }
    }

    /**
     * Initialise la connexion Socket.IO (optimisé)
     */
    const initSocket = async () => {
      isConnectingRef.current = true

      const playerName = await fetchUsername()
      if (!playerName) return

      // OPTIMISATION : Récupérer le token depuis localStorage d'abord
      let token = tokenManager.getToken()
      
      if (!token || tokenManager.isTokenExpired()) {
        logger.debug('Token local absent ou expiré, récupération depuis Supabase')
        const {
          data: { session },
        } = await supabase.auth.getSession()
        token = session?.access_token || null
      }

      if (!token) {
        logger.error("Pas de token d'authentification disponible")
        isConnectingRef.current = false
        return
      }

      // Récupérer l'ID de session serveur
      const serverRestartId = localStorage.getItem('serverRestartId')

      // Créer la connexion Socket.IO
      const newSocket = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 20000, // Augmenter le timeout à 20s (utile pour Docker)
        forceNew: true,
        auth: {
          token: token,
          serverRestartId: serverRestartId,
        },
      })

      socketRef.current = newSocket

      // Recevoir et stocker l'ID de session serveur
      newSocket.on('server_restart_id', (restartId: string) => {
        localStorage.setItem('serverRestartId', restartId)
      })

      // Connexion réussie
      newSocket.on('connect', () => {
        isConnectingRef.current = false
        newSocket.emit('join_room', uuid)
      })

      // Gérer les erreurs d'authentification et de redémarrage serveur
      newSocket.on('connect_error', async (error) => {
        logger.error('Erreur de connexion Socket:', error.message)
        isConnectingRef.current = false

        // Détection de redémarrage serveur → Tentative de reconnexion automatique
        if (error.message === 'SERVER_RESTARTED') {
          logger.warn('Le serveur a redémarré - Tentative de reconnexion automatique')

          // Nettoyer l'ancien serverRestartId
          localStorage.removeItem('serverRestartId')

          // Nettoyer l'ancien socket
          if (socketRef.current) {
            socketRef.current.removeAllListeners()
            socketRef.current.disconnect()
            socketRef.current = null
          }

          try {
            // Régénérer un nouveau token depuis Supabase
            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession()

            if (sessionError || !session?.access_token) {
              logger.error('Impossible de récupérer une session valide:', sessionError)
              alert('Le serveur a redémarré et votre session a expiré. Veuillez vous reconnecter.')
              router.push('/login')
              return
            }

            // Attendre un peu pour laisser le serveur se stabiliser
            await new Promise((resolve) => setTimeout(resolve, 1000))

            // Réinitialiser la connexion
            await initSocket()
          } catch (err) {
            logger.error('Erreur lors de la reconnexion automatique:', err)
            alert('Impossible de se reconnecter automatiquement. Veuillez actualiser la page.')
          }

          return
        }

        if (error.message.includes('Authentication')) {
          alert("Erreur d'authentification. Veuillez vous reconnecter.")
          router.push('/login')
        }
      })

      // Mise à jour de la room
      newSocket.on('room_update', (room: { players: Player[]; started: boolean }) => {
        setPlayers(room.players)
        setStarted(room.started)
        const amIHost = room.players[0]?.id === newSocket.id
        setIsHost(amIHost)
        setRoomJoined(true) // Confirmation que le serveur a accepté l'accès à la room
      })

      // Partie démarrée
      newSocket.on('game_started', (initialState: GameState) => {
        setStarted(true)
        setGameState(initialState)
        setRoomJoined(true) // Confirmation que le serveur a accepté l'accès à la room
      })

      // Mise à jour du jeu
      newSocket.on('game_update', (updatedState: GameState) => {
        setGameState(updatedState)
      })

      // Message système
      newSocket.on('system_message', (message: string) => {
        console.log('[CLIENT] Message système reçu:', message)
        setSystemMessages((prev) => [...prev, message])
      })

      // Partie terminée
      newSocket.on('game_ended', () => {
        setGameEnded(true)
      })

      // L'hôte a quitté une partie terminée -> rediriger vers le dashboard
      newSocket.on('host_left_finished_game', (data: { message: string }) => {
        logger.info('Hôte a quitté la partie terminée:', data.message)
        alert(data.message)
        router.replace('/dashboard')
      })

      // Dés lancés (pour déclencher l'animation chez tous les joueurs)
      newSocket.on('dice_rolled', () => {
        setDiceRolledTrigger(prev => prev + 1)
      })

      // Mise à jour du timer du tour
      newSocket.on('turn_timer_update', (timeLeft: number) => {
        setTurnTimeLeft(timeLeft)
      })

      // Partie introuvable (pas d'alerte car déjà gérée côté client)
      newSocket.on('game_not_found', (data: { message: string }) => {
        logger.error('Partie introuvable:', data.message)
        // Redirection silencieuse car l'alerte a déjà été affichée côté client
        router.replace('/dashboard')
      })

      // Erreur générale (ex: tentative de jouer contre soi-même)
      newSocket.on('error', (data: { message: string }) => {
        logger.error('Erreur:', data.message)
        
        // Déconnecter et nettoyer le socket
        if (socketRef.current) {
          socketRef.current.removeAllListeners()
          socketRef.current.disconnect()
          socketRef.current = null
        }
        isConnectingRef.current = false
        setRoomJoined(false) // Accès refusé
        
        // Afficher l'alerte puis rediriger vers le dashboard
        alert(data.message)
        router.replace('/dashboard')
      })

      // Erreur de connexion
      newSocket.on('connect_error', (error) => {
        logger.error('Erreur de connexion:', error)
        isConnectingRef.current = false
      })

      // Déconnexion
      newSocket.on('disconnect', () => {
        isConnectingRef.current = false
      })
    }

    initSocket()

    // Nettoyage
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        isConnectingRef.current = false
      }
      setRoomJoined(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid, user, authLoading, shouldConnect])

  return {
    socket: socketRef.current,
    players,
    started,
    isHost,
    gameState,
    gameEnded,
    systemMessages,
    isConnecting: isConnectingRef.current,
    roomJoined,
    onDiceRolled: diceRolledTrigger > 0 ? () => setDiceRolledTrigger(0) : null,
    turnTimeLeft,
  }
}

