/**
 * Gestionnaires d'événements Socket.IO pour le jeu en cours
 * Gère roll_dice, toggle_die_lock, choose_score, abandon_game, rematch
 */

import { Server, Socket } from 'socket.io'
import { SupabaseClient } from '@supabase/supabase-js'
import { rollDice, toggleDieLock, chooseScore, removePlayer, getGame } from './gameManager'
import { ScoreCategory } from '../types/game'
import { updateUserStats, countYamsInScoreSheet } from '../lib/userStats'
import { getCategoryLabel } from '../lib/categoryLabels'

/**
 * Configure les gestionnaires d'événements pour le jeu
 */
export function setupGameHandlers(
  io: Server,
  socket: Socket,
  roomStates: Map<string, { started: boolean }>,
  supabase: SupabaseClient
) {
  /**
   * Lancer les dés
   */
  socket.on('roll_dice', (roomId: string) => {
    const gameState = rollDice(roomId)
    if (gameState) {
      // Signaler à tous les joueurs qu'un lancer a eu lieu (pour l'animation)
      io.to(roomId).emit('dice_rolled')
      
      io.to(roomId).emit('game_update', gameState)
    }
  })

  /**
   * Verrouiller/déverrouiller un dé
   */
  socket.on(
    'toggle_die_lock',
    ({ roomId, dieIndex }: { roomId: string; dieIndex: number }) => {
      const gameState = toggleDieLock(roomId, dieIndex)
      if (gameState) {
        io.to(roomId).emit('game_update', gameState)
      }
    }
  )

  /**
   * Choisir une catégorie de score
   */
  socket.on('choose_score', ({ roomId, category }: { roomId: string; category: ScoreCategory }) => {
    const playerId = socket.id
    
    // Capturer l'état AVANT pour détecter le changement de tour
    const gameBeforeChoice = getGame(roomId)
    if (!gameBeforeChoice) return
    
    const oldTurnNumber = gameBeforeChoice.turnNumber
    const playerBefore = gameBeforeChoice.players.find(p => p.id === playerId)
    if (!playerBefore) return
    
    const gameState = chooseScore(roomId, playerId, category)

    if (gameState) {
      // Récupérer le joueur APRÈS l'appel à chooseScore pour avoir le score calculé
      const playerAfter = gameState.players.find(p => p.id === playerId)
      if (!playerAfter) return
      
      const scoreObtained = playerAfter.scoreSheet[category]
      const categoryLabel = getCategoryLabel(category)
      
      // Message : score du joueur
      if (scoreObtained !== null && scoreObtained !== undefined) {
        io.to(roomId).emit('system_message', 
          `${playerAfter.name} a marqué ${scoreObtained} point${scoreObtained > 1 ? 's' : ''} en ${categoryLabel}`)
      }
      
      io.to(roomId).emit('game_update', gameState)

      if (gameState.gameStatus === 'finished') {
        // Formater les scores des joueurs pour les enregistrer
        const playersScores = gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          user_id: p.userId,
          score: p.totalScore,
          abandoned: p.abandoned,
        }))

        // Mettre à jour la base de données
        supabase
          .from('games')
          .update({
            status: 'finished',
            winner: gameState.winner,
            players_scores: playersScores,
          })
          .eq('id', roomId)
          .then(({ error }) => {
            if (error) {
              console.error('[GAME] Erreur mise à jour de la partie:', error)
            }
          })

        io.to(roomId).emit('game_ended', {
          winner: gameState.winner,
          reason: 'completed',
          message: `${gameState.winner} remporte la partie !`,
        })
      } else {
        // Vérifier si on a changé de tour
        const newTurnNumber = gameState.turnNumber
        if (newTurnNumber > oldTurnNumber) {
          io.to(roomId).emit('system_message', `🎯 Début du tour ${newTurnNumber}`)
        }
        
        const currentPlayer = gameState.players[gameState.currentPlayerIndex]
        io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
      }
    }
  })

  /**
   * Abandonner une partie en cours
   */
  socket.on('abandon_game', async (roomId: string) => {
    const playerName = socket.data.playerName || 'Un joueur'
    const userId = socket.data.userId
    const roomState = roomStates.get(roomId)

    if (!roomState || !roomState.started) {
      return
    }

    // Marquer qu'il s'agit d'un abandon volontaire pour éviter le délai de grâce
    socket.data.voluntaryAbandon = true

    // Récupérer le gameState AVANT de retirer le joueur pour sauvegarder ses stats
    const gameBeforeRemoval = getGame(roomId)

    if (gameBeforeRemoval && userId) {
      // Trouver le joueur qui abandonne
      const abandoningPlayer = gameBeforeRemoval.players.find((p) => p.id === socket.id)

      if (abandoningPlayer) {
        // Compter les Yams réalisés
        const yamsCount = countYamsInScoreSheet(abandoningPlayer.scoreSheet)

        // Enregistrer les statistiques d'abandon
        const result = await updateUserStats(supabase, {
          user_id: userId,
          score: abandoningPlayer.totalScore,
          won: false,
          abandoned: true,
          yams_count: yamsCount,
        })

        if (!result.success) {
          console.error(`[STATS] Erreur sauvegarde stats d'abandon:`, result.error)
        }
      }
    }

    // Retirer le joueur du gameState
    const updatedGame = removePlayer(roomId, socket.id)

    // Quitter la room socket
    socket.leave(roomId)

    io.to(roomId).emit('system_message', `${playerName} a abandonné la partie`)

    if (!updatedGame) {
      // Plus de joueurs, partie annulée
      roomStates.delete(roomId)
    } else if (updatedGame.gameStatus === 'finished') {
      // Formater les scores des joueurs pour les enregistrer
      const playersScores = updatedGame.players.map((p) => ({
        id: p.id,
        name: p.name,
        user_id: p.userId,
        score: p.totalScore,
        abandoned: p.abandoned,
      }))

      // Mettre à jour la base de données
      supabase
        .from('games')
        .update({
          status: 'finished',
          winner: updatedGame.winner,
          players_scores: playersScores,
        })
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) {
            console.error('[GAME] Erreur mise à jour de la partie:', error)
          }
        })

      io.to(roomId).emit('game_update', updatedGame)
      io.to(roomId).emit('game_ended', {
        winner: updatedGame.winner,
        reason: 'abandon',
        message: `${updatedGame.winner} remporte la partie par abandon !`,
      })
      roomStates.delete(roomId)
    } else {
      // Compter les joueurs actifs (non-abandonnés)
      const activePlayers = updatedGame.players.filter(p => !p.abandoned)
      const activePlayersCount = activePlayers.length
      
      // Envoyer le gameState mis à jour
      io.to(roomId).emit('game_update', updatedGame)
      io.to(roomId).emit(
        'system_message',
        `La partie continue avec ${activePlayersCount} joueur${activePlayersCount > 1 ? 's' : ''}`
      )

      const currentPlayer = updatedGame.players[updatedGame.currentPlayerIndex]
      io.to(roomId).emit('system_message', `C'est au tour de ${currentPlayer.name}`)
    }
  })

  /**
   * Gestion de la création d'une nouvelle partie (rematch)
   */
  socket.on(
    'rematch_created',
    ({
      oldRoomId,
      newRoomId,
      hostName,
    }: {
      oldRoomId: string
      newRoomId: string
      hostName: string
    }) => {
      // Notifier tous les joueurs de l'ancienne room qu'une nouvelle partie est disponible
      socket.to(oldRoomId).emit('rematch_available', {
        newRoomId,
        hostName,
      })
    }
  )
}

