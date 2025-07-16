# API de Récupération des Résultats de Loterie

## Vue d'ensemble

L'application Lotysis utilise une API hybride qui peut récupérer les vrais résultats de loterie depuis l'API externe de Lotobonheur.ci ou utiliser des données de test en cas d'indisponibilité.

## Endpoints

### GET /api/lottery-results

Récupère les résultats de loterie avec possibilité de filtrage.

#### Paramètres de requête

| Paramètre | Type | Description | Exemple |
|-----------|------|-------------|---------|
| `month` | string | Filtre par mois (format: "mois-année") | `mai-2025` |
| `draw` | string | Filtre par nom de tirage | `Reveil` |
| `real` | boolean | Utilise les vraies données (true) ou données de test (false) | `true` |

#### Exemples de requêtes

\`\`\`bash
# Récupérer tous les résultats avec vraies données
GET /api/lottery-results

# Récupérer les résultats du mois de mai 2025
GET /api/lottery-results?month=mai-2025

# Récupérer seulement les tirages "Reveil"
GET /api/lottery-results?draw=Reveil

# Forcer l'utilisation des données de test
GET /api/lottery-results?real=false
\`\`\`

#### Réponse

\`\`\`json
{
  "success": true,
  "data": [
    {
      "draw_name": "Reveil",
      "date": "2025-05-04",
      "gagnants": [12, 25, 34, 67, 89],
      "machine": [5, 18, 42, 73, 81]
    }
  ],
  "total": 1,
  "source": "api",
  "cached": true
}
\`\`\`

### POST /api/lottery-results

Ajoute un nouveau résultat de tirage (validation uniquement - sauvegarde non implémentée).

#### Corps de la requête

\`\`\`json
{
  "draw_name": "Reveil",
  "date": "2025-05-04",
  "gagnants": [12, 25, 34, 67, 89],
  "machine": [5, 18, 42, 73, 81]
}
\`\`\`

#### Validation

- `draw_name` : Obligatoire, doit être un nom de tirage valide
- `date` : Obligatoire, format YYYY-MM-DD
- `gagnants` : Obligatoire, exactement 5 numéros entre 1 et 90
- `machine` : Optionnel, si fourni, exactement 5 numéros entre 1 et 90

#### Réponse

\`\`\`json
{
  "success": true,
  "message": "Résultat validé avec succès (sauvegarde non implémentée)",
  "data": {
    "draw_name": "Reveil",
    "date": "2025-05-04",
    "gagnants": [12, 25, 34, 67, 89],
    "machine": [5, 18, 42, 73, 81]
  }
}
\`\`\`

## Planning des Tirages

L'API supporte les tirages suivants selon le planning officiel :

### Lundi
- **10H** : Reveil
- **13H** : Etoile
- **16H** : Akwaba
- **18H15** : Monday Special

### Mardi
- **10H** : La Matinale
- **13H** : Emergence
- **16H** : Sika
- **18H15** : Lucky Tuesday

### Mercredi
- **10H** : Premiere Heure
- **13H** : Fortune
- **16H** : Baraka
- **18H15** : Midweek

### Jeudi
- **10H** : Kado
- **13H** : Privilege
- **16H** : Monni
- **18H15** : Fortune Thursday

### Vendredi
- **10H** : Cash
- **13H** : Solution
- **16H** : Wari
- **18H15** : Friday Bonanza

### Samedi
- **10H** : Soutra
- **13H** : Diamant
- **16H** : Moaye
- **18H15** : National

### Dimanche
- **10H** : Benediction
- **13H** : Prestige
- **16H** : Awale
- **18H15** : Espoir

## Sources de Données

### API Externe (Lotobonheur.ci)

L'application tente de récupérer les données depuis l'API officielle :
- **URL** : `https://lotobonheur.ci/api/results`
- **Cache** : 5 minutes
- **Fallback** : Données de test en cas d'échec

### Données de Test

En cas d'indisponibilité de l'API externe, l'application génère automatiquement des données de test réalistes pour les 30 derniers jours.

## Configuration

### Variables d'environnement

\`\`\`env
# Optionnel - URL de l'API externe (par défaut: https://lotobonheur.ci/api/results)
EXTERNAL_API_URL=https://lotobonheur.ci/api/results

# Optionnel - Durée de cache en secondes (par défaut: 300)
CACHE_DURATION=300

# Optionnel - Timeout des requêtes en ms (par défaut: 10000)
REQUEST_TIMEOUT=10000
\`\`\`

### Headers de Requête

Les requêtes vers l'API externe utilisent les headers suivants :
- `User-Agent` : Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
- `Accept` : application/json
- `Referer` : https://lotobonheur.ci/resultats

## Gestion des Erreurs

### Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Données invalides (POST) |
| 404 | Aucun résultat trouvé |
| 500 | Erreur serveur |

### Réponse d'erreur

\`\`\`json
{
  "success": false,
  "error": "Description de l'erreur",
  "data": [],
  "total": 0,
  "source": "error"
}
\`\`\`

## Surveillance et Statut

L'application inclut un composant `APIStatus` qui :
- Vérifie la disponibilité de l'API externe
- Permet de basculer entre vraies données et données de test
- Affiche des statistiques en temps réel
- Surveille la santé de l'API

## Utilisation avec TensorFlow.js

Les données récupérées sont automatiquement formatées pour être compatibles avec les modèles de machine learning :

\`\`\`typescript
interface DrawResult {
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
}
\`\`\`

## Exemples d'intégration

### React Hook

\`\`\`typescript
import { useState, useEffect } from 'react'

export function useDrawData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/lottery-results')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data)
        }
      })
      .finally(() => setLoading(false))
  }, [])
  
  return { data, loading }
}
\`\`\`

### Fetch avec gestion d'erreur

\`\`\`typescript
async function fetchResults(options: {
  month?: string
  draw?: string
  useRealData?: boolean
}) {
  const params = new URLSearchParams()
  if (options.month) params.set('month', options.month)
  if (options.draw) params.set('draw', options.draw)
  if (options.useRealData === false) params.set('real', 'false')
  
  try {
    const response = await fetch(`/api/lottery-results?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error)
    }
    
    return result.data
  } catch (error) {
    console.error('Erreur lors de la récupération:', error)
    return []
  }
}
\`\`\`

## Recommandations

1. **Cache** : Utilisez un cache côté client pour éviter les requêtes répétées
2. **Fallback** : Prévoyez toujours un fallback vers les données de test
3. **Validation** : Validez les données côté client ET serveur
4. **Monitoring** : Surveillez la disponibilité de l'API externe
5. **Performance** : Limitez le nombre de requêtes simultanées

## Support

Pour toute question ou problème avec l'API, consultez les logs de l'application ou utilisez le composant de statut intégré dans l'interface administrateur.
