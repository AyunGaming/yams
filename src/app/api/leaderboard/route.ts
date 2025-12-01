import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_request: NextRequest) {
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

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('[API/LEADERBOARD] Exception:', error)
    return NextResponse.json(
      { error: 'Erreur inattendue lors du chargement du classement.' },
      { status: 500 }
    )
  }
}


