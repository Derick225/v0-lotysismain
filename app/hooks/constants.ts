// Interface pour les résultats de tirage
export interface DrawResult {
  id: number
  draw_name: string
  date: string
  gagnants: number[] // 5 numéros gagnants principaux
  machine?: number[] // 5 numéros machine (optionnels)
  created_at: string
  // Métadonnées additionnelles
  metadata?: {
    source?: 'api' | 'manual' | 'external'
    confidence?: number
    verified?: boolean
  }
}

// Planning des tirages par jour et heure
export const DRAW_SCHEDULE = {
  Lundi: {
    "10:00": "Reveil",
    "13:00": "Etoile",
    "16:00": "Akwaba",
    "18:15": "Monday Special",
  },
  Mardi: {
    "10:00": "La Matinale",
    "13:00": "Emergence",
    "16:00": "Sika",
    "18:15": "Lucky Tuesday",
  },
  Mercredi: {
    "10:00": "Premiere Heure",
    "13:00": "Fortune",
    "16:00": "Baraka",
    "18:15": "Midweek",
  },
  Jeudi: {
    "10:00": "Kado",
    "13:00": "Privilege",
    "16:00": "Monni",
    "18:15": "Fortune Thursday",
  },
  Vendredi: {
    "10:00": "Cash",
    "13:00": "Solution",
    "16:00": "Wari",
    "18:15": "Friday Bonanza",
  },
  Samedi: {
    "10:00": "Soutra",
    "13:00": "Diamant",
    "16:00": "Moaye",
    "18:15": "National",
  },
  Dimanche: {
    "10:00": "Benediction",
    "13:00": "Prestige",
    "16:00": "Awale",
    "18:15": "Espoir",
  },
}

// Noms de tirages valides
export const VALID_DRAW_NAMES = new Set([
  "Reveil",
  "Etoile",
  "Akwaba",
  "Monday Special",
  "La Matinale",
  "Emergence",
  "Sika",
  "Lucky Tuesday",
  "Premiere Heure",
  "Fortune",
  "Baraka",
  "Midweek",
  "Kado",
  "Privilege",
  "Monni",
  "Fortune Thursday",
  "Cash",
  "Solution",
  "Wari",
  "Friday Bonanza",
  "Soutra",
  "Diamant",
  "Moaye",
  "National",
  "Benediction",
  "Prestige",
  "Awale",
  "Espoir",
])

// Configuration des algorithmes de prédiction
export const PREDICTION_ALGORITHMS = {
  FREQUENCY: {
    name: "Analyse de fréquence",
    description: "Basé sur la fréquence d'apparition des numéros",
    weight: 0.3,
    color: "bg-blue-500",
  },
  PATTERN: {
    name: "Reconnaissance de motifs",
    description: "Détection de motifs dans les séquences",
    weight: 0.25,
    color: "bg-green-500",
  },
  LSTM: {
    name: "Réseau LSTM",
    description: "Réseau de neurones récurrents",
    weight: 0.25,
    color: "bg-purple-500",
  },
  STATISTICAL: {
    name: "Analyse statistique",
    description: "Modèles statistiques avancés",
    weight: 0.2,
    color: "bg-orange-500",
  },
  ENSEMBLE: {
    name: "Modèle d'ensemble",
    description: "Combinaison de plusieurs algorithmes",
    weight: 0.35,
    color: "bg-red-500",
  },
}

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  INVALID_NUMBER: "Le numéro doit être entre 1 et 90",
  DUPLICATE_NUMBER: "Ce numéro est déjà sélectionné",
  MAX_NUMBERS: "Nombre maximum de numéros atteint",
  INVALID_DATE: "Format de date invalide",
  INVALID_DRAW_NAME: "Nom de tirage invalide",
  NETWORK_ERROR: "Erreur de connexion réseau",
  DATABASE_ERROR: "Erreur de base de données",
  INSUFFICIENT_DATA: "Pas assez de données pour l'analyse",
  PREDICTION_FAILED: "Échec de la génération de prédiction",
}

// Configuration PWA
export const PWA_CONFIG = {
  name: "Lotysis - Analyseur de Loterie",
  short_name: "Lotysis",
  description: "Application d'analyse et de prédiction pour les tirages de loterie",
  theme_color: "#2563eb",
  background_color: "#ffffff",
  display: "standalone",
  orientation: "portrait",
  start_url: "/",
  scope: "/",
}

