/**
 * Générateur d'identifiants courts pour les parties
 */

/**
 * Génère un identifiant de partie court et lisible
 * Format: 8 caractères alphanumériques en majuscules
 * Exemple: "AB3K9XY2"
 */
export function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // On évite les lettres/chiffres ambigus (I, O, 0, 1)
  let id = ''
  
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return id
}

