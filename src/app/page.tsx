'use client'
import { useSupabase } from "@/components/Providers"
import Link from "next/link"

export default function HomePage() {
  const { user } = useSupabase()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 bg-gradient-to-b from-base-100 to-base-200">
        <div className="max-w-4xl">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 animate-fade-in">
            🎲 Yams
          </h1>
          <p className="text-2xl md:text-3xl text-base-content/80 mb-4">
            Jouez au Yahtzee en ligne avec vos amis
          </p>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto mb-8">
            Créez des parties en temps réel, lancez les dés et affrontez vos amis dans ce classique des jeux de dés.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-primary btn-lg">
                  Aller au Dashboard
                </Link>
                <Link href="/dashboard" className="btn btn-outline btn-lg">
                  Créer une partie
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Créer un compte
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Se connecter
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Pourquoi jouer au Yams ici ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">⚡</div>
                <h3 className="card-title text-2xl mb-2">Temps Réel</h3>
                <p className="text-base-content/70">
                  Jouez instantanément avec vos amis grâce à notre système de synchronisation en temps réel.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="card-title text-2xl mb-2">Multijoueur</h3>
                <p className="text-base-content/70">
                  Affrontez jusqu&apos;à 4 joueurs simultanément dans des parties palpitantes.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="card-body items-center text-center">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="card-title text-2xl mb-2">Statistiques</h3>
                <p className="text-base-content/70">
                  Suivez vos performances, victoires et scores moyens dans votre tableau de bord.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-20 px-4 bg-base-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Comment jouer ?
          </h2>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3rem] h-12 flex items-center justify-center">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Créez ou rejoignez une partie</h3>
                <p className="text-base-content/70">
                  Connectez-vous, créez une nouvelle partie ou rejoignez vos amis avec un code de partie.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3rem] h-12 flex items-center justify-center">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Lancez les dés</h3>
                <p className="text-base-content/70">
                  À votre tour, lancez 5 dés jusqu&apos;à 3 fois. Sélectionnez ceux que vous voulez garder entre chaque lancer.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3rem] h-12 flex items-center justify-center">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Choisissez votre score</h3>
                <p className="text-base-content/70">
                  Sélectionnez la combinaison qui vous rapporte le plus de points : brelan, full, suite, Yams, etc.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3rem] h-12 flex items-center justify-center">
                4
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Gagnez la partie</h3>
                <p className="text-base-content/70">
                  Après 13 tours, le joueur avec le score total le plus élevé remporte la partie !
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Prêt à jouer ?
          </h2>
          {user ? (
            <>
              <p className="text-xl text-base-content/70 mb-8">
                Lancez une nouvelle partie et invitez vos amis !
              </p>
              <Link href="/dashboard" className="btn btn-primary btn-lg">
                Créer une partie
              </Link>
            </>
          ) : (
            <>
              <p className="text-xl text-base-content/70 mb-8">
                Rejoignez la communauté et commencez à jouer dès maintenant. C&apos;est gratuit !
              </p>
              <Link href="/register" className="btn btn-primary btn-lg">
                Créer un compte gratuitement
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
  