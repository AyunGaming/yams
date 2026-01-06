import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyJwtToken } from '@/lib/authServer'

const COOKIE_NAME = 'yams_auth_token'

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  if (!supabase) {
    return NextResponse.json(
      { error: 'Base de données indisponible.' },
      { status: 500 }
    )
  }

  const {
    achievementId,
  }: {
    achievementId?: string
  } = await request.json()

  if (!achievementId) {
    return NextResponse.json(
      { error: 'achievementId manquant.' },
      { status: 400 }
    )
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  const authUser = token ? verifyJwtToken(token) : null

  if (!authUser) {
    return NextResponse.json(
      { error: 'Non authentifié.' },
      { status: 401 }
    )
  }

  try {
    const { data, error } = await supabase.rpc('unlock_achievement', {
      p_user_id: authUser.id,
      p_achievement_id: achievementId,
    })

    if (error) {
      console.error('[API/ACHIEVEMENTS/UNLOCK] Erreur RPC:', error)
      return NextResponse.json(
        { error: 'Impossible de débloquer le succès.' },
        { status: 500 }
      )
    }

    // Si le succès vient d'être débloqué, retourner aussi ses métadonnées
    if (data === true) {
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('id', achievementId)
        .maybeSingle()

      if (achievementError) {
        console.warn(
          '[API/ACHIEVEMENTS/UNLOCK] Succès débloqué mais impossible de récupérer les détails:',
          achievementError
        )
      }

      return NextResponse.json(
        { success: true, achievement: achievement ?? null },
        { status: 200 }
      )
    }

    // data === false : succès déjà débloqué ou aucune modification
    return NextResponse.json({ success: false, achievement: null }, { status: 200 })
  } catch (e) {
    console.error('[API/ACHIEVEMENTS/UNLOCK] Exception:', e)
    return NextResponse.json(
      { error: 'Erreur inattendue.' },
      { status: 500 }
    )
  }
}