// Configuration des couleurs pour les numéros selon les spécifications exactes
export const NUMBER_COLOR_RANGES = [
  { min: 1, max: 9, class: "bg-white text-black border-2 border-gray-300", label: "1-9", color: "Blanc" },
  { min: 10, max: 19, class: "bg-pink-500 text-white", label: "10-19", color: "Rose" },
  { min: 20, max: 29, class: "bg-blue-900 text-white", label: "20-29", color: "Bleu foncé" },
  { min: 30, max: 39, class: "bg-green-400 text-black", label: "30-39", color: "Vert clair" },
  { min: 40, max: 49, class: "bg-purple-600 text-white", label: "40-49", color: "Violet" },
  { min: 50, max: 59, class: "bg-indigo-600 text-white", label: "50-59", color: "Indigo" },
  { min: 60, max: 69, class: "bg-yellow-400 text-black", label: "60-69", color: "Jaune" },
  { min: 70, max: 79, class: "bg-orange-500 text-white", label: "70-79", color: "Orange" },
  { min: 80, max: 90, class: "bg-red-600 text-white", label: "80-90", color: "Rouge" },
]

// Fonctions de validation
export function validateNumber(num: number): boolean {
  return Number.isInteger(num) && num >= 1 && num <= 90
}

export function validateNumbers(numbers: number[]): boolean {
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    return false
  }

  // Vérifier que tous les numéros sont valides
  if (!numbers.every(validateNumber)) {
    return false
  }

  // Vérifier qu'il n'y a pas de doublons
  const uniqueNumbers = new Set(numbers)
  return uniqueNumbers.size === 5
}

export function validateDate(dateString: string): boolean {
  if (!dateString || typeof dateString !== "string") {
    return false
  }

  // Vérifier le format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return false
  }

  // Vérifier que la date est valide
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && date.toISOString().split("T")[0] === dateString
}

export function validateDrawName(drawName: string): boolean {
  return typeof drawName === "string" && VALID_DRAW_NAMES.has(drawName)
}

// Fonction pour obtenir la couleur d'un numéro
export function getNumberColor(num: number): string {
  const range = NUMBER_COLOR_RANGES.find((r) => num >= r.min && num <= r.max)
  return range ? range.class : "bg-gray-400 text-white"
}

// Fonctions utilitaires pour les dates
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

export function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateString
  }
}

// Fonction pour calculer les statistiques de base
export function calculateBasicStats(results: DrawResult[]) {
  if (results.length === 0) {
    return {
      totalDraws: 0,
      uniqueNumbers: 0,
      mostFrequent: [],
      leastFrequent: [],
      averageSum: 0,
      numberDistribution: {},
      dateRange: null,
    }
  }

  const numberFrequency: Record<number, number> = {}
  let totalSum = 0

  // Analyser tous les résultats
  results.forEach((result) => {
    const sum = result.gagnants.reduce((acc, num) => acc + num, 0)
    totalSum += sum

    result.gagnants.forEach((num) => {
      numberFrequency[num] = (numberFrequency[num] || 0) + 1
    })
  })

  // Trier par fréquence
  const frequencyEntries = Object.entries(numberFrequency)
    .map(([num, freq]) => ({ number: Number.parseInt(num), frequency: freq }))
    .sort((a, b) => b.frequency - a.frequency)

  // Calculer la distribution par plage
  const distribution = NUMBER_COLOR_RANGES.reduce(
    (acc, range) => {
      acc[range.label] = 0
      return acc
    },
    {} as Record<string, number>,
  )

  Object.keys(numberFrequency).forEach((numStr) => {
    const num = Number.parseInt(numStr)
    const range = NUMBER_COLOR_RANGES.find((r) => num >= r.min && num <= r.max)
    if (range) {
      distribution[range.label] += numberFrequency[num]
    }
  })

  // Calculer la plage de dates
  const dates = results.map((r) => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime())
  const dateRange = dates.length > 0 ? { start: dates[0], end: dates[dates.length - 1] } : null

  return {
    totalDraws: results.length,
    uniqueNumbers: Object.keys(numberFrequency).length,
    mostFrequent: frequencyEntries.slice(0, 10),
    leastFrequent: frequencyEntries.slice(-10).reverse(),
    averageSum: Math.round(totalSum / results.length),
    numberDistribution: distribution,
    dateRange,
  }
}

