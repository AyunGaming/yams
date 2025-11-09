/**
 * Composant principal du plateau de jeu
 * Affiche l'interface de jeu avec les dés, les scores et les joueurs
 */

import { useEffect, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { GameState, ScoreCategory } from '@/types/game'
import Dice from './Dice'
import PlayerScoreCards from './PlayerScoreCards'

interface GameBoardProps {
  uuid: string
  gameState: GameState
  socket: Socket
  systemMessages: string[]
  isRolling: boolean
  rollCount: number
  onRollDice: () => void
  onToggleDieLock: (dieIndex: number) => void
  onChooseScore: (category: ScoreCategory) => void
  onLeave: () => void
}

/**
 * Composant du plateau de jeu
 */
export default function GameBoard({
  uuid,
  gameState,
  socket,
  systemMessages,
  isRolling,
  rollCount,
  onRollDice,
  onToggleDieLock,
  onChooseScore,
  onLeave,
}: GameBoardProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const myTurn = currentPlayer.id === socket.id
  
  // Références pour détecter les changements de tour
  const previousMyTurnRef = useRef<boolean | null>(null)
  const isFirstRenderRef = useRef(true)
  const messagesRef = useRef<HTMLDivElement>(null)

  // Scroll automatique vers le haut quand un nouveau message arrive
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = 0
    }
  }, [systemMessages])

  // Scroll automatique quand c'est mon tour
  useEffect(() => {
    // Ignorer le premier rendu
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      previousMyTurnRef.current = myTurn
      return
    }

    // Détecter le passage de "pas mon tour" à "mon tour"
    const turnJustStarted = previousMyTurnRef.current === false && myTurn === true

    if (turnJustStarted) {
      // Scroll fluide vers le haut
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }

    // Mettre à jour la référence
    previousMyTurnRef.current = myTurn
  }, [myTurn])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barre supérieure sticky */}
      <div className="sticky top-0 z-10 bg-base-100 shadow-md border-b border-base-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Infos partie */}
            <div className="flex-1">
              <h1 className="text-lg md:text-xl font-bold">
                🎲 Yams - Tour {gameState.turnNumber}/13
              </h1>
              <p className="text-xs text-base-content/70">Partie #{uuid}</p>
            </div>

            {/* Info joueur actif */}
            <div className={`badge ${myTurn ? 'badge-info' : 'badge-warning'} badge-lg gap-2 hidden md:flex`}>
              {myTurn ? (
                <>
                  <span>🎯</span>
                  <span>Votre tour</span>
                </>
              ) : (
                <>
                  <span>⏳</span>
                  <span>{currentPlayer.name}</span>
                </>
              )}
            </div>

            {/* Bouton abandonner */}
            <button 
              onClick={onLeave} 
              className="btn btn-outline btn-error btn-sm gap-2"
            >
              <span>🏳️</span>
              <span className="hidden md:inline">Abandonner</span>
            </button>
          </div>

          {/* Info joueur actif mobile */}
          <div className="md:hidden mt-2">
            <div className={`badge ${myTurn ? 'badge-info' : 'badge-warning'} gap-2`}>
              {myTurn ? (
                <>
                  <span>🎯</span>
                  <span>C&apos;est votre tour !</span>
                </>
              ) : (
                <>
                  <span>⏳</span>
                  <span>Au tour de {currentPlayer.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 container mx-auto p-4 space-y-6">
        {/* Dés et actions (visible seulement pendant mon tour) */}
        {myTurn && (
          <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl max-w-3xl mx-auto">
            <div className="card-body items-center">
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between w-full mb-4">
                <h3 className="card-title">🎲 Vos dés</h3>
                <div className="badge badge-lg badge-primary gap-2">
                  <span className="font-bold">{gameState.rollsLeft}</span>
                  <span className="text-xs">
                    lancer{gameState.rollsLeft > 1 ? 's' : ''} restant{gameState.rollsLeft > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Dés */}
              <Dice
                dice={gameState.dice}
                onToggleLock={onToggleDieLock}
                canRoll={gameState.rollsLeft < 3 && gameState.rollsLeft > 0}
                isRolling={isRolling}
                rollCount={rollCount}
              />

              {/* Bouton lancer */}
              <button
                onClick={onRollDice}
                disabled={gameState.rollsLeft === 0 || isRolling}
                className="btn btn-primary btn-lg mt-4 gap-2"
              >
                {isRolling ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Lancer en cours...</span>
                  </>
                ) : gameState.rollsLeft === 3 ? (
                  <>
                    <span>🎲</span>
                    <span>Lancer les dés</span>
                  </>
                ) : (
                  <>
                    <span>🎲</span>
                    <span>Relancer</span>
                  </>
                )}
              </button>

              {/* Indications */}
              <div className="text-center mt-3">
                {gameState.rollsLeft === 3 ? (
                  <p className="text-sm text-base-content/70">
                    💡 Lancez les dés pour commencer votre tour
                  </p>
                ) : gameState.rollsLeft > 0 ? (
                  <p className="text-sm text-base-content/70">
                    💡 Cliquez sur les dés pour les verrouiller/déverrouiller
                  </p>
                ) : (
                  <p className="text-sm text-base-content/70">
                    💡 Choisissez une combinaison dans votre fiche de score
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messages système en haut des fiches */}
        {systemMessages.length > 0 && (
          <div className="card bg-info/10 border border-info/30 shadow-lg max-w-3xl mx-auto">
            <div className="card-body py-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">📢</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-2">Activité récente</p>
                  <div ref={messagesRef} className="space-y-1 max-h-20 overflow-y-auto scroll-smooth">
                    {systemMessages.slice(-4).reverse().map((msg, idx) => {
                      // Détecter les messages de connexion/déconnexion/abandon pour les griser
                      const isConnectionMessage = 
                        msg.includes('rejoint') || 
                        msg.includes('quitté') || 
                        msg.includes('déconnecté') || 
                        msg.includes('reconnecté') ||
                        msg.includes('abandonné')
                      
                      return (
                        <p 
                          key={idx} 
                          className={`text-xs py-1 border-b border-base-content/10 first:border-t-0 ${
                            isConnectionMessage 
                              ? 'text-base-content/40 italic' 
                              : 'text-base-content/80'
                          }`}
                        >
                          • {msg}
                        </p>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Grilles de score */}
        <PlayerScoreCards
          gameState={gameState}
          socket={socket}
          myTurn={myTurn}
          onChooseScore={onChooseScore}
        />
      </div>
    </div>
  )
}

