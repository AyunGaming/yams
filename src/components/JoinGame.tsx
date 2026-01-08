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

    // Activer le loading IMMÉDIATEMENT
    setLoading(true)
    
    // Petit délai pour garantir que React affiche le loading avant la redirection
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const trimmedId = gameId.trim()

    // On redirige simplement vers la page de jeu
    // La page de jeu centralise désormais le succès "join_game"
    router.push(`/game/${trimmedId}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoin()
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        setGameId(text.trim())
      }
    } catch (error) {
      console.error('Erreur lors de la lecture du presse-papier:', error)
      // Fallback: essayer de coller depuis un input temporaire
      const tempInput = document.createElement('input')
      tempInput.style.position = 'fixed'
      tempInput.style.opacity = '0'
      document.body.appendChild(tempInput)
      tempInput.focus()
      document.execCommand('paste')
      const pastedText = tempInput.value
      document.body.removeChild(tempInput)
      if (pastedText && pastedText.trim()) {
        setGameId(pastedText.trim())
      }
    }
  }

  return (
    <div className="flex items-center gap-0 w-full max-w-md">
      <button
        type="button"
        className="input input-bordered rounded-r-none w-10 px-0 flex items-center justify-center cursor-pointer hover:bg-base-200 transition-colors input-no-focus"
        onClick={handlePaste}
        disabled={loading}
        title="Coller le code de la partie"
      >
        📋
      </button>
      <input
        type="text"
        placeholder="Entrer le code de la partie"
        className="input input-bordered flex-1 rounded-none border-r-0 input-no-focus"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={loading}
      />
      <button
        onClick={handleJoin}
        className="btn btn-secondary whitespace-nowrap rounded-l-none"
        disabled={loading || !gameId.trim()}
        title="Rejoindre la partie"
      >
        {loading ? (
          'Connexion...'
        ) : (
          <>
            <span className="max-[425px]:hidden">🚪 Rejoindre</span>
            <span className="min-[426px]:hidden">→</span>
          </>
        )}
      </button>
    </div>
  )
}

