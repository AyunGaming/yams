'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinGame() {
  const router = useRouter()
  const [gameId, setGameId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleJoin = async () => {
    if (!gameId.trim()) {
      alert('Veuillez entrer un code de partie valide.')
      return
    }

    setLoading(true)
    // On redirige simplement vers la page de jeu
    // Le composant de la page vérifiera si la partie existe
    router.push(`/game/${gameId.trim()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        placeholder="Entrer le code de la partie"
        className="input input-bordered w-full max-w-xs"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
      />
      <button
        onClick={handleJoin}
        className="btn btn-secondary"
        disabled={loading || !gameId.trim()}
      >
        {loading ? 'Connexion...' : '🚪 Rejoindre'}
      </button>
    </div>
  )
}

