'use client'

import { useState } from 'react'
import { useSupabase } from '@/components/Providers'

export default function RegisterForm() {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    setLoading(false)

    if (error) return setMessage(error.message)
    if (data?.user) {
      setMessage('✅ Vérifie ton email pour confirmer ton inscription.')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-base-200 p-8 rounded-lg shadow-md w-full max-w-md space-y-4"
    >
      <h1 className="text-2xl font-bold text-center">Inscription</h1>

      <input
        name="username"
        placeholder="Nom d'utilisateur"
        className="input input-bordered w-full"
        onChange={handleChange}
      />
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
        {loading ? 'Création...' : "S'inscrire"}
      </button>

      {message && (
        <p className="text-center text-sm text-base-content/80">{message}</p>
      )}

      <p className="text-center text-sm mt-3">
        Déjà un compte ?{' '}
        <a href="/login" className="link link-primary">
          Connecte-toi
        </a>
      </p>
    </form>
  )
}
