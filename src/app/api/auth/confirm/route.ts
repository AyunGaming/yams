import { NextRequest, NextResponse } from 'next/server'
import { confirmEmailToken } from '@/lib/authServer'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  // Utiliser l'URL de base depuis les variables d'environnement en priorité
  // Sinon utiliser l'origin de la requête (qui peut être localhost en dev)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  request.nextUrl.origin

  if (!token) {
    return NextResponse.redirect(new URL('/login?confirm=missing', baseUrl))
  }

  try {
    await confirmEmailToken(token)
    return NextResponse.redirect(new URL('/login?confirm=success', baseUrl))
  } catch (error) {
    console.error('Erreur confirmation email:', error)
    return NextResponse.redirect(new URL('/login?confirm=error', baseUrl))
  }
}


