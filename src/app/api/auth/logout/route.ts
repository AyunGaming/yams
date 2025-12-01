import { NextResponse } from 'next/server'

const COOKIE_NAME = 'yams_auth_token'

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 })

  // Effacer le cookie d'authentification
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  })

  return response
}


