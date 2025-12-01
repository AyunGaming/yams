'use client'

import { useEffect, useState } from 'react'
import { tokenManager } from '@/lib/tokenManager'

export default function TokenStatus() {
  const [hasToken, setHasToken] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const checkToken = () => {
      const token = tokenManager.getToken()
      setHasToken(!!token)
      setIsExpired(token ? tokenManager.isTokenExpired() : true)
    }

    checkToken()
    const intervalId = setInterval(checkToken, 1000)

    return () => clearInterval(intervalId)
  }, [])

  if (!hasToken) return null

  return (
    <div className="alert alert-info shadow-lg">
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔑</span>
            <span className="font-semibold">Statut d&apos;authentification</span>
          </div>
          <div className={`badge ${isExpired ? 'badge-error' : 'badge-success'}`}>
            {isExpired ? '❌ Expiré' : '✅ Actif'}
          </div>
        </div>
        
        <div className="text-sm opacity-80">
          <p className="font-mono text-xs break-all">Token d’authentification actif.</p>
          <p className="mt-1">
            Votre session est sécurisée par un token JWT qui se rafraîchit automatiquement.
          </p>
        </div>
      </div>
    </div>
  )
}
