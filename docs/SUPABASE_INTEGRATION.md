# Intégration Supabase - Application PWA Lotysis

Ce document décrit l'intégration complète de Supabase dans l'application PWA de loterie Lotysis.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Configuration](#configuration)
3. [Schéma de base de données](#schéma-de-base-de-données)
4. [Synchronisation](#synchronisation)
5. [Sécurité](#sécurité)
6. [Tests](#tests)
7. [Déploiement](#déploiement)
8. [Dépannage](#dépannage)

## 🎯 Vue d'ensemble

L'intégration Supabase fournit :

- **Stockage centralisé** des données de loterie
- **Synchronisation temps réel** entre appareils
- **Mode hors ligne** avec cache IndexedDB
- **Sécurité avancée** avec Row Level Security (RLS)
- **Interface administrateur** complète
- **Tests automatisés** d'intégration

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend PWA  │◄──►│  Supabase API   │◄──►│   PostgreSQL    │
│                 │    │                 │    │                 │
│ - React/Next.js │    │ - REST API      │    │ - Tables        │
│ - IndexedDB     │    │ - Realtime      │    │ - RLS Policies  │
│ - Service Worker│    │ - Auth          │    │ - Functions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚙️ Configuration

### 1. Variables d'environnement

Copiez `.env.example` vers `.env.local` et configurez :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 2. Installation des dépendances

```bash
npm install @supabase/supabase-js
```

### 3. Configuration automatique

Exécutez le script de configuration :

```bash
# Configuration de base
node scripts/setup-supabase.js

# Avec données de test
node scripts/setup-supabase.js --with-test-data
```

## 🗄️ Schéma de base de données

### Tables principales

#### `lottery_results`
Stocke tous les résultats de tirages de loterie.

```sql
CREATE TABLE lottery_results (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    gagnants INTEGER[] NOT NULL CHECK (array_length(gagnants, 1) = 5),
    machine INTEGER[] CHECK (machine IS NULL OR array_length(machine, 1) = 5),
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_draw_date UNIQUE (draw_name, date)
);
```

#### `user_favorites`
Stocke les combinaisons favorites des utilisateurs.

```sql
CREATE TABLE user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    draw_name VARCHAR(100) NOT NULL,
    numbers INTEGER[] NOT NULL CHECK (array_length(numbers, 1) = 5),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `predictions`
Stocke les prédictions générées par les modèles ML.

```sql
CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    draw_name VARCHAR(100) NOT NULL,
    prediction_date DATE NOT NULL,
    predicted_numbers INTEGER[] NOT NULL CHECK (array_length(predicted_numbers, 1) = 5),
    algorithm VARCHAR(100) NOT NULL,
    confidence DECIMAL(5,2),
    actual_numbers INTEGER[],
    accuracy DECIMAL(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Vues sécurisées

#### `public_statistics`
Statistiques publiques sans données sensibles.

#### `recent_predictions_with_accuracy`
Prédictions récentes avec leur précision.

#### `active_ml_models`
Modèles ML actifs (sans données binaires).

## 🔄 Synchronisation

### Service de synchronisation

Le `SupabaseSyncService` gère :

- **Synchronisation bidirectionnelle** entre local et distant
- **Résolution de conflits** automatique
- **Subscriptions temps réel** pour les mises à jour
- **Mode hors ligne** avec cache IndexedDB

### Utilisation

```typescript
import { useSupabaseSync } from '@/hooks/use-supabase-sync'

function MyComponent() {
  const { 
    syncAll, 
    isSyncing, 
    lastSyncResult,
    connectionStatus 
  } = useSupabaseSync()

  const handleSync = async () => {
    await syncAll({ 
      direction: 'bidirectional',
      resolveConflicts: true 
    })
  }

  return (
    <button onClick={handleSync} disabled={isSyncing}>
      {isSyncing ? 'Synchronisation...' : 'Synchroniser'}
    </button>
  )
}
```

### Stratégies de résolution de conflits

1. **Mise à jour** : Le plus récent gagne
2. **Suppression** : Confirmer la suppression
3. **Insertion** : Merger si possible

## 🔒 Sécurité

### Row Level Security (RLS)

Toutes les tables utilisent RLS pour sécuriser l'accès :

#### Politiques pour `lottery_results`
- **Lecture** : Publique
- **Écriture** : Administrateurs uniquement

#### Politiques pour `user_favorites`
- **Lecture/Écriture** : Propriétaire uniquement
- **Lecture admin** : Administrateurs

#### Politiques pour `audit_logs`
- **Lecture** : Administrateurs + propriétaire des actions
- **Écriture** : Système uniquement

### Fonctions de sécurité

```sql
-- Vérifier si l'utilisateur est admin
CREATE FUNCTION is_admin() RETURNS BOOLEAN;

-- Vérifier si l'utilisateur est un service autorisé
CREATE FUNCTION is_service_role() RETURNS BOOLEAN;

-- Obtenir l'ID utilisateur actuel
CREATE FUNCTION current_user_id() RETURNS UUID;
```

## 🧪 Tests

### Tests d'intégration automatisés

Le `SupabaseTestService` vérifie :

1. **Connexion** : Test de base, authentification, accès tables
2. **CRUD** : Lecture, insertion, mise à jour, suppression
3. **Synchronisation** : Sync descendante, cache local, conflits
4. **Temps réel** : Subscriptions, notifications
5. **Sécurité** : Politiques RLS, validation données
6. **Performance** : Vitesse lecture/écriture, synchronisation

### Exécution des tests

```typescript
import { supabaseTestService } from '@/lib/supabase-test-service'

// Exécuter tous les tests
const results = await supabaseTestService.runAllTests()

// Générer un rapport
const report = supabaseTestService.generateReport(results)
```

### Interface de test

L'interface administrateur inclut un panneau de test complet :

- Exécution des tests en un clic
- Résultats détaillés par catégorie
- Téléchargement de rapports
- Statistiques de performance

## 🚀 Déploiement

### 1. Configuration Supabase

1. Créez un projet Supabase
2. Configurez les variables d'environnement
3. Exécutez les migrations
4. Configurez l'authentification (optionnel)

### 2. Déploiement de l'application

```bash
# Build de production
npm run build

# Déploiement (exemple Vercel)
vercel deploy
```

### 3. Configuration post-déploiement

1. Vérifiez les politiques RLS
2. Testez la synchronisation
3. Configurez les sauvegardes
4. Surveillez les performances

## 🔧 Dépannage

### Problèmes courants

#### Erreur de connexion
```
Error: Invalid API key
```
**Solution** : Vérifiez les variables d'environnement

#### Erreur RLS
```
Error: Row level security policy violation
```
**Solution** : Vérifiez les politiques et l'authentification

#### Erreur de synchronisation
```
Error: Sync conflict detected
```
**Solution** : Activez la résolution automatique de conflits

### Logs et monitoring

```typescript
// Activer les logs détaillés
localStorage.setItem('debug-supabase', 'true')

// Vérifier le statut de synchronisation
const status = await supabaseSyncService.getSyncStatus()
console.log('Sync status:', status)
```

### Outils de diagnostic

1. **Panneau de test Supabase** dans l'interface admin
2. **Statut de synchronisation** en temps réel
3. **Logs d'audit** pour traçabilité
4. **Métriques de performance** intégrées

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Guide RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [API JavaScript](https://supabase.com/docs/reference/javascript)
- [Realtime](https://supabase.com/docs/guides/realtime)

## 🤝 Contribution

Pour contribuer à l'intégration Supabase :

1. Testez vos modifications avec le panneau de test
2. Mettez à jour les migrations si nécessaire
3. Documentez les nouvelles fonctionnalités
4. Vérifiez la sécurité et les performances

---

**Note** : Cette intégration respecte les meilleures pratiques de sécurité et de performance. Toutes les données sensibles sont protégées par RLS et les opérations critiques nécessitent une authentification appropriée.
