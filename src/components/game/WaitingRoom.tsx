/**
 * Composant de salle d'attente avant le début de la partie
 * Affiche les joueurs connectés, le code de la partie et les actions disponibles
 */

import { useState } from 'react'
import Image from 'next/image'

type Player = { id: string; name: string; avatar?: string }

interface WaitingRoomProps {
  uuid: string
  players: Player[]
  systemMessages: string[]
  isHost: boolean
  onStart: () => void
  onLeave: () => void
}

/**
 * Composant de salle d'attente
 */
export default function WaitingRoom({
  uuid,
  players,
  systemMessages,
  isHost,
  onStart,
  onLeave,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)

  /**
   * Copie le code de la partie dans le presse-papier
   */
  const copyGameId = () => {
    navigator.clipboard.writeText(uuid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canStart = players.length >= 2
  const maxPlayers = 4

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          🎲 Salle d&apos;attente
        </h1>
        <p className="text-base-content/70">
          Partagez le code de la partie avec vos amis pour les inviter
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Section gauche : Code de la partie */}
        <div className="space-y-6">
          {/* Code de la partie - Grande carte */}
          <div className="card bg-gradient-to-br from-primary/20 to-secondary/20 shadow-xl border-2 border-primary/30">
            <div className="card-body items-center text-center">
              <h2 className="card-title text-sm uppercase tracking-wide text-base-content/70 mb-2">
                Code de la partie
              </h2>
              <div className="bg-base-100 px-6 py-4 rounded-lg shadow-inner">
                <code className="text-3xl md:text-4xl font-mono font-bold tracking-wider">
                  {uuid}
                </code>
              </div>
              <button
                onClick={copyGameId}
                className={`btn btn-sm mt-3 ${
                  copied ? 'btn-success' : 'btn-primary'
                } gap-2`}
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Copier le code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Informations */}
          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg">ℹ️ Informations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Joueurs :</span>
                  <span className="font-bold">
                    {players.length} / {maxPlayers}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Minimum requis :</span>
                  <span className="font-bold">2 joueurs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base-content/70">Statut :</span>
                  <span
                    className={`badge ${
                      canStart ? 'badge-success' : 'badge-warning'
                    }`}
                  >
                    {canStart ? 'Prêt' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages système */}
          {systemMessages.length > 0 && (
            <div className="card bg-info/10 border border-info/30 shadow-lg">
              <div className="card-body py-4">
                <h3 className="card-title text-sm">📢 Activité récente</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {systemMessages.slice(-5).map((msg, idx) => (
                    <p
                      key={idx}
                      className="text-xs text-base-content/80 py-1 border-b border-base-content/10 last:border-0"
                    >
                      • {msg}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section droite : Joueurs */}
        <div className="space-y-6">
          {/* Liste des joueurs */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">
                👥 Joueurs connectés ({players.length})
              </h2>
              <div className="space-y-3">
                {players.map((p, index) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 bg-base-100 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Avatar */}
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        {p.avatar ? (
                          <Image 
                            src={p.avatar} 
                            alt={p.name}
                            width={48}
                            height={48}
                            className="rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                            <span className="text-xl font-bold">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Info joueur */}
                    <div className="flex-1">
                      <p className="font-semibold">{p.name}</p>
                      {index === 0 && (
                        <p className="text-xs text-primary">🎮 Hôte de la partie</p>
                      )}
                    </div>
                    {/* Badge */}
                    {index === 0 && <span className="badge badge-primary">Hôte</span>}
                  </div>
                ))}

                {/* Emplacements vides */}
                {Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 bg-base-100/50 p-3 rounded-lg border-2 border-dashed border-base-content/20"
                  >
                    <div className="avatar placeholder">
                      <div className="bg-base-300 rounded-full w-12 h-12">
                        <span className="text-xl">?</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-base-content/50 text-sm">
                        En attente d&apos;un joueur...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <div className="space-y-3">
                {isHost ? (
                  <>
                    {canStart ? (
                      <button
                        onClick={onStart}
                        className="btn btn-success btn-lg w-full gap-2"
                      >
                        <span>🚀</span>
                        <span>Démarrer la partie</span>
                      </button>
                    ) : (
                      <div className="alert alert-warning">
                        <span>⏳</span>
                        <span className="text-sm">
                          En attente d&apos;au moins un autre joueur...
                        </span>
                      </div>
                    )}
                    <button onClick={onLeave} className="btn btn-outline btn-error w-full">
                      🚪 Quitter la salle
                    </button>
                  </>
                ) : (
                  <>
                    <div className="alert alert-info">
                      <span>👤</span>
                      <span className="text-sm">
                        L&apos;hôte va lancer la partie bientôt...
                      </span>
                    </div>
                    <button onClick={onLeave} className="btn btn-outline btn-error w-full">
                      🚪 Quitter la salle
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

