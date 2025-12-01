'use client'

import Image from 'next/image'
import { useSupabase } from './Providers'
import { useEffect, useState, useRef, useMemo } from 'react'
import { UserStats } from '@/types/user'
import XPBar from './XPBar'

interface UserProfileProps {
  /**
   * Si true, affiche les stats détaillées
   * Si false, affiche uniquement les infos de base (nom, avatar)
   */
  detailed?: boolean
  
  /**
   * Si fourni, affiche le profil d'un autre utilisateur
   * Sinon, affiche le profil de l'utilisateur connecté
   */
  userId?: string
}

export default function UserProfile({ detailed = true, userId }: UserProfileProps) {
  const { userProfile } = useSupabase()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const lastFetchedId = useRef<string | null>(null)

  // Mémoriser l'ID pour éviter les changements de référence
  const targetUserId = useMemo(() => userId || userProfile?.id, [userId, userProfile?.id])

  useEffect(() => {
    const fetchStats = async () => {
      if (!detailed) {
        setLoading(false)
        return
      }

      if (!targetUserId) {
        setLoading(false)
        return
      }

      // Éviter de recharger si on a déjà chargé pour cet utilisateur
      if (lastFetchedId.current === targetUserId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        lastFetchedId.current = targetUserId

        const res = await fetch(`/api/users/${targetUserId}/profile`)
        const json = await res.json()

        if (!res.ok) {
          console.error('❌ Erreur chargement profil distant:', json.error)
          setLoading(false)
          return
        }

        if (json.data) {
          setStats(json.data as UserStats)
        }
      } catch (error) {
        console.error('❌ Erreur inattendue:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [targetUserId, detailed])

  // Utiliser le profil du contexte ou les stats chargées
  const profile = stats || userProfile

  if (!profile) {
    return (
      <div className="text-center text-base-content/60">
        Aucun profil disponible
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  // Calculer les stats si disponibles
  const tauxVictoire = stats?.taux_victoire ?? 
    (profile.parties_jouees > 0 
      ? Math.round((profile.parties_gagnees / profile.parties_jouees) * 100) 
      : 0)

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        {/* En-tête du profil */}
        <div className="flex items-center gap-4 mb-4">
          <div className="avatar">
            <div className="w-20 h-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 relative overflow-hidden">
              {profile.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt={profile.username}
                  width={80}
                  height={80}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="bg-neutral-focus text-neutral-content rounded-full w-full h-full flex items-center justify-center">
                  <span className="text-3xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h2 className="card-title text-2xl">{profile.username}</h2>
            {/* Barre d'XP */}
            <div className="mt-2">
              <XPBar 
                currentXp={profile.xp || 0} 
                currentLevel={profile.level || 1}
                size="md"
              />
            </div>
          </div>
        </div>

        {detailed && (
          <>
            {/* Stats principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="stat bg-base-300 rounded-lg p-4">
                <div className="stat-title text-xs">Parties jouées</div>
                <div className="stat-value text-2xl">{profile.parties_jouees}</div>
              </div>
              
              <div className="stat bg-base-300 rounded-lg p-4">
                <div className="stat-title text-xs">Victoires</div>
                <div className="stat-value text-2xl text-success">{profile.parties_gagnees}</div>
              </div>
              
              <div className="stat bg-base-300 rounded-lg p-4">
                <div className="stat-title text-xs">Taux de victoire</div>
                <div className="stat-value text-2xl text-warning">{tauxVictoire}%</div>
              </div>
              
              <div className="stat bg-base-300 rounded-lg p-4">
                <div className="stat-title text-xs">Meilleur score</div>
                <div className="stat-value text-2xl text-primary">{profile.meilleur_score}</div>
              </div>
            </div>

            {/* Stats secondaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="stat bg-base-100 rounded-lg p-4">
                <div className="stat-figure text-secondary">
                  <span className="text-3xl">🎲</span>
                </div>
                <div className="stat-title">Yams réalisés</div>
                <div className="stat-value text-xl">{profile.nombre_yams_realises}</div>
              </div>

              <div className="stat bg-base-100 rounded-lg p-4">
                <div className="stat-figure text-accent">
                  <span className="text-3xl">🔥</span>
                </div>
                <div className="stat-title">Meilleure série</div>
                <div className="stat-value text-xl">{profile.meilleure_serie_victoires}</div>
              </div>
            </div>

            {/* Série actuelle */}
            {profile.serie_victoires_actuelle > 0 && (
              <div className="alert alert-success mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <span className="font-semibold">
                    Série en cours : {profile.serie_victoires_actuelle} victoire{profile.serie_victoires_actuelle > 1 ? 's' : ''} !
                  </span>
                </div>
              </div>
            )}

            {/* Badges / Achievements */}
            <div className="mt-4">
              <h3 className="font-semibold mb-2">🏆 Accomplissements</h3>
              <div className="flex flex-wrap gap-2">
                {profile.parties_jouees >= 1 && (
                  <div className="badge badge-primary">Première partie</div>
                )}
                {profile.parties_gagnees >= 1 && (
                  <div className="badge badge-success">Première victoire</div>
                )}
                {profile.parties_gagnees >= 10 && (
                  <div className="badge badge-success">10 victoires</div>
                )}
                {profile.nombre_yams_realises >= 1 && (
                  <div className="badge badge-secondary">Premier Yams</div>
                )}
                {profile.meilleur_score >= 200 && (
                  <div className="badge badge-warning">Score de légende</div>
                )}
                {profile.meilleure_serie_victoires >= 3 && (
                  <div className="badge badge-error">Série de 3+</div>
                )}
                {tauxVictoire >= 50 && profile.parties_jouees >= 10 && (
                  <div className="badge badge-accent">Champion</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

