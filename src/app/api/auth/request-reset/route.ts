import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/emailSender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body as { email?: string }

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Base de données indisponible.' },
        { status: 500 }
      )
    }

    // Trouver l'utilisateur dans auth_local_users
    const { data: user, error } = await supabase
      .from('auth_local_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    // Pour éviter de leak si un email existe ou non, on renvoie toujours un succès
    if (error || !user) {
      console.warn('Demande de reset pour email inexistant ou erreur:', error)
      return NextResponse.json(
        {
          message:
            'Si un compte existe avec cet email, tu recevras un lien de réinitialisation.',
        },
        { status: 200 }
      )
    }

    // Créer un token de reset
    const { data: tokenRow, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
      })
      .select('token')
      .single()

    if (tokenError || !tokenRow) {
      console.error('Erreur création token reset:', tokenError)
      return NextResponse.json(
        { error: 'Erreur lors de la génération du lien de réinitialisation.' },
        { status: 500 }
      )
    }

    const baseUrl = request.nextUrl.origin
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(
      tokenRow.token as string
    )}`

    await sendPasswordResetEmail({
      to: user.email as string,
      resetUrl,
    })

    return NextResponse.json(
      {
        message:
          'Si un compte existe avec cet email, tu recevras un lien de réinitialisation.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur request-reset:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la demande de réinitialisation.' },
      { status: 500 }
    )
  }
}


