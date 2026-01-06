'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSupabase } from './Providers'
import type { Achievement } from '@/types/achievement'

type AchievementWithStatus = {
  id: string
  achievement: Achievement
  unlocked_at: string | null
}

export default function RecentAchievements() {
  const { userProfile } = useSupabase()
  const [items, setItems] = useState<AchievementWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allItems, setAllItems] = useState<AchievementWithStatus[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [errorAll, setErrorAll] = useState<string | null>(null)
  const [previewAchievement, setPreviewAchievement] = useState<{
    image_path: string
    name: string
    rarity: string
    unlocked: boolean
  } | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!userProfile?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/users/${userProfile.id}/achievements`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Erreur lors du chargement des achievements.')
          setLoading(false)
          return
        }

        setItems(json.data as AchievementWithStatus[])
      } catch (err) {
        console.error('❌ Erreur chargement achievements:', err)
        setError('Erreur inattendue lors du chargement des achievements.')
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [userProfile?.id])

  // Désactiver le scroll de la page quand la modal est ouverte
  useEffect(() => {
    if (typeof document === 'undefined') return

    if (isModalOpen) {
      const previousOverflow = document.body.style.overflow
      document.body.dataset.prevOverflow = previousOverflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = document.body.dataset.prevOverflow || ''
        delete document.body.dataset.prevOverflow
      }
    }

    // Cleanup lorsque la modal est fermée
    return () => {
      if (document.body.dataset.prevOverflow !== undefined) {
        document.body.style.overflow = document.body.dataset.prevOverflow || ''
        delete document.body.dataset.prevOverflow
      }
    }
  }, [isModalOpen])

  // Gérer l'animation de flip quand on ouvre un aperçu de médaille
  useEffect(() => {
    if (!previewAchievement) {
      setIsFlipped(false)
      return
    }

    setIsFlipped(false)
    const timeout = setTimeout(() => {
      setIsFlipped(true)
    }, 50)

    return () => {
      clearTimeout(timeout)
    }
  }, [previewAchievement])

  const getMedalBackImage = (rarity: string) => {
    const basePath = '/images/achievements'

    switch (rarity) {
      case 'Bronze':
        return `${basePath}/Bronze/Medals_Bronze.webp`
      case 'Silver':
        return `${basePath}/Silver/Medals_Silver.webp`
      case 'Gold':
        return `${basePath}/Gold/Medals_Gold.webp`
      case 'Crystal':
        return `${basePath}/Crystal/Medals_Crystal.webp`
      default:
        return `${basePath}/Bronze/Medals_Bronze.webp`
    }
  }

  if (!userProfile) {
    return null
  }

  const openFullList = async () => {
    if (!userProfile.id) return

    setIsModalOpen(true)

    // Ne pas recharger si déjà chargé
    if (allItems.length > 0) return

    try {
      setLoadingAll(true)
      setErrorAll(null)

      const res = await fetch(`/api/users/${userProfile.id}/achievements?all=1`)
      const json = await res.json()

      if (!res.ok) {
        setErrorAll(json.error || 'Erreur lors du chargement de la liste complète.')
        setLoadingAll(false)
        return
      }

      setAllItems(json.data as AchievementWithStatus[])
    } catch (err) {
      console.error('❌ Erreur chargement liste complète achievements:', err)
      setErrorAll('Erreur inattendue lors du chargement de la liste complète.')
    } finally {
      setLoadingAll(false)
    }
  }

  const closeFullList = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="card card-no-hover bg-base-100 shadow-xl border border-base-300 relative">
      <div className="card-body">
        <div className="flex items-center justify-between mb-3">
          <h2 className="card-title text-xl font-display">Derniers succès débloqués</h2>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-base-content/70">
            <span className="loading loading-spinner loading-sm" />
            <span>Chargement des succès débloqués...</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-error">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-sm text-base-content/70">
            Aucun succès débloqué pour le moment. Continuez à jouer pour gagner vos premières médailles !
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-2 items-center">
            {items.map((item) => {
              const achievement = item.achievement
              if (!achievement) return null

              return (
                <div
                  key={item.id}
                  className="tooltip"
                  data-tip={`${achievement.name} – ${achievement.description}`}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-base-200 flex items-center justify-center border border-base-300 overflow-hidden">
                    <Image
                      src={achievement.image_path}
                      alt={achievement.name}
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  </div>
                </div>
              )
            })}

            {/* Bouton pour ouvrir la liste complète des succès */}
            <button
              type="button"
              onClick={openFullList}
              className="tooltip"
              data-tip="Voir tous les succès"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-base-200 flex items-center justify-center border border-dashed border-base-300 text-2xl font-bold">
                ...
              </div>
            </button>
          </div>
        )}

        {/* Modal liste complète des succès */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
            <div className="card card-no-hover bg-base-100 w-full max-w-4xl max-h-[90vh] shadow-2xl border border-base-300 relative">
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="card-title text-lg font-display">Tous vos succès débloqués</h3>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={closeFullList}
                  >
                    ✕
                  </button>
                </div>

                {loadingAll && (
                  <div className="flex items-center gap-2 text-sm text-base-content/70">
                    <span className="loading loading-spinner loading-sm" />
                    <span>Chargement de la liste complète...</span>
                  </div>
                )}

                {!loadingAll && errorAll && (
                  <div className="text-sm text-error mb-2">
                    {errorAll}
                  </div>
                )}

                {!loadingAll && !errorAll && allItems.length === 0 && (
                  <div className="text-sm text-base-content/70">
                    Aucun succès débloqué pour le moment.
                  </div>
                )}

                {!loadingAll && !errorAll && allItems.length > 0 && (
                  <div className="mt-2 space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                    {allItems.map((item) => {
                      const achievement = item.achievement
                      if (!achievement) return null

                      const unlocked = !!item.unlocked_at
                      const isLockedCrystal = !unlocked && achievement.rarity === 'Crystal'
                      const unlockedDate = unlocked
                        ? new Date(item.unlocked_at as string).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : null

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 justify-between bg-base-200/60 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewAchievement({
                                  image_path: achievement.image_path,
                                  name: achievement.name,
                                  rarity: achievement.rarity,
                                  unlocked,
                                })
                              }
                              className="w-12 h-12 rounded-full bg-base-100 flex items-center justify-center border border-base-300 overflow-hidden shrink-0 cursor-zoom-in"
                            >
                              <Image
                                src={achievement.image_path}
                                alt={achievement.name}
                                width={56}
                                height={56}
                                className={`object-contain ${unlocked ? '' : 'grayscale'}`}
                              />
                            </button>
                            <div>
                              <div
                                className={`font-semibold text-sm ${
                                  unlocked ? 'text-base-content' : 'text-gray-400 italic'
                                }`}
                              >
                                {isLockedCrystal ? '???' : achievement.name}
                              </div>
                              <div
                                className={`text-xs ${
                                  unlocked ? 'text-base-content/70' : 'text-gray-400 italic'
                                }`}
                              >
                                {isLockedCrystal ? '???' : achievement.description}
                              </div>
                            </div>
                          </div>

                          {unlockedDate && (
                            <div className="text-xs text-base-content/60 text-right whitespace-nowrap ml-2">
                              {unlockedDate}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Aperçu grand format de la médaille sélectionnée */}
                {previewAchievement && (
                  <div
                    className="absolute inset-0 z-20 flex items-center justify-center bg-black/60"
                    onClick={() => setPreviewAchievement(null)}
                  >
                    <div
                      className="bg-base-100 rounded-xl p-4 shadow-2xl border border-base-300 max-w-[80vw] max-h-[80vh] flex flex-col items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="medal-flip-scene w-full flex items-center justify-center">
                        <div
                          className={`medal-flip-card ${
                            isFlipped ? 'is-flipped' : ''
                          }`}
                        >
                          {/* Dos de la médaille (générique par rareté) */}
                          <div className="medal-flip-face flex items-center justify-center">
                            <Image
                              src={getMedalBackImage(previewAchievement.rarity)}
                              alt={`Dos de médaille ${previewAchievement.rarity}`}
                              width={320}
                              height={320}
                              className="object-contain max-h-[60vh]"
                            />
                          </div>

                          {/* Face du succès */}
                          <div className="medal-flip-face medal-flip-back flex items-center justify-center">
                            <Image
                              src={previewAchievement.image_path}
                              alt={previewAchievement.name}
                              width={320}
                              height={320}
                              className="object-contain max-h-[60vh]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-base-300 my-2" />

                      {previewAchievement.rarity === 'Crystal' && !previewAchievement.unlocked ? (
                        <div className="text-center">
                          <div className="font-semibold text-sm">???</div>
                          <div className="text-xs text-base-content/70">{previewAchievement.rarity}</div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="font-semibold text-sm">{previewAchievement.name}</div>
                          <div className="text-xs text-base-content/70">{previewAchievement.rarity}</div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline mt-1"
                        onClick={() => setPreviewAchievement(null)}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
