import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Providers from "@/components/Providers"

export const metadata: Metadata = {
  title: "Yams Tour par Tour",
  description: "Jeu de Yams en temps réel avec Next.js et Supabase",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-base-100 text-base-content">
        <Providers>
          <Navbar />
          <main className="max-w-6xl mx-auto p-4">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
