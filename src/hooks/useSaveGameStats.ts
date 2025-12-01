/**
 * Hook pour sauvegarder les statistiques de jeu à la fin d'une partie
 * Évite les doubles sauvegardes
 */

import { useEffect, useRef } from 'react'
import { GameState } from '@/types/game'
import { countYamsInScoreSheet } from '@/lib/userStats'
import { logger } from '@/lib/logger'

interface MinimalUser {
  id: string
}

interface UseSaveGameStatsParams {
  gameState: GameState
  mySocketId: string | undefined
  user: MinimalUser | null
  isWinner: boolean
  refreshUserProfile: () => Promise<void>
}

/**
 * Hook pour sauvegarder les statistiques à la fin de la partie
 */
export function useSaveGameStats({
  gameState,
  mySocketId,
  user,
  isWinner,
  refreshUserProfile,
}: UseSaveGameStatsParams) {
  const statsUpdatedRef = useRef(false)

  useEffect(() => {
    // Vérifier que nous avons les données nécessaires
    if (!user || !mySocketId) return

    const myPlayer = gameState.players.find((p) => p.id === mySocketId)
    if (!myPlayer) return

    // Générer une clé unique pour cette partie
    const statsKey = `stats_saved_${gameState.roomId}_${user.id}`

    // Vérifier si les stats ont déjà été sauvegardées
    if (statsUpdatedRef.current || localStorage.getItem(statsKey)) {
      logger.debug('Statistiques déjà sauvegardées pour cette partie')
      return
    }

    // Marquer immédiatement comme en cours
    statsUpdatedRef.current = true
    localStorage.setItem(statsKey, 'true')

    /**
     * Sauvegarde les statistiques du joueur
     */
    const saveStats = async () => {
      try {
        logger.info('Sauvegarde des statistiques de la partie')

        // Compter le nombre de Yams réalisés
        const yamsCount = countYamsInScoreSheet(myPlayer.scoreSheet)

        // Calculer l'XP gagné
        // XP = score de la partie / 10
        // +25 XP si le joueur gagne
        let xpGained = Math.floor(myPlayer.totalScore / 10)
        if (isWinner) {
          xpGained += 25
        }

        const res = await fetch('/api/stats/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            score: myPlayer.totalScore,
            won: isWinner,
            abandoned: myPlayer.abandoned,
            yams_count: yamsCount,
            xp_gained: xpGained,
          }),
        })

        const data = await res.json()

        if (res.ok && data.success) {
          logger.success('Statistiques sauvegardées avec succès')
          // Rafraîchir le profil pour afficher les nouvelles stats
          await refreshUserProfile()
        } else {
          logger.error('Erreur lors de la sauvegarde des stats:', data.error)
          // En cas d'erreur, réinitialiser
          statsUpdatedRef.current = false
          localStorage.removeItem(statsKey)
        }
      } catch (error) {
        logger.error('Erreur lors de la sauvegarde des stats:', error)
        // En cas d'erreur, réinitialiser
        statsUpdatedRef.current = false
        localStorage.removeItem(statsKey)
      }
    }

    saveStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, mySocketId, user, isWinner])
}

