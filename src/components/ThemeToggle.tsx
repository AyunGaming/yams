'use client'
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (mounted && theme) {
      // Forcer l'application du thème sur l'élément html
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, mounted])
  
  if (!mounted) return null

  const toggleTheme = () => {
    const newTheme = theme === "yams-dark" ? "yams" : "yams-dark"
    setTheme(newTheme)
    // Forcer l'application immédiate
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={toggleTheme}
      title={theme === "yams-dark" ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      {theme === "yams-dark" ? "☀️" : "🌙"}
    </button>
  )
}