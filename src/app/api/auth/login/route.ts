import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/authServer'

const COOKIE_NAME = 'yams_auth_token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe sont requis.' },
        { status: 400 }
      )
    }

    const { user, token, expiresIn } = await authenticateUser(email, password)

    const response = NextResponse.json(
      {
        user,
        token, // exposé pour le handshake Socket (stocké en localStorage)
        expiresIn,
      },
      { status: 200 }
    )

    const expires = new Date(Date.now() + expiresIn * 1000)

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires,
    })

    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur lors de la connexion.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}


