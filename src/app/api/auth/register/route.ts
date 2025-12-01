import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/authServer'
import { sendConfirmationEmail } from '@/lib/emailSender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, username } = body as {
      email?: string
      password?: string
      username?: string
    }

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, mot de passe et nom d’utilisateur sont requis.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      )
    }

    const { authUser, emailVerificationToken } = await registerUser({
      email,
      password,
      username,
    })

    const baseUrl = request.nextUrl.origin
    const confirmationUrl = `${baseUrl}/auth/confirm?token=${encodeURIComponent(
      emailVerificationToken
    )}`

    await sendConfirmationEmail({
      to: authUser.email,
      confirmationUrl,
    })

    return NextResponse.json(
      {
        message: 'Compte créé. Vérifie ton email pour confirmer ton inscription.',
      },
      { status: 201 }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur lors de la création du compte.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


