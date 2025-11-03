export default function HomePage() {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <h1 className="text-4xl font-bold mb-4">Bienvenue sur 🎲 Yams</h1>
        <p className="text-lg text-base-content/70 max-w-xl">
          Créez ou rejoignez des parties en temps réel, lancez vos dés et affrontez vos amis.
        </p>
        <a href="/register" className="btn btn-primary mt-6">Commencer</a>
      </div>
    )
  }
  