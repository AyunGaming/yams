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
import { startTurnTimerWithCallbacks } from './timerUtils'
import { updateFinishedGame } from './gameDbUtils'

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
    const playerId = socket.id
    const gameBeforeRoll = getGame(roomId)
    if (!gameBeforeRoll) return
    
    // Vérifier que c'est bien le tour du joueur avant de traiter
    const currentPlayer = gameBeforeRoll.players[gameBeforeRoll.currentPlayerIndex]
    if (currentPlayer.id !== playerId) {
      console.warn(`[GAME] ${playerId} a tenté de lancer les dés alors que c'est le tour de ${currentPlayer.id}`)
      return
    }
    
    const gameState = rollDice(roomId, playerId)
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
      const playerId = socket.id
      const gameBeforeToggle = getGame(roomId)
      if (!gameBeforeToggle) return
      
      // Vérifier que c'est bien le tour du joueur avant de traiter
      const currentPlayer = gameBeforeToggle.players[gameBeforeToggle.currentPlayerIndex]
      if (currentPlayer.id !== playerId) {
        console.warn(`[GAME] ${playerId} a tenté de verrouiller un dé alors que c'est le tour de ${currentPlayer.id}`)
        return
      }
      
      const gameState = toggleDieLock(roomId, playerId, dieIndex)
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
        // Mettre à jour la base de données
        updateFinishedGame(supabase, roomId, gameState)

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
        
        // Démarrer le timer pour le nouveau tour
        startTurnTimerWithCallbacks(io, roomId)
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
    
    // Vérifier si c'était le tour du joueur qui abandonne
    let wasCurrentPlayer = false

    if (gameBeforeRemoval && userId) {
      // Trouver le joueur qui abandonne
      const abandoningPlayer = gameBeforeRemoval.players.find((p) => p.id === socket.id)
      
      // Vérifier si c'était son tour
      if (abandoningPlayer) {
        const playerIndex = gameBeforeRemoval.players.findIndex((p) => p.id === socket.id)
        wasCurrentPlayer = (playerIndex === gameBeforeRemoval.currentPlayerIndex)
        
        // Compter les Yams réalisés
        const yamsCount = countYamsInScoreSheet(abandoningPlayer.scoreSheet)

        // En cas d'abandon, le joueur ne gagne pas d'XP
        const xpGained = 0

        // Enregistrer les statistiques d'abandon
        const result = await updateUserStats(supabase, {
          user_id: userId,
          score: abandoningPlayer.totalScore,
          won: false,
          abandoned: true,
          yams_count: yamsCount,
          xp_gained: xpGained,
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
      // Mettre à jour la base de données
      updateFinishedGame(supabase, roomId, updatedGame)

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
      
      // Redémarrer le timer uniquement si c'était le tour du joueur qui abandonne
      // (le timer a été nettoyé dans removePlayer dans ce cas)
      if (wasCurrentPlayer) {
        startTurnTimerWithCallbacks(io, roomId)
      }
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

  /**
   * Gestion du départ de l'hôte d'une partie terminée
   * Redirige automatiquement tous les autres joueurs vers le dashboard
   */
  socket.on('host_leaving_finished_game', (roomId: string) => {
    console.log('[GAME] Hôte quitte la partie terminée:', roomId)
    
    // Notifier tous les autres joueurs de retourner au dashboard
    socket.to(roomId).emit('host_left_finished_game', {
      message: 'L\'hôte a quitté la partie. Redirection vers le dashboard...'
    })
  })
}

