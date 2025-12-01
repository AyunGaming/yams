type CacheEntry<T> = {
  value: T
  expiresAt: number
}

/**
 * Petit cache en mémoire avec TTL.
 * - Simple, sans dépendance externe.
 * - Process-local : un cache par instance de serveur.
 */
export class SimpleCache<T> {
  private store = new Map<string, CacheEntry<T>>()

  constructor(private defaultTtlMs: number) {}

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    const now = Date.now()
    if (entry.expiresAt <= now) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  set(key: string, value: T, ttlMs?: number): void {
    const now = Date.now()
    const effectiveTtl = ttlMs ?? this.defaultTtlMs

    this.store.set(key, {
      value,
      expiresAt: now + effectiveTtl,
    })
  }
}