// Fonction pour générer des prédictions simulées
export function generatePredictions(
  results: DrawResult[],
  drawName: string,
): {
  algorithm: string
  numbers: number[]
  confidence: number
  explanation: string
  color: string
}[] {
  const predictions = []
  const stats = calculateBasicStats(results.filter((r) => r.draw_name === drawName))

  // Prédiction basée sur la fréquence
  const frequentNumbers = stats.mostFrequent.map((f) => f.number).slice(0, 3)
  const randomNumbers = []
  while (randomNumbers.length < 2) {
    const num = Math.floor(Math.random() * 90) + 1
    if (!frequentNumbers.includes(num) && !randomNumbers.includes(num)) {
      randomNumbers.push(num)
    }
  }

  predictions.push({
    algorithm: PREDICTION_ALGORITHMS.FREQUENCY.name,
    numbers: [...frequentNumbers, ...randomNumbers].sort((a, b) => a - b),
    confidence: Math.floor(Math.random() * 20) + 65,
    explanation: PREDICTION_ALGORITHMS.FREQUENCY.description,
    color: PREDICTION_ALGORITHMS.FREQUENCY.color,
  })

  // Prédiction basée sur les motifs
  const patternNumbers = []
  while (patternNumbers.length < 5) {
    const num = Math.floor(Math.random() * 90) + 1
    if (!patternNumbers.includes(num)) {
      patternNumbers.push(num)
    }
  }

  predictions.push({
    algorithm: PREDICTION_ALGORITHMS.PATTERN.name,
    numbers: patternNumbers.sort((a, b) => a - b),
    confidence: Math.floor(Math.random() * 15) + 60,
    explanation: PREDICTION_ALGORITHMS.PATTERN.description,
    color: PREDICTION_ALGORITHMS.PATTERN.color,
  })

  // Prédiction LSTM
  const lstmNumbers = []
  while (lstmNumbers.length < 5) {
    const num = Math.floor(Math.random() * 90) + 1
    if (!lstmNumbers.includes(num)) {
      lstmNumbers.push(num)
    }
  }

  predictions.push({
    algorithm: PREDICTION_ALGORITHMS.LSTM.name,
    numbers: lstmNumbers.sort((a, b) => a - b),
    confidence: Math.floor(Math.random() * 25) + 70,
    explanation: PREDICTION_ALGORITHMS.LSTM.description,
    color: PREDICTION_ALGORITHMS.LSTM.color,
  })

  // Prédiction d'ensemble (la plus fiable)
  const ensembleNumbers = []
  const allPredicted = predictions.flatMap((p) => p.numbers)
  const numberCounts: Record<number, number> = {}

  allPredicted.forEach((num) => {
    numberCounts[num] = (numberCounts[num] || 0) + 1
  })

  // Prendre les numéros les plus prédits et compléter
  const sortedByCount = Object.entries(numberCounts)
    .map(([num, count]) => ({ num: Number.parseInt(num), count }))
    .sort((a, b) => b.count - a.count)

  sortedByCount.slice(0, 3).forEach((item) => ensembleNumbers.push(item.num))

  while (ensembleNumbers.length < 5) {
    const num = Math.floor(Math.random() * 90) + 1
    if (!ensembleNumbers.includes(num)) {
      ensembleNumbers.push(num)
    }
  }

  predictions.push({
    algorithm: PREDICTION_ALGORITHMS.ENSEMBLE.name,
    numbers: ensembleNumbers.sort((a, b) => a - b),
    confidence: Math.floor(Math.random() * 20) + 75,
    explanation: PREDICTION_ALGORITHMS.ENSEMBLE.description,
    color: PREDICTION_ALGORITHMS.ENSEMBLE.color,
  })

  return predictions
}

// Fonction pour calculer la précision d'une prédiction
export function calculatePredictionAccuracy(predicted: number[], actual: number[]): number {
  if (!predicted || !actual || predicted.length === 0 || actual.length === 0) {
    return 0
  }

  const matches = predicted.filter((num) => actual.includes(num)).length
  return Math.round((matches / predicted.length) * 100)
}

// Fonction pour obtenir les tendances
export function analyzeTrends(results: DrawResult[]): {
  hotNumbers: number[]
  coldNumbers: number[]
  recentTrend: "increasing" | "decreasing" | "stable"
  averageGap: number
} {
  if (results.length < 10) {
    return {
      hotNumbers: [],
      coldNumbers: [],
      recentTrend: "stable",
      averageGap: 0,
    }
  }

  const recent = results.slice(0, 10)
  const older = results.slice(10, 30)

  const recentFreq: Record<number, number> = {}
  const olderFreq: Record<number, number> = {}

  recent.forEach((result) => {
    result.gagnants.forEach((num) => {
      recentFreq[num] = (recentFreq[num] || 0) + 1
    })
  })

  older.forEach((result) => {
    result.gagnants.forEach((num) => {
      olderFreq[num] = (olderFreq[num] || 0) + 1
    })
  })

  // Numéros chauds (plus fréquents récemment)
  const hotNumbers = Object.entries(recentFreq)
    .filter(([num, freq]) => freq > (olderFreq[Number.parseInt(num)] || 0))
    .map(([num]) => Number.parseInt(num))
    .slice(0, 10)

  // Numéros froids (moins fréquents récemment)
  const coldNumbers = Object.entries(olderFreq)
    .filter(([num, freq]) => freq > (recentFreq[Number.parseInt(num)] || 0))
    .map(([num]) => Number.parseInt(num))
    .slice(0, 10)

  // Tendance générale
  const recentAvg = recent.reduce((sum, r) => sum + r.gagnants.reduce((s, n) => s + n, 0), 0) / recent.length
  const olderAvg = older.reduce((sum, r) => sum + r.gagnants.reduce((s, n) => s + n, 0), 0) / older.length

  let recentTrend: "increasing" | "decreasing" | "stable" = "stable"
  if (recentAvg > olderAvg + 5) recentTrend = "increasing"
  else if (recentAvg < olderAvg - 5) recentTrend = "decreasing"

  // Écart moyen entre les tirages
  const gaps = []
  for (let i = 1; i < results.length; i++) {
    const date1 = new Date(results[i - 1].date)
    const date2 = new Date(results[i].date)
    gaps.push(Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
  }

  const averageGap = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0

  return {
    hotNumbers,
    coldNumbers,
    recentTrend,
    averageGap: Math.round(averageGap * 10) / 10,
  }
}

// Constantes pour les limites
export const LIMITS = {
  MAX_RESULTS_PER_REQUEST: 1000,
  MAX_PREDICTIONS_PER_DRAW: 10,
  MAX_HISTORY_DAYS: 365,
  MIN_DATA_FOR_PREDICTION: 10,
  CACHE_DURATION_MINUTES: 5,
  MAX_RETRY_ATTEMPTS: 3,
  REQUEST_TIMEOUT_MS: 30000,
}

// Obtenir la couleur de base pour les graphiques selon les spécifications
export function getNumberBaseColor(number: number): string {
  if (number >= 1 && number <= 9) return '#ffffff' // 1-9: Blanc
  if (number >= 10 && number <= 19) return '#ec4899' // 10-19: Rose
  if (number >= 20 && number <= 29) return '#1e3a8a' // 20-29: Bleu foncé
  if (number >= 30 && number <= 39) return '#4ade80' // 30-39: Vert clair
  if (number >= 40 && number <= 49) return '#9333ea' // 40-49: Violet
  if (number >= 50 && number <= 59) return '#4f46e5' // 50-59: Indigo
  if (number >= 60 && number <= 69) return '#facc15' // 60-69: Jaune
  if (number >= 70 && number <= 79) return '#f97316' // 70-79: Orange
  if (number >= 80 && number <= 90) return '#dc2626' // 80-90: Rouge
  return '#6b7280' // Défaut
}

// Obtenir la plage de couleur d'un numéro
export function getNumberRange(number: number): string {
  if (number >= 1 && number <= 9) return '1-9'
  if (number >= 10 && number <= 19) return '10-19'
  if (number >= 20 && number <= 29) return '20-29'
  if (number >= 30 && number <= 39) return '30-39'
  if (number >= 40 && number <= 49) return '40-49'
  if (number >= 50 && number <= 59) return '50-59'
  if (number >= 60 && number <= 69) return '60-69'
  if (number >= 70 && number <= 79) return '70-79'
  if (number >= 80 && number <= 90) return '80-90'
  return 'invalid'
}

// Types pour l'export
export type DrawSchedule = typeof DRAW_SCHEDULE
export type PredictionAlgorithm = keyof typeof PREDICTION_ALGORITHMS
export type ErrorMessage = keyof typeof ERROR_MESSAGES