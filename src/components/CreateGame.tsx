'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { generateGameId } from '@/lib/gameIdGenerator'
import { useState } from 'react'
import { GameVariant } from '@/types/game'
import { VARIANT_NAMES, VARIANT_DESCRIPTIONS } from '@/lib/variantLogic'
import PlusIcon from './icons/PlusIcon'
import { api } from '@/lib/apiClient'
import { useFlashMessage } from '@/contexts/FlashMessageContext'

export default function CreateGame() {
  const router = useRouter()
  const { user } = useSupabase()
  const { showAchievement } = useFlashMessage()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<GameVariant>('classic')

  const handleCreate = async () => {
    console.log('[CREATE] 1. Début de la création')
    console.log('[CREATE] 2. User:', user?.id)
    console.log('[CREATE] Variante choisie:', selectedVariant)
    
    if (!user) {
      console.log('[CREATE] ❌ Pas d\'utilisateur, redirection vers login')
      return router.push('/login')
    }

    // Activer le loading IMMÉDIATEMENT
    setLoading(true)
    console.log('[CREATE] 3. Loading activé')
    
    // Petit délai pour garantir que React affiche le loading avant l'opération async
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const id = generateGameId()
    console.log('[CREATE] 4. ID généré:', id)

    try {
      console.log('[CREATE] 5. Appel API /api/games...')
      const { data, error } = await api.post<{ game: { id: string } }>('/api/games', {
        id,
        variant: selectedVariant,
      })

      console.log('[CREATE] 6. Réponse API /api/games:', { error, data })

      if (error) {
        console.error('[CREATE] ❌ Erreur API:', error)
        setLoading(false)
        console.log('[CREATE] 7. Loading désactivé')
        alert(`Erreur lors de la création de la partie: ${error || 'Erreur inconnue'}`)
      } else {
        // Débloquer les succès d'action liés à la création de partie
        try {
          const res = await fetch('/api/achievements/unlock', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ achievementId: 'create_game' }),
          })

          if (res.ok) {
            const json = await res.json().catch(() => null)
            if (json?.achievement) {
              showAchievement(json.achievement)
            }
          }

          // Si la partie créée est privée, débloquer aussi create_private_game
          // L'information de confidentialité sera ajoutée plus tard. (friend system)
          // Pour l'instant, on ne débloque que create_game.
        } catch (unlockError) {
          console.warn('[CREATE] Impossible de débloquer le succès create_game:', unlockError)
        }

        console.log('[CREATE] ✅ Partie créée! Redirection...')
        setShowModal(false)
        await new Promise(resolve => setTimeout(resolve, 200))
        router.push(`/game/${id}`)
      }
    } catch (err) {
      console.error('[CREATE] ❌ Exception:', err)
      setLoading(false)
      alert('Erreur inattendue lors de la création de la partie')
    }
  }

  const openModal = () => {
    if (!user) {
      return router.push('/login')
    }
    setShowModal(true)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="btn btn-primary"
      >
        <PlusIcon className="w-4 h-4" />
        <span>Nouvelle partie</span>
      </button>

      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box card-bordered max-w-2xl">
            <h3 className="font-bold text-2xl mb-6">Choisir une variante</h3>
            
            <div className="space-y-4">
              {/* Variante Classique */}
              <div
                onClick={() => setSelectedVariant('classic')}
                className={`card glass cursor-pointer transition-all ${
                  selectedVariant === 'classic' 
                    ? 'bg-primary text-primary-content shadow-lg' 
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant"
                      className="radio"
                      checked={selectedVariant === 'classic'}
                      onChange={() => setSelectedVariant('classic')}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{VARIANT_NAMES.classic}</h4>
                      <p className={selectedVariant === 'classic' ? 'opacity-90' : 'text-base-content/70'}>
                        {VARIANT_DESCRIPTIONS.classic}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variante Descendante */}
              <div
                onClick={() => setSelectedVariant('descending')}
                className={`card glass cursor-pointer transition-all ${
                  selectedVariant === 'descending' 
                    ? 'bg-primary text-primary-content shadow-lg' 
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant"
                      className="radio"
                      checked={selectedVariant === 'descending'}
                      onChange={() => setSelectedVariant('descending')}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{VARIANT_NAMES.descending}</h4>
                      <p className={selectedVariant === 'descending' ? 'opacity-90' : 'text-base-content/70'}>
                        {VARIANT_DESCRIPTIONS.descending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variante Montante */}
              <div
                onClick={() => setSelectedVariant('ascending')}
                className={`card glass cursor-pointer transition-all ${
                  selectedVariant === 'ascending' 
                    ? 'bg-primary text-primary-content shadow-lg' 
                    : 'bg-base-200 hover:bg-base-300'
                }`}
              >
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant"
                      className="radio"
                      checked={selectedVariant === 'ascending'}
                      onChange={() => setSelectedVariant('ascending')}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">{VARIANT_NAMES.ascending}</h4>
                      <p className={selectedVariant === 'ascending' ? 'opacity-90' : 'text-base-content/70'}>
                        {VARIANT_DESCRIPTIONS.ascending}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowModal(false)}
                className="btn"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer la partie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

