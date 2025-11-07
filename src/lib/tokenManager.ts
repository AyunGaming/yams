/**
 * Gestionnaire de tokens JWT pour l'authentification
 */

const TOKEN_KEY = 'yams_access_token'
const REFRESH_TOKEN_KEY = 'yams_refresh_token'
const TOKEN_EXPIRY_KEY = 'yams_token_expiry'

export const tokenManager = {
  /**
   * Stocke le token d'accès et sa date d'expiration
   */
  setToken(accessToken: string, expiresIn: number) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(TOKEN_KEY, accessToken)
      const expiryTime = Date.now() + expiresIn * 1000
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString())
    } catch (error) {
      console.error('Erreur lors du stockage du token:', error)
    }
  },

  /**
   * Stocke le refresh token
   */
  setRefreshToken(refreshToken: string) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } catch (error) {
      console.error('❌ Erreur lors du stockage du refresh token:', error)
    }
  },

  /**
   * Récupère le token d'accès
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du token:', error)
      return null
    }
  },

  /**
   * Récupère le refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du refresh token:', error)
      return null
    }
  },

  /**
   * Vérifie si le token est expiré
   */
  isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true
    
    try {
      const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY)
      if (!expiryTime) return true
      
      return Date.now() >= parseInt(expiryTime)
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du token:', error)
      return true
    }
  },

  /**
   * Vérifie si le token est valide
   */
  isTokenValid(): boolean {
    const token = this.getToken()
    return token !== null && !this.isTokenExpired()
  },

  /**
   * Supprime tous les tokens
   */
  clearTokens() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
    } catch (error) {
      console.error('Erreur lors de la suppression des tokens:', error)
    }
  },

  /**
   * Récupère les headers d'authentification avec le token
   */
  getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    if (!token) return {}
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  },
}
