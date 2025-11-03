'use client'

import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useParams, useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'

type Player = { id: string; name: string }

export default function GamePage() {
  const params = useParams()
  const uuid = params?.uuid as string
  const router = useRouter()
  const { user, supabase } = useSupabase()

  const [players, setPlayers] = useState<Player[]>([])
  const [started, setStarted] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const isConnectingRef = useRef(false)

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

      newSocket.on('room_update', (room: { players: Player[]; started: boolean }) => {
        setPlayers(room.players)
        setStarted(room.started)
        const amIHost = room.players[0]?.id === newSocket.id
        setIsHost(amIHost)
      })

      newSocket.on('game_started', () => {
        setStarted(true)
        console.log('🎮 Partie démarrée!')
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

  // affichage
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4">
        <h1 className="text-3xl font-bold">Salle d’attente 🎮</h1>
        <p className="text-base-content/70">Code de la partie : <code>{uuid}</code></p>

        <ul className="bg-base-200 p-4 rounded w-full max-w-md space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.name}</span>
              {p.id === players[0]?.id && <span className="badge badge-primary">Hôte</span>}
            </li>
          ))}
        </ul>

        <p className="text-sm text-base-content/70">
          {players.length < 2
            ? 'En attente d’un deuxième joueur...'
            : 'Deux joueurs présents, prêt à démarrer !'}
        </p>

        {isHost && players.length >= 2 && (
          <button onClick={handleStart} className="btn btn-success">
            🚀 Démarrer la partie
          </button>
        )}
      </div>
    )
  }

  // affichage quand la partie démarre
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <h1 className="text-3xl font-bold mb-4">🎲 Partie en cours #{uuid}</h1>
      <p>Joueurs : {players.map((p) => p.name).join(', ')}</p>
      <button
        onClick={() => router.push('/dashboard')}
        className="btn btn-outline mt-6"
      >
        Quitter
      </button>
    </div>
  )
}
