'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/Providers'

export default function LoginPage() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    setLoading(false)
    
    if (error) {
      setMessage(`❌ ${error.message}`)
    } else if (data.session) {
      console.log('🔑 Connexion réussie - Token reçu:', {
        accessToken: data.session.access_token.substring(0, 20) + '...',
        expiresIn: data.session.expires_in,
        refreshToken: data.session.refresh_token ? '✅' : '❌'
      })
      setMessage('✅ Connexion réussie ! Redirection...')
      setTimeout(() => router.push('/dashboard'), 500)
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
          Pas encore de compte ?{' '}
          <a href="/register" className="link link-primary">
            Inscris-toi
          </a>
        </p>
      </form>
    </div>
  )
}
