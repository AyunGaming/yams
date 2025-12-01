import { NextRequest, NextResponse } from 'next/server'
import { confirmEmailToken } from '@/lib/authServer'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?confirm=missing', request.nextUrl))
  }

  try {
    await confirmEmailToken(token)
    return NextResponse.redirect(new URL('/login?confirm=success', request.nextUrl))
  } catch (error) {
    console.error('Erreur confirmation email:', error)
    return NextResponse.redirect(new URL('/login?confirm=error', request.nextUrl))
  }
}


