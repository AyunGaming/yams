'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'
import { v4 as uuidv4 } from 'uuid'
import { useState } from 'react'

export default function CreateGame() {
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!user) return router.push('/login')

    setLoading(true)
    const id = uuidv4()

    const { error } = await supabase.from('games').insert([
      {
        id,
        status: 'waiting',
        owner: user.id,
        created_at: new Date().toISOString(),
      },
    ])

    setLoading(false)

    if (error) {
      console.error(error)
      alert("Erreur lors de la création de la partie.")
    } else {
      router.push(`/game/${id}`)
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

