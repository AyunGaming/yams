'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useSupabase } from '@/components/Providers'
import { UserStats } from '@/types/user'

export default function Leaderboard() {
  const { user, userProfile } = useSupabase()
  const [leaderboardData, setLeaderboardData] = useState<UserStats[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userData, setUserData] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    async function loadLeaderboard() {
      if (hasFetched.current) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      hasFetched.current = true

      try {
        const res = await fetch('/api/leaderboard')
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'Erreur lors du chargement du classement.')
          setLoading(false)
          return
        }
        setLeaderboardData((json.data || []) as UserStats[])
        setUserRank(json.userRank || null)
        setUserData((json.userData || null) as UserStats | null)
        setLoading(false)
      } catch (e) {
        console.error('❌ Erreur chargement classement:', e)
        setError('Erreur inattendue lors du chargement du classement.')
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="card-backdrop p-6">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Chargement du classement...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-backdrop p-6">
        <div className="alert alert-error">
          <span>Erreur lors du chargement du classement: {error}</span>
        </div>
      </div>
    )
  }

  const renderInfoSection = () => (
    <div className="mt-4 md:mt-6 text-xs md:text-sm text-base-content/60">
      <p>
        💡 Le classement affiche les joueurs ayant joué au moins 5 parties, triés par taux de
        victoire, puis par série de victoires, nombre de parties jouées et nombre de Yams
        réalisés.
      </p>
      {userProfile && userProfile.parties_jouees < 5 && (
        <p className="mt-2 text-warning">
          ⚠️ Vous avez joué {userProfile.parties_jouees} partie{userProfile.parties_jouees > 1 ? 's' : ''}. 
          Il vous reste {5 - userProfile.parties_jouees} partie{5 - userProfile.parties_jouees > 1 ? 's' : ''} à jouer 
          pour apparaître dans le classement.
        </p>
      )}
    </div>
  )

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="card-backdrop p-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">🏆 Top 10 des meilleurs joueurs</h2>
        <div className="alert alert-info">
          <span>Aucun joueur dans le classement pour le moment.</span>
        </div>
        {renderInfoSection()}
      </div>
    )
  }

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return `${position}.`
  }

  return (
    <div className="card-backdrop p-4 md:p-6 lg:p-4 xl:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">🏆 Top 10 des meilleurs joueurs</h2>

      {/* Version mobile et tablette : cartes */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto">
        {leaderboardData.map((player, index) => {
          const position = index + 1
          const isCurrentUser = user?.id === player.id
          const isTop3 = position <= 3

          // Styles pour le top 3
          const top3Styles = position === 1 
            ? 'ring-2 ring-yellow-500/70 bg-yellow-700/30 shadow-lg'
            : position === 2
            ? 'ring-2 ring-zinc-300/60 bg-zinc-400/30 shadow-md'
            : position === 3
            ? 'ring-2 ring-orange-500/60 bg-orange-900/30 shadow-md'
            : ''

          return (
            <div
              key={player.id}
              className={`card-backdrop shadow-sm ${
                isTop3 ? top3Styles : ''
              } ${
                isCurrentUser && !isTop3 ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="card-body p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${isTop3 ? 'text-4xl' : 'text-2xl'} flex-shrink-0 flex items-center justify-center w-12`}>
                    {getMedalEmoji(position)}
                  </div>
                  <div className="avatar flex-shrink-0">
                    <div className="w-10 h-10 rounded-full relative overflow-hidden">
                      {player.avatar_url ? (
                        <Image
                          src={player.avatar_url}
                          alt={`Avatar de ${player.username}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-lg">
                            {player.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      {player.username}
                      {isCurrentUser && (
                        <span className="ml-2 badge badge-primary badge-sm">Vous</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Victoires</span>
                    <span className="font-semibold">{player.parties_gagnees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Taux</span>
                    <span className="badge badge-success badge-sm">
                      {player.taux_victoire.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Meilleur score</span>
                    <span className="font-bold text-primary">{player.meilleur_score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Parties</span>
                    <span>{player.parties_jouees}</span>
                  </div>
                </div>

                {(player.nombre_yams_realises > 0 || player.serie_victoires_actuelle > 0) && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-base-300">
                    {player.serie_victoires_actuelle > 0 && (
                      <span className="badge badge-info badge-sm">
                        🔥 {player.serie_victoires_actuelle}
                      </span>
                    )}
                    {player.nombre_yams_realises > 0 && (
                      <span className="badge badge-warning badge-sm">
                        🎲 {player.nombre_yams_realises}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Ligne du joueur s'il n'est pas dans le top 10 */}
        {userData && userRank && userRank > 10 && (
          <>
            <div className="divider my-4">
              <span className="text-xs text-base-content/50">Votre position</span>
            </div>
            <div className="card-backdrop shadow-sm ring-2 ring-primary">
              <div className="card-body p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl flex-shrink-0 flex items-center justify-center w-12">
                    {userRank}.
                  </div>
                  <div className="avatar flex-shrink-0">
                    <div className="w-10 h-10 rounded-full relative overflow-hidden">
                      {userData.avatar_url ? (
                        <Image
                          src={userData.avatar_url}
                          alt={`Avatar de ${userData.username}`}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-lg">
                            {userData.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">
                      {userData.username}
                      <span className="ml-2 badge badge-primary badge-sm">Vous</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Victoires</span>
                    <span className="font-semibold">{userData.parties_gagnees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Taux</span>
                    <span className="badge badge-success badge-sm">
                      {userData.taux_victoire.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Meilleur score</span>
                    <span className="font-bold text-primary">{userData.meilleur_score}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70">Parties</span>
                    <span>{userData.parties_jouees}</span>
                  </div>
                </div>

                {(userData.nombre_yams_realises > 0 || userData.serie_victoires_actuelle > 0) && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-base-300">
                    {userData.serie_victoires_actuelle > 0 && (
                      <span className="badge badge-info badge-sm">
                        🔥 {userData.serie_victoires_actuelle}
                      </span>
                    )}
                    {userData.nombre_yams_realises > 0 && (
                      <span className="badge badge-warning badge-sm">
                        🎲 {userData.nombre_yams_realises}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Version desktop : tableau */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="table w-full table-compact xl:table-normal">
          <thead>
            <tr>
              <th className="text-center">Rang</th>
              <th>Joueur</th>
              <th className="text-center">
                <span className="xl:hidden">Parties</span>
                <span className="hidden xl:inline">Parties jouées</span>
              </th>
              <th className="text-center">Victoires</th>
              <th className="text-center">
                <span className="xl:hidden">Taux</span>
                <span className="hidden xl:inline">Taux de victoire</span>
              </th>
              <th className="text-center lg:table-cell hidden">
                <span className="xl:hidden">Score</span>
                <span className="hidden xl:inline">Meilleur score</span>
              </th>
              <th className="text-center lg:table-cell hidden">
                <span className="xl:hidden">Série</span>
                <span className="hidden xl:inline">Série actuelle</span>
              </th>
              <th className="text-center lg:table-cell hidden">
                <span className="xl:hidden">Yams</span>
                <span className="hidden xl:inline">Yams réalisés</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((player, index) => {
              const position = index + 1
              const isCurrentUser = user?.id === player.id
              const isTop3 = position <= 3
              
              // Styles pour le top 3
              const top3Styles = position === 1 
                ? 'bg-yellow-700/30 ring-1 ring-yellow-500/70'
                : position === 2
                ? 'bg-zinc-400/30 ring-1 ring-zinc-300/60'
                : position === 3
                ? 'bg-orange-900/30 ring-1 ring-orange-500/60'
                : ''

              return (
                <tr
                  key={player.id}
                  className={`transition-colors hover:bg-base-300/50 ${
                    isTop3 ? `${top3Styles} font-bold` : ''
                  } ${
                    isCurrentUser && !isTop3 ? 'bg-primary/20 font-bold' : ''
                  }`}
                >
                  <td className={`text-center text-sm xl:text-lg ${isTop3 ? 'xl:text-2xl' : ''} w-16`}>
                    <div className="flex items-center justify-center w-full">
                      {getMedalEmoji(position)}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 xl:gap-3">
                      <div className="avatar">
                        <div className="w-8 h-8 xl:w-12 xl:h-12 rounded-full relative overflow-hidden">
                          {player.avatar_url ? (
                            <Image
                              src={player.avatar_url}
                              alt={`Avatar de ${player.username}`}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-full h-full flex items-center justify-center">
                              <span className="text-sm xl:text-xl">
                                {player.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-sm xl:text-base">
                          {player.username}
                          {isCurrentUser && (
                            <span className="ml-1 xl:ml-2 badge badge-primary badge-xs xl:badge-sm">Vous</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-sm xl:text-base">{player.parties_jouees}</td>
                  <td className="text-center text-sm xl:text-base">{player.parties_gagnees}</td>
                  <td className="text-center">
                    <span className="badge badge-success badge-sm xl:badge-md w-full justify-center">
                      {player.taux_victoire.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center font-bold text-primary text-sm xl:text-base lg:table-cell hidden">
                    {player.meilleur_score}
                  </td>
                  <td className="text-center lg:table-cell hidden">
                    {player.serie_victoires_actuelle > 0 ? (
                      <>
                        <span className="badge badge-info badge-sm w-full justify-center xl:hidden">{player.serie_victoires_actuelle}</span>
                        <span className="hidden xl:inline-flex badge badge-info badge-md w-full justify-center">
                          🔥 {player.serie_victoires_actuelle}
                        </span>
                      </>
                    ) : (
                      <span className="text-base-content/50 text-sm xl:text-base">0</span>
                    )}
                  </td>
                  <td className="text-center lg:table-cell hidden">
                    {player.nombre_yams_realises > 0 ? (
                      <>
                        <span className="badge badge-warning badge-sm w-full justify-center xl:hidden">{player.nombre_yams_realises}</span>
                        <span className="hidden xl:inline-flex badge badge-warning badge-md w-full justify-center">
                          🎲 {player.nombre_yams_realises}
                        </span>
                      </>
                    ) : (
                      <span className="text-base-content/50 text-sm xl:text-base">0</span>
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Ligne du joueur s'il n'est pas dans le top 10 */}
            {userData && userRank && userRank > 10 && (
              <>
                <tr>
                  <td colSpan={8} className="text-center py-2">
                    <span className="text-xs text-base-content/50">Votre position</span>
                  </td>
                </tr>
                <tr className="bg-primary/20 font-bold transition-colors hover:bg-primary/30">
                  <td className="text-center text-sm xl:text-lg w-16">
                    <div className="flex items-center justify-center w-full">
                      {userRank}.
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 xl:gap-3">
                      <div className="avatar">
                        <div className="w-8 h-8 xl:w-12 xl:h-12 rounded-full relative overflow-hidden">
                          {userData.avatar_url ? (
                            <Image
                              src={userData.avatar_url}
                              alt={`Avatar de ${userData.username}`}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-full h-full flex items-center justify-center">
                              <span className="text-sm xl:text-xl">
                                {userData.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-sm xl:text-base">
                          {userData.username}
                          <span className="ml-1 xl:ml-2 badge badge-primary badge-xs xl:badge-sm">Vous</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-sm xl:text-base">{userData.parties_jouees}</td>
                  <td className="text-center text-sm xl:text-base">{userData.parties_gagnees}</td>
                  <td className="text-center">
                    <span className="badge badge-success badge-sm xl:badge-md w-full justify-center">
                      {userData.taux_victoire.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center font-bold text-primary text-sm xl:text-base lg:table-cell hidden">
                    {userData.meilleur_score}
                  </td>
                  <td className="text-center lg:table-cell hidden">
                    {userData.serie_victoires_actuelle > 0 ? (
                      <>
                        <span className="badge badge-info badge-sm w-full justify-center xl:hidden">{userData.serie_victoires_actuelle}</span>
                        <span className="hidden xl:inline-flex badge badge-info badge-md w-full justify-center">
                          🔥 {userData.serie_victoires_actuelle}
                        </span>
                      </>
                    ) : (
                      <span className="text-base-content/50 text-sm xl:text-base">0</span>
                    )}
                  </td>
                  <td className="text-center lg:table-cell hidden">
                    {userData.nombre_yams_realises > 0 ? (
                      <>
                        <span className="badge badge-warning badge-sm w-full justify-center xl:hidden">{userData.nombre_yams_realises}</span>
                        <span className="hidden xl:inline-flex badge badge-warning badge-md w-full justify-center">
                          🎲 {userData.nombre_yams_realises}
                        </span>
                      </>
                    ) : (
                      <span className="text-base-content/50 text-sm xl:text-base">0</span>
                    )}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {renderInfoSection()}
    </div>
  )
}

