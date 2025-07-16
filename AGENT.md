# AGENT.md - Guide de Configuration et Commandes

## Commandes Importantes

### Développement
```bash
# Démarrer le serveur de développement
pnpm dev

# Construire l'application
pnpm build

# Démarrer en production
pnpm start

# Linting
pnpm lint
```

### Base de données (Supabase)
```bash
# Voir le statut de Supabase
npx supabase status

# Réinitialiser la base de données
npx supabase db reset

# Générer les types TypeScript
npx supabase gen types typescript --local > lib/database.types.ts
```

### Tests
```bash
# Tests unitaires (à configurer)
npm test

# Tests end-to-end (à configurer)  
npm run e2e
```

## Structure du Projet

### Dossiers Principaux
- `app/` - Application Next.js (App Router)
  - `api/` - Routes API
  - `components/` - Composants React spécifiques à l'app
  - `lib/` - Utilitaires et services
  - `services/` - Services ML et IA
- `components/` - Composants UI réutilisables
- `lib/` - Bibliothèques partagées et configurations
- `public/` - Assets statiques
- `supabase/` - Configuration et migrations Supabase

### Composants Clés
- `favorites-menu.tsx` - Gestion des combinaisons favorites
- `co-occurrence-analysis.tsx` - Analyse des co-occurrences
- `interactive-visualizations.tsx` - Visualisations interactives
- `admin-panel.tsx` - Interface d'administration
- `tensorflow-loader.tsx` - Chargeur de modèles IA

### Services IA
- `ml-prediction-service.ts` - Service de prédictions ML
- `xgboost.ts` - Implémentation XGBoost
- `shap.ts` - Explications SHAP
- `compression-service.ts` - Compression de modèles

## Configuration

### Variables d'Environnement
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# API externe
EXTERNAL_API_URL=https://lotobonheur.ci/api/results
CACHE_DURATION=300
REQUEST_TIMEOUT=10000
```

### Base de Données
- **lottery_results** - Résultats des tirages
- **ml_models** - Modèles de machine learning
- **ml_predictions** - Prédictions générées
- **number_frequencies** - Fréquences des numéros
- **draw_statistics** - Statistiques par tirage

## Fonctionnalités

### Analyse de Loterie
- **28 tirages** supportés (4 par jour, 7 jours/semaine)
- **Codage couleur** des numéros par plages (1-9: blanc, 10-19: bleu, etc.)
- **Co-occurrences** dans même tirage et tirage suivant
- **Corrélations** entre numéros
- **Visualisations interactives** (barres, lignes, radar, heatmap)

### Intelligence Artificielle
- **LSTM** pour séquences temporelles
- **CNN** pour patterns visuels  
- **XGBoost** pour prédictions tabulaires
- **SHAP** pour explications
- **Compression GPU/CPU** des modèles
- **Ensemble methods** avec stacking

### Gestion des Données
- **API hybride** (données réelles + fallback)
- **Cache IndexedDB** pour mode hors ligne
- **Synchronisation automatique**
- **Import/export** CSV/JSON
- **Sauvegarde/restauration** complète

## Conventions de Code

### TypeScript
- Utiliser des types stricts, éviter `any`
- Interfaces pour les structures de données
- Types génériques pour la réutilisabilité

### React
- Hooks pour la gestion d'état
- Composants fonctionnels uniquement
- Mémoïsation avec `useMemo`/`useCallback`
- Props typées avec interfaces

### Styling
- **Tailwind CSS** pour les styles
- **Radix UI** pour les composants de base
- **Codage couleur** consistant pour les numéros
- **Design responsive** mobile-first

### Nommage
- **camelCase** pour variables/fonctions
- **PascalCase** pour composants/interfaces
- **kebab-case** pour fichiers
- **UPPER_CASE** pour constantes

## Debugging

### Logs
```bash
# Logs de l'API
tail -f .next/server.log

# Logs Supabase
npx supabase logs
```

### Erreurs Communes
1. **Import errors** - Vérifier les chemins relatifs vs absolus
2. **TypeScript errors** - S'assurer que tous les types sont définis
3. **Supabase errors** - Vérifier les permissions et variables d'env
4. **Build errors** - Nettoyer `.next/` et `node_modules/`

### Performance
- **Lazy loading** pour les composants lourds
- **Compression** des modèles ML
- **Cache** efficace avec IndexedDB
- **Mémoïsation** des calculs coûteux

## Déploiement

### Vercel (Recommandé)
```bash
# Installation Vercel CLI
npm i -g vercel

# Déploiement
vercel --prod
```

### Variables Requises
- Toutes les variables d'environnement Supabase
- URL de l'API externe
- Clés de configuration pour les services tiers

## Maintenance

### Mises à Jour
- **Dépendances** : Mettre à jour mensuellement
- **Types Supabase** : Régénérer après changements de schema
- **Modèles ML** : Réentraîner avec nouvelles données
- **Cache** : Nettoyer périodiquement les anciens modèles

### Monitoring
- **Statut API** via dashboard admin
- **Performance** des prédictions
- **Utilisation** des fonctionnalités
- **Erreurs** en temps réel

## Support

### Documentation
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [Radix UI](https://www.radix-ui.com/)

### Contacts
- **Développement** : Équipe technique
- **IA/ML** : Spécialiste data science
- **Design** : Équipe UX/UI
- **DevOps** : Infrastructure et déploiement
