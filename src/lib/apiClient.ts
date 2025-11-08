/**
 * Client API avec gestion automatique des tokens
 */
"use client";

import { tokenManager } from './tokenManager'
import { createClient } from './supabase/browser'
import { logger } from './logger'

/**
 * Régénère automatiquement le token depuis Supabase
 */
async function refreshTokenFromSupabase(): Promise<string | null> {
  try {
    logger.debug('Tentative de régénération du token depuis Supabase')
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.access_token) {
      logger.error('Impossible de régénérer le token:', error)
      return null
    }
    
    // Mettre à jour les tokens dans le storage local
    tokenManager.setToken(session.access_token, session.expires_in ?? 3600)
    if (session.refresh_token) {
      tokenManager.setRefreshToken(session.refresh_token)
    }
    
    logger.success('Token régénéré avec succès')
    return session.access_token
  } catch (error) {
    logger.error('Erreur lors de la régénération du token:', error)
    return null
  }
}

/**
 * Effectue une requête API avec le token d'authentification
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Si le token est invalide ou expiré, essayer de le régénérer
    if (!tokenManager.isTokenValid()) {
      logger.warn('Token invalide ou expiré, tentative de régénération')
      const newToken = await refreshTokenFromSupabase()
      
      if (!newToken) {
        return {
          data: null,
          error: 'Session expirée. Veuillez vous reconnecter.',
        }
      }
    }

    // Ajoute les headers d'authentification
    const headers = {
      ...tokenManager.getAuthHeaders(),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Erreur API:', response.status, errorText)
      
      // Si 401, essayer une dernière fois de régénérer le token
      if (response.status === 401) {
        logger.warn('Erreur 401, tentative de régénération du token')
        const newToken = await refreshTokenFromSupabase()
        
        if (!newToken) {
          tokenManager.clearTokens()
          return {
            data: null,
            error: 'Session expirée. Veuillez vous reconnecter.',
          }
        }
        
        // Retenter la requête avec le nouveau token
        logger.debug('Nouvelle tentative avec le token régénéré')
        const retryHeaders = {
          ...tokenManager.getAuthHeaders(),
          ...options.headers,
        }
        
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        })
        
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text()
          return {
            data: null,
            error: `Erreur ${retryResponse.status}: ${retryErrorText}`,
          }
        }
        
        const retryData = await retryResponse.json()
        return { data: retryData, error: null }
      }

      return {
        data: null,
        error: `Erreur ${response.status}: ${errorText}`,
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    logger.error('Erreur lors de la requête:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Raccourcis pour les méthodes HTTP courantes
 */
export const api = {
  get: <T = unknown>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),

  patch: <T = unknown>(url: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
}
