/**
 * Système de logging centralisé
 * Active/désactive les logs selon l'environnement
 */

const isDevelopment = process.env.NODE_ENV !== 'production'

export const logger = {
  /**
   * Log d'information (toujours affiché)
   */
  info: (...args: unknown[]) => {
    console.log('[INFO]', ...args)
  },

  /**
   * Log de débogage (seulement en développement)
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Log d'erreur (toujours affiché)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },

  /**
   * Log d'avertissement (toujours affiché)
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args)
  },

  /**
   * Log de succès (seulement en développement)
   */
  success: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[SUCCESS]', ...args)
    }
  },
}

