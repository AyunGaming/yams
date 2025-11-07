'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { generateGameId } from '@/lib/gameIdGenerator'
import { useState } from 'react'

export default function CreateGame() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    console.log('[CREATE] 1. Début de la création')
    console.log('[CREATE] 2. User:', user?.id)
    
    if (!user) {
      console.log('[CREATE] ❌ Pas d\'utilisateur, redirection vers login')
      return router.push('/login')
    }

    setLoading(true)
    console.log('[CREATE] 3. Loading activé')
    
    const id = generateGameId()
    console.log('[CREATE] 4. ID généré:', id)

    try {
      console.log('[CREATE] 5. Tentative d\'insertion dans Supabase...')
      const { data, error } = await supabase.from('games').insert([
        {
          id,
          status: 'waiting',
          owner: user.id,
          created_at: new Date().toISOString(),
        },
      ]).select()

      console.log('[CREATE] 6. Réponse Supabase:', { data, error })

      setLoading(false)
      console.log('[CREATE] 7. Loading désactivé')

      if (error) {
        console.error('[CREATE] ❌ Erreur:', error)
        alert(`Erreur lors de la création de la partie: ${error.message}`)
      } else {
        console.log('[CREATE] ✅ Partie créée! Redirection...')
        router.push(`/game/${id}`)
      }
    } catch (err) {
      console.error('[CREATE] ❌ Exception:', err)
      setLoading(false)
      alert('Erreur inattendue lors de la création de la partie')
    }
  }

  return (
    <button
      onClick={handleCreate}
      className="btn btn-primary"
      disabled={loading}
    >
      {loading ? 'Création...' : '➕ Nouvelle partie'}
    </button>
  )
}

