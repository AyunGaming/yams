import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Providers from "@/components/Providers"
import { GameProtectionProvider } from "@/contexts/GameProtectionContext"
import { FlashMessageProvider } from "@/contexts/FlashMessageContext"
import FlashMessages from "@/components/FlashMessages"

export const metadata: Metadata = {
  title: "Yams Tour par Tour",
  description: "Jeu de Yams en temps réel avec Next.js et Supabase",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // next-themes utilise 'theme' comme clé par défaut
                  const stored = localStorage.getItem('theme');
                  const theme = stored && (stored === 'yams' || stored === 'yams-dark') 
                    ? stored 
                    : 'yams';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'yams');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-base-100 text-base-content">
        <Providers>
          <FlashMessageProvider>
            <GameProtectionProvider>
              <Navbar />
              <main className="max-w-6xl mx-auto p-4">{children}</main>
              <FlashMessages />
            </GameProtectionProvider>
          </FlashMessageProvider>
        </Providers>
      </body>
    </html>
  )
}
