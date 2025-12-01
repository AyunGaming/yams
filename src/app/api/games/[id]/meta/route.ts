import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = params

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Base de données indisponible.' },
      { status: 500 }
    )
  }

  try {
    const { data, error } = await supabase
      .from('games')
      .select('id, status, variant, owner')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Partie introuvable.', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    console.error('[API/GAME META] Exception:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la partie.', data: null },
      { status: 500 }
    )
  }
}


