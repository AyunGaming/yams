# 🔑 Système de Gestion des Tokens JWT

## Vue d'ensemble

Ce projet utilise un système complet de gestion des tokens JWT (JSON Web Token) pour sécuriser l'authentification des utilisateurs avec Supabase.

## Fonctionnalités

### 1. Stockage sécurisé des tokens
- **Token d'accès** : Stocké dans `localStorage` avec sa date d'expiration
- **Refresh token** : Stocké séparément pour renouveler l'accès
- Nettoyage automatique lors de la déconnexion

### 2. Rafraîchissement automatique
- Vérification toutes les minutes de l'état du token
- Rafraîchissement automatique avant expiration
- Gestion des erreurs avec déconnexion si nécessaire

### 3. Headers d'authentification
- Inclusion automatique du token dans les requêtes API
- Format : `Authorization: Bearer <token>`

## Fichiers principaux

### `src/lib/tokenManager.ts`
Gestionnaire central des tokens avec les méthodes :
- `setToken(accessToken, expiresIn)` - Stocke le token
- `getToken()` - Récupère le token
- `isTokenValid()` - Vérifie la validité
- `clearTokens()` - Supprime tous les tokens
- `getAuthHeaders()` - Retourne les headers avec le token

### `src/lib/apiClient.ts`
Client API qui ajoute automatiquement le token aux requêtes :
```typescript
import { api } from '@/lib/apiClient'

// Exemple d'utilisation
const { data, error } = await api.get('/api/mon-endpoint')
const { data, error } = await api.post('/api/create', { ... })
```

### `src/components/Providers.tsx`
Provider React qui :
- Initialise le client Supabase
- Gère l'état d'authentification
- Stocke automatiquement les tokens
- Rafraîchit le token périodiquement

### `src/components/TokenStatus.tsx`
Composant visuel affichant l'état du token dans le dashboard

## Utilisation

### Dans un composant React

```typescript
import { useSupabase } from '@/components/Providers'
import { tokenManager } from '@/lib/tokenManager'

function MonComposant() {
  const { supabase, user, accessToken } = useSupabase()
  
  // Le token est disponible dans le contexte
  console.log('Token actif:', accessToken)
  
  // Ou via le gestionnaire
  const token = tokenManager.getToken()
  const isValid = tokenManager.isTokenValid()
}
```

### Pour les requêtes API personnalisées

```typescript
import { api } from '@/lib/apiClient'

async function fetchData() {
  const { data, error } = await api.get('/api/games')
  
  if (error) {
    console.error('Erreur:', error)
    return
  }
  
  console.log('Données:', data)
}
```

## Flux d'authentification

1. **Connexion** (`/login`)
   - L'utilisateur se connecte avec email/mot de passe
   - Supabase retourne un token JWT
   - Le token est automatiquement stocké
   - Logs dans la console pour debug

2. **Session active**
   - Le token est vérifié toutes les minutes
   - Rafraîchissement automatique si proche de l'expiration
   - Affichage de l'état dans le dashboard

3. **Déconnexion**
   - Suppression de tous les tokens du localStorage
   - Déconnexion Supabase
   - Redirection vers la page d'accueil

## Sécurité

- ✅ Tokens stockés uniquement côté client (localStorage)
- ✅ Vérification automatique de l'expiration
- ✅ Rafraîchissement proactif du token
- ✅ Nettoyage complet lors de la déconnexion
- ✅ Gestion des erreurs 401 (non autorisé)
- ✅ Logs détaillés pour le débogage

## Debug

Le système affiche des logs dans la console :
- 🔑 Token d'accès récupéré et stocké
- ✅ Token mis à jour
- ⏰ Token expiré, rafraîchissement...
- 🚪 Déconnexion - tokens supprimés

## Composants mis à jour

Tous les composants utilisent maintenant le nouveau système :
- ✅ `src/app/login/page.tsx` - Connexion avec token
- ✅ `src/app/dashboard/page.tsx` - Affiche le statut
- ✅ `src/components/Navbar.tsx` - Gère la déconnexion
- ✅ `src/app/game/[uuid]/page.tsx` - Utilise le contexte
- ✅ `src/components/auth/RegisterForm.tsx` - Utilise le contexte

## Exemple complet

```typescript
// 1. L'utilisateur se connecte
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// 2. Le token est automatiquement stocké par le Provider

// 3. Plus tard, faire une requête API
import { api } from '@/lib/apiClient'

const result = await api.post('/api/create-game', {
  name: 'Ma partie'
})

// 4. Le token est automatiquement inclus dans les headers

// 5. À la déconnexion
await supabase.auth.signOut()
// Les tokens sont automatiquement supprimés
```

## Avantages

- 🚀 **Automatique** : Pas besoin de gérer manuellement les tokens
- 🔒 **Sécurisé** : Gestion appropriée de l'expiration et du rafraîchissement
- 🎯 **Simple** : API claire et intuitive
- 📊 **Visible** : Composant de statut dans le dashboard
- 🐛 **Debuggable** : Logs détaillés dans la console
