import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SimpleCache } from '@/lib/simpleCache'

// Cache process-local pour le leaderboard.
// TTL court pour garder des données fraîches.
type LeaderboardRow = {
  id: string
  username: string
  xp: number
  level: number
}

const leaderboardCache = new SimpleCache<LeaderboardRow[]>(30_000) // 30 secondes

export async function GET() {
  const cacheKey = 'leaderboard_top_10'
  const cached = leaderboardCache.get(cacheKey)

  if (cached) {
    return NextResponse.json({ data: cached }, { status: 200 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Base de données indisponible.' },
      { status: 500 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(10)

    if (error) {
      console.error('[API/LEADERBOARD] Erreur:', error)
      return NextResponse.json(
        { error: 'Erreur lors du chargement du classement.' },
        { status: 500 }
      )
    }

    const rows = data || []
    leaderboardCache.set(cacheKey, rows)

    return NextResponse.json({ data: rows }, { status: 200 })
  } catch (error) {
    console.error('[API/LEADERBOARD] Exception:', error)
    return NextResponse.json(
      { error: 'Erreur inattendue lors du chargement du classement.' },
      { status: 500 }
    )
  }
}

