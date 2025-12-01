import { NextRequest, NextResponse } from 'next/server'
import { verifyJwtToken } from '@/lib/authServer'
import { createAdminClient } from '@/lib/supabase/admin'

const COOKIE_NAME = 'yams_auth_token'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const authUser = token ? verifyJwtToken(token) : null

  if (!authUser) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Base de données indisponible.' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    const {
      score,
      won,
      abandoned = false,
      yams_count = 0,
      xp_gained = 0,
    } = body as {
      score: number
      won: boolean
      abandoned?: boolean
      yams_count?: number
      xp_gained?: number
    }

    const { error } = await supabase.rpc('update_user_stats', {
      p_user_id: authUser.id,
      p_score: score,
      p_won: won,
      p_abandoned: abandoned,
      p_yams_count: yams_count,
      p_xp_gained: xp_gained,
    })

    if (error) {
      console.error('[API/STATS] Erreur update_user_stats:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des statistiques.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('[API/STATS] Exception:', error)
    return NextResponse.json(
      { error: 'Erreur inattendue lors de la mise à jour des statistiques.' },
      { status: 500 }
    )
  }
}


