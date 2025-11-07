import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware simplifié pour Next.js
 * 
 * Note : L'authentification est principalement gérée côté client via Providers.tsx
 * car l'application utilise localStorage pour les tokens JWT.
 * 
 * Ce middleware se contente de :
 * - Permettre l'accès aux routes (la vérification réelle est côté client)
 * - Logger les tentatives d'accès pour le débogage
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Routes d'authentification
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  
  // Routes protégées
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/game/')

  // Logger pour le débogage
  if (isProtectedRoute) {
    console.log(`🔐 Accès à une route protégée: ${pathname}`)
  }

  if (isAuthPage) {
    console.log(`🔓 Accès à une page d'authentification: ${pathname}`)
  }

  // Laisser passer toutes les requêtes
  // La vérification d'authentification est gérée côté client dans Providers.tsx
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

