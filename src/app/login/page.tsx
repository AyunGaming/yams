'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tokenManager } from '@/lib/tokenManager'
import { useSupabase } from '@/components/Providers'

export default function LoginPage() {
  const router = useRouter()
  const { refreshUserProfile } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const confirm = params.get('confirm')

    if (confirm === 'success') {
      setMessage('✅ Email confirmé. Tu peux maintenant te connecter.')
    } else if (confirm === 'error') {
      setMessage(
        '❌ Erreur lors de la confirmation de ton email. Le lien est peut-être expiré.'
      )
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        setMessage(`❌ ${data.error || 'Erreur lors de la connexion.'}`)
        return
      }

      if (data.token && data.expiresIn) {
        tokenManager.setToken(data.token, data.expiresIn)
      }

      // Rafraîchir le contexte d'authentification (Navbar, dashboard, etc.)
      await refreshUserProfile()

      setMessage('✅ Connexion réussie ! Redirection...')
      setTimeout(() => router.push('/dashboard'), 500)
    } catch (error) {
      console.error('Erreur connexion:', error)
      setLoading(false)
      setMessage('❌ Erreur inattendue lors de la connexion.')
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <form
        onSubmit={handleSubmit}
        className="bg-base-200 p-8 rounded-lg shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">Connexion</h1>

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="input input-bordered w-full"
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Mot de passe"
          className="input input-bordered w-full"
          onChange={handleChange}
        />

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        {message && (
          <p className="text-center text-sm text-base-content/80">{message}</p>
        )}

        <p className="text-center text-sm mt-3">
          <a href="/reset-password" className="link link-primary">
            Mot de passe oublié ?
          </a>
        </p>

        <p className="text-center text-sm mt-1">
          Pas encore de compte ?{' '}
          <a href="/register" className="link link-primary">
            Inscris-toi
          </a>
        </p>
      </form>
    </div>
  )
}
