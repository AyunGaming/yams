import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Base de données indisponible.' },
      { status: 500 }
    )
  }

  try {
    // Essayer d'abord la vue leaderboard (stats calculées)
    const { data: leaderboardRow, error: leaderboardError } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (leaderboardError) {
      console.warn('[API/USER PROFILE] Erreur leaderboard, fallback users:', leaderboardError)
    }

    // Toujours récupérer la ligne users pour xp/level et stats brutes
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (userError) {
      console.error('[API/USER PROFILE] Erreur users:', userError)
      return NextResponse.json(
        { error: 'Impossible de charger ce profil.' },
        { status: 500 }
      )
    }

    if (!userRow && !leaderboardRow) {
      return NextResponse.json(
        { error: 'Profil introuvable.' },
        { status: 404 }
      )
    }

    const base = userRow || leaderboardRow
    const taux_victoire =
      leaderboardRow?.taux_victoire ??
      (base.parties_jouees > 0
        ? Math.round((base.parties_gagnees / base.parties_jouees) * 100)
        : 0)

    const profile = {
      ...base,
      taux_victoire,
    }

    return NextResponse.json({ data: profile }, { status: 200 })
  } catch (error) {
    console.error('[API/USER PROFILE] Exception:', error)
    return NextResponse.json(
      { error: 'Erreur inattendue lors du chargement du profil.' },
      { status: 500 }
    )
  }
}


