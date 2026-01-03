'use client'
import { useSupabase } from "@/components/Providers"
import Link from "next/link"
import PlusIcon from "@/components/icons/PlusIcon"

export default function HomePage() {
  const { user } = useSupabase()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 relative overflow-hidden">
        {/* Fond avec dégradé animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 animate-pulse"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
        
        <div className="max-w-4xl relative z-10">
          <h1 className="text-6xl md:text-8xl font-display font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-slide-in-bottom flex items-center justify-center gap-4">
            <svg 
              className="h-[1em] w-[1em]" 
              viewBox="0 0 32 32" 
              fill="var(--dice-color)" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <title>perspective-dice-one</title>
                <path d="M27.111 8.247l-9.531-5.514c-0.895-0.518-2.346-0.518-3.241 0l-9.531 5.514c-0.61 0.353-0.804 0.856-0.582 1.304l11.291 6.447c0.27 0.031 0.548 0.033 0.819 0.007l11.385-6.515c0.176-0.432-0.026-0.906-0.609-1.243zM17.397 9.982c-0.779 0.462-2.041 0.462-2.82 0s-0.779-1.211 0-1.673 2.041-0.462 2.82 0c0.779 0.462 0.779 1.211 0 1.673zM27.424 10.14l-10.366 5.932c-0.365 0.36-0.669 0.831-0.861 1.322v11.721c0.281 0.394 0.803 0.467 1.401 0.122l9.168-5.294c0.895-0.517 1.621-1.774 1.621-2.808v-9.84c0-0.763-0.396-1.191-0.963-1.155zM20.092 17.199c0.002 0.861-0.626 1.923-1.401 2.372s-1.405 0.116-1.407-0.745c0-0.002 0-0.004 0-0.006-0.002-0.861 0.626-1.923 1.401-2.372s1.405-0.116 1.407 0.745c0 0.002 0 0.004 0 0.006zM27.081 20.821c0.002 0.861-0.626 1.923-1.401 2.372s-1.405 0.116-1.407-0.745c0-0.002 0-0.004 0-0.006-0.002-0.861 0.626-1.923 1.401-2.372s1.405-0.116 1.407 0.745c0 0.002 0 0.004 0 0.006zM15.645 17.134c-0.165-0.345-0.383-0.671-0.635-0.944l-10.597-6.051c-0.504 0.027-0.846 0.446-0.846 1.156v9.84c0 1.034 0.726 2.291 1.621 2.808l9.168 5.294c0.525 0.303 0.992 0.284 1.289 0.008v-12.111h-0zM7.682 14.791c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006zM11.176 20.615c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006zM14.671 26.483c-0.002 0.861-0.631 1.194-1.407 0.745s-1.403-1.511-1.401-2.372c0-0.002 0-0.004 0-0.006 0.002-0.861 0.631-1.194 1.407-0.745s1.403 1.511 1.401 2.372c0 0.002 0 0.004 0 0.006z"></path>
              </g>
            </svg>
            <span>Yams</span>
          </h1>
          <p className="text-2xl md:text-4xl font-semibold text-base-content/90 mb-4 animate-slide-in-bottom" style={{ animationDelay: '0.1s' }}>
            Jouez au Yams en ligne avec vos amis
          </p>
          <p className="text-lg md:text-xl text-base-content/70 max-w-2xl mx-auto mb-10 animate-slide-in-bottom" style={{ animationDelay: '0.2s' }}>
            Créez des parties en temps réel, lancez les dés et affrontez vos amis dans ce classique des jeux de dés.
          </p>
          <div className="flex gap-4 justify-center flex-wrap animate-slide-in-bottom" style={{ animationDelay: '0.3s' }}>
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-primary btn-lg gap-2">
                  <span>📊</span>
                  <span>Aller au Dashboard</span>
                </Link>
                <Link href="/dashboard" className="btn btn-secondary btn-lg gap-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>Créer une partie</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-lg gap-2">
                  <span>✨</span>
                  <span>Créer un compte</span>
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg gap-2">
                  <span>🔐</span>
                  <span>Se connecter</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-base-200/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Pourquoi jouer au Yams ici ?
          </h2>
          <p className="text-center text-base-content/70 mb-12 text-lg">
            Une expérience de jeu moderne et fluide
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-primary/20 hover:border-primary/40">
              <div className="card-body items-center text-center">
                <div className="text-6xl mb-4 animate-float">⚡</div>
                <h3 className="card-title text-2xl mb-2 font-display">Temps Réel</h3>
                <p className="text-base-content/70">
                  Jouez instantanément avec vos amis grâce à notre système de synchronisation en temps réel.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-secondary/20 hover:border-secondary/40">
              <div className="card-body items-center text-center">
                <div className="text-6xl mb-4 animate-float" style={{ animationDelay: '0.5s' }}>👥</div>
                <h3 className="card-title text-2xl mb-2 font-display">Multijoueur</h3>
                <p className="text-base-content/70">
                  Affrontez jusqu&apos;à 8 joueurs simultanément dans des parties palpitantes.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-accent/20 hover:border-accent/40">
              <div className="card-body items-center text-center">
                <div className="text-6xl mb-4 animate-float" style={{ animationDelay: '1s' }}>📊</div>
                <h3 className="card-title text-2xl mb-2 font-display">Statistiques</h3>
                <p className="text-base-content/70">
                  Suivez vos performances, victoires et scores moyens dans votre tableau de bord.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-20 px-4 bg-base-200/95 backdrop-blur-md border border-base-300 rounded-lg">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Comment jouer ?
          </h2>
          <p className="text-center text-base-content/70 mb-12 text-lg">
            Simple, rapide et amusant
          </p>
          <div className="space-y-6">
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all border-l-4 border-l-primary">
              <div className="card-body">
                <div className="flex gap-4 items-start">
                  <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3.5rem] h-14 flex items-center justify-center shadow-lg">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 font-display">Créez ou rejoignez une partie</h3>
                    <p className="text-base-content/70">
                      Connectez-vous, créez une nouvelle partie ou rejoignez vos amis avec un code de partie.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all border-l-4 border-l-secondary">
              <div className="card-body">
                <div className="flex gap-4 items-start">
                  <div className="badge badge-secondary badge-lg text-xl font-bold min-w-[3.5rem] h-14 flex items-center justify-center shadow-lg">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 font-display">Lancez les dés</h3>
                    <p className="text-base-content/70">
                      À votre tour, lancez 5 dés jusqu&apos;à 3 fois. Sélectionnez ceux que vous voulez garder entre chaque lancer.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all border-l-4 border-l-accent">
              <div className="card-body">
                <div className="flex gap-4 items-start">
                  <div className="badge badge-accent badge-lg text-xl font-bold min-w-[3.5rem] h-14 flex items-center justify-center shadow-lg">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 font-display">Choisissez votre score</h3>
                    <p className="text-base-content/70">
                      Sélectionnez la combinaison qui vous rapporte le plus de points : brelan, full, suite, Yams, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all border-l-4 border-l-primary">
              <div className="card-body">
                <div className="flex gap-4 items-start">
                  <div className="badge badge-primary badge-lg text-xl font-bold min-w-[3.5rem] h-14 flex items-center justify-center shadow-lg">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 font-display">Gagnez la partie</h3>
                    <p className="text-base-content/70">
                      Après 13 tours, le joueur avec le score total le plus élevé remporte la partie !
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10"></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Prêt à jouer ?
          </h2>
          {user ? (
            <>
              <p className="text-xl text-base-content/70 mb-8">
                Lancez une nouvelle partie et invitez vos amis !
              </p>
              <Link href="/dashboard" className="btn btn-primary btn-lg gap-2 shadow-xl">
                <span>🚀</span>
                <span>Créer une partie</span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-xl text-base-content/70 mb-8">
                Rejoignez la communauté et commencez à jouer dès maintenant. C&apos;est gratuit !
              </p>
              <Link href="/register" className="btn btn-primary btn-lg gap-2 shadow-xl">
                <span>✨</span>
                <span>Créer un compte gratuitement</span>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
  