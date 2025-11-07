# Étape 1: Installer les dépendances
FROM node:20-alpine AS deps
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances de production et de développement
RUN npm ci

# Étape 2: Builder l'application
FROM node:20-alpine AS builder
WORKDIR /app

# Copier les dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'environnement pour le build (optionnelles)
# Les vraies valeurs seront fournies au runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://ajyknlaeiegwoefgevmy.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqeWtubGFlaWVnd29lZmdldm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4Nzc4NjgsImV4cCI6MjA3NTQ1Mzg2OH0.0LyP_D4W0ds7SJ4fdXLsDhzlChkLcQ_dJb1poTfParg
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqeWtubGFlaWVnd29lZmdldm15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg3Nzg2OCwiZXhwIjoyMDc1NDUzODY4fQ.AfJZWMQV22JN8MabalOqjwmbyumATSJPuH8CZ_LSIpc

# Builder l'application Next.js
RUN npm run build

# Étape 3: Image de production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copier le build Next.js standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copier le serveur compilé et ses dépendances
# Copier le serveur TypeScript et ses dépendances
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# Copier node_modules (inclut toutes les dépendances nécessaires)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Utiliser l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Démarrer l'application avec le serveur custom
CMD ["node", "server.js"]

