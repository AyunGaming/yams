/**
 * Hook pour vérifier et débloquer les achievements à la fin d'une partie
 */

import { useEffect, useRef } from 'react'
import { useSupabase } from '@/components/Providers'
import { useFlashMessage } from '@/contexts/FlashMessageContext'
import { checkAndUnlockAchievements } from '@/lib/achievements'
import { GameState } from '@/types/game'
import { countYamsInScoreSheet } from '@/lib/userStats'
import { logger } from '@/lib/logger'
import { UserProfile } from '@/types/user'

interface UseCheckAchievementsParams {
  gameState: GameState
  mySocketId: string | undefined
  userProfile: UserProfile | null
  isWinner: boolean
}

export function useCheckAchievements({
  gameState,
  mySocketId,
  userProfile,
  isWinner,
}: UseCheckAchievementsParams) {
  const { supabase } = useSupabase()
  const { showAchievement } = useFlashMessage()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!userProfile || !mySocketId || checkedRef.current) return

    const myPlayer = gameState.players.find((p) => p.id === mySocketId)
    if (!myPlayer) return

    const checkAchievements = async () => {
      checkedRef.current = true

      try {
        const yamsCount = countYamsInScoreSheet(myPlayer.scoreSheet)

        // Détecter les Yams par valeur (1 à 6) à partir de la feuille de score.
        // Hypothèse simple : un score exactement égal à 5 * valeur dans la
        // section supérieure signifie que le joueur a réalisé un Yams de cette valeur
        // et l'a compté dans cette case.
        const yamsByFace = {
          1: myPlayer.scoreSheet.ones === 5 ? 1 : 0,
          2: myPlayer.scoreSheet.twos === 10 ? 1 : 0,
          3: myPlayer.scoreSheet.threes === 15 ? 1 : 0,
          4: myPlayer.scoreSheet.fours === 20 ? 1 : 0,
          5: myPlayer.scoreSheet.fives === 25 ? 1 : 0,
          6: myPlayer.scoreSheet.sixes === 30 ? 1 : 0,
        } as const

        const hasBonus =
          (myPlayer.scoreSheet.ones || 0) +
            (myPlayer.scoreSheet.twos || 0) +
            (myPlayer.scoreSheet.threes || 0) +
            (myPlayer.scoreSheet.fours || 0) +
            (myPlayer.scoreSheet.fives || 0) +
            (myPlayer.scoreSheet.sixes || 0) >=
          63

        // Calculer les stats à jour en utilisant les données de la partie
        // Pour nombre_yams_realises, on utilise le total + ceux de cette partie
        // (on suppose que les stats ont été sauvegardées ou vont l'être)
        const nombreYamsRealises = userProfile.nombre_yams_realises + yamsCount
        const partiesGagnees = userProfile.parties_gagnees + (isWinner ? 1 : 0)
        const partiesJouees = userProfile.parties_jouees + 1
        const meilleurScore = Math.max(userProfile.meilleur_score, myPlayer.totalScore)

        // Série de victoires après cette partie, en suivant la logique SQL :
        // - si victoire: +1
        // - si abandon: on garde la série actuelle
        // - sinon (défaite): reset à 0
        const serieVictoiresApresPartie = isWinner
          ? userProfile.serie_victoires_actuelle + 1
          : myPlayer.abandoned
          ? userProfile.serie_victoires_actuelle
          : 0

        const context = {
          userProfile: {
            id: userProfile.id,
            nombre_yams_realises: nombreYamsRealises,
            parties_gagnees: partiesGagnees,
            meilleur_score: meilleurScore,
            serie_victoires_actuelle: serieVictoiresApresPartie,
            level: userProfile.level,
            parties_jouees: partiesJouees,
          },
          gameData: {
            score: myPlayer.totalScore,
            won: isWinner,
            yamsCount,
            yamsByFace,
            variant: gameState.variant,
            hasBonus,
          },
        }

        const unlocked = await checkAndUnlockAchievements(supabase, userProfile.id, context)

        // Afficher les achievements débloqués
        unlocked.forEach((achievement) => {
          logger.success(`Achievement débloqué: ${achievement.name}`)
          showAchievement(achievement)
        })
      } catch (error) {
        logger.error('Erreur lors de la vérification des achievements:', error)
      }
    }

    // Attendre un peu pour que les stats soient sauvegardées et le profil rafraîchi
    const timeout = setTimeout(checkAchievements, 2000)
    return () => clearTimeout(timeout)
  }, [gameState, mySocketId, userProfile, isWinner, supabase, showAchievement])
}

