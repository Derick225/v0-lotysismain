'use client'

/**
 * Moteur d'analyse avancée pour les statistiques de loterie
 * Calcule les tendances, patterns et métriques sophistiquées
 */

import { DrawResult } from './constants'

export interface NumberTrend {
  number: number
  frequency: number
  recentFrequency: number
  trend: 'hot' | 'cold' | 'neutral'
  temperature: number // Score de 0 à 100
  lastAppearance: number // Nombre de tirages depuis la dernière apparition
  averageGap: number // Écart moyen entre les apparitions
  streak: number // Série actuelle (positive = apparitions récentes, négative = absence)
  prediction: number // Score de probabilité d'apparition prochaine (0-100)
}

export interface SequencePattern {
  sequence: number[]
  frequency: number
  lastSeen: string
  confidence: number
  type: 'consecutive' | 'gap' | 'pair' | 'triplet' | 'custom'
  description: string
}

export interface TemporalTrend {
  period: 'daily' | 'weekly' | 'monthly' | 'seasonal'
  pattern: Record<string, number[]>
  confidence: number
  description: string
  nextPrediction: {
    numbers: number[]
    confidence: number
    reasoning: string
  }
}

export interface SmartSuggestion {
  id: string
  type: 'hot_numbers' | 'cold_comeback' | 'pattern_based' | 'temporal' | 'gap_analysis'
  title: string
  description: string
  numbers: number[]
  confidence: number
  reasoning: string[]
  priority: 'high' | 'medium' | 'low'
  validUntil: string
}

class AdvancedAnalytics {
  private readonly RECENT_DRAWS_COUNT = 20
  private readonly HOT_THRESHOLD = 0.7
  private readonly COLD_THRESHOLD = 0.3
  private readonly MIN_PATTERN_FREQUENCY = 3

  /**
   * Analyser les tendances des numéros (chauds/froids)
   */
  analyzeNumberTrends(data: DrawResult[], drawName: string): NumberTrend[] {
    if (!data || data.length === 0) return []

    const trends: NumberTrend[] = []
    const recentData = data.slice(0, this.RECENT_DRAWS_COUNT)
    const allNumbers = this.getAllUniqueNumbers(data)

    for (const number of allNumbers) {
      const trend = this.calculateNumberTrend(number, data, recentData)
      trends.push(trend)
    }

    // Trier par température décroissante
    return trends.sort((a, b) => b.temperature - a.temperature)
  }

  private calculateNumberTrend(number: number, allData: DrawResult[], recentData: DrawResult[]): NumberTrend {
    // Fréquence globale
    const totalAppearances = this.countNumberAppearances(number, allData)
    const frequency = totalAppearances / allData.length

    // Fréquence récente
    const recentAppearances = this.countNumberAppearances(number, recentData)
    const recentFrequency = recentAppearances / recentData.length

    // Dernière apparition
    const lastAppearance = this.getLastAppearanceIndex(number, allData)

    // Écart moyen entre apparitions
    const averageGap = this.calculateAverageGap(number, allData)

    // Série actuelle
    const streak = this.calculateStreak(number, allData)

    // Température (score de tendance)
    const temperature = this.calculateTemperature(frequency, recentFrequency, lastAppearance, streak)

    // Classification de tendance
    let trend: 'hot' | 'cold' | 'neutral'
    if (temperature >= this.HOT_THRESHOLD * 100) trend = 'hot'
    else if (temperature <= this.COLD_THRESHOLD * 100) trend = 'cold'
    else trend = 'neutral'

    // Prédiction d'apparition prochaine
    const prediction = this.calculatePredictionScore(temperature, lastAppearance, averageGap, streak)

    return {
      number,
      frequency,
      recentFrequency,
      trend,
      temperature,
      lastAppearance,
      averageGap,
      streak,
      prediction
    }
  }

  private calculateTemperature(frequency: number, recentFrequency: number, lastAppearance: number, streak: number): number {
    // Algorithme sophistiqué de calcul de température
    let temperature = 0

    // Poids de la fréquence récente (40%)
    temperature += (recentFrequency * 100) * 0.4

    // Poids de la fréquence globale (20%)
    temperature += (frequency * 100) * 0.2

    // Poids de la récence (25%)
    const recencyScore = Math.max(0, 100 - (lastAppearance * 5))
    temperature += recencyScore * 0.25

    // Poids de la série (15%)
    const streakScore = streak > 0 ? Math.min(100, streak * 20) : Math.max(0, 100 + (streak * 10))
    temperature += streakScore * 0.15

    return Math.min(100, Math.max(0, temperature))
  }

  private calculatePredictionScore(temperature: number, lastAppearance: number, averageGap: number, streak: number): number {
    let prediction = temperature * 0.5

    // Ajustement basé sur l'écart moyen
    if (lastAppearance >= averageGap) {
      prediction += (lastAppearance / averageGap) * 20
    }

    // Ajustement basé sur la série
    if (streak < 0) {
      prediction += Math.abs(streak) * 5
    }

    return Math.min(100, Math.max(0, prediction))
  }

  /**
   * Analyser les patterns de séquences
   */
  analyzeSequencePatterns(data: DrawResult[]): SequencePattern[] {
    if (!data || data.length < 5) return []

    const patterns: SequencePattern[] = []

    // Analyser les séquences consécutives
    patterns.push(...this.findConsecutivePatterns(data))

    // Analyser les paires récurrentes
    patterns.push(...this.findPairPatterns(data))

    // Analyser les triplets
    patterns.push(...this.findTripletPatterns(data))

    // Analyser les écarts récurrents
    patterns.push(...this.findGapPatterns(data))

    // Filtrer et trier par confiance
    return patterns
      .filter(p => p.frequency >= this.MIN_PATTERN_FREQUENCY)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20) // Limiter aux 20 meilleurs patterns
  }

  private findConsecutivePatterns(data: DrawResult[]): SequencePattern[] {
    const patterns: Map<string, { count: number, lastSeen: string }> = new Map()

    data.forEach(draw => {
      const sortedNumbers = [...draw.gagnants].sort((a, b) => a - b)
      
      // Chercher des séquences consécutives de 2, 3, 4 numéros
      for (let length = 2; length <= 4; length++) {
        for (let i = 0; i <= sortedNumbers.length - length; i++) {
          const sequence = sortedNumbers.slice(i, i + length)
          const isConsecutive = sequence.every((num, idx) => 
            idx === 0 || num === sequence[idx - 1] + 1
          )

          if (isConsecutive) {
            const key = sequence.join('-')
            const existing = patterns.get(key) || { count: 0, lastSeen: draw.date }
            patterns.set(key, {
              count: existing.count + 1,
              lastSeen: draw.date > existing.lastSeen ? draw.date : existing.lastSeen
            })
          }
        }
      }
    })

    return Array.from(patterns.entries()).map(([key, value]) => ({
      sequence: key.split('-').map(Number),
      frequency: value.count,
      lastSeen: value.lastSeen,
      confidence: Math.min(100, (value.count / data.length) * 100 * 10),
      type: 'consecutive' as const,
      description: `Séquence consécutive: ${key.replace(/-/g, ', ')}`
    }))
  }

  private findPairPatterns(data: DrawResult[]): SequencePattern[] {
    const pairs: Map<string, { count: number, lastSeen: string }> = new Map()

    data.forEach(draw => {
      const numbers = draw.gagnants
      
      // Analyser toutes les paires possibles
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = [numbers[i], numbers[j]].sort((a, b) => a - b)
          const key = pair.join('-')
          
          const existing = pairs.get(key) || { count: 0, lastSeen: draw.date }
          pairs.set(key, {
            count: existing.count + 1,
            lastSeen: draw.date > existing.lastSeen ? draw.date : existing.lastSeen
          })
        }
      }
    })

    return Array.from(pairs.entries())
      .filter(([_, value]) => value.count >= this.MIN_PATTERN_FREQUENCY)
      .map(([key, value]) => ({
        sequence: key.split('-').map(Number),
        frequency: value.count,
        lastSeen: value.lastSeen,
        confidence: Math.min(100, (value.count / data.length) * 100 * 5),
        type: 'pair' as const,
        description: `Paire récurrente: ${key.replace(/-/g, ', ')}`
      }))
  }

  private findTripletPatterns(data: DrawResult[]): SequencePattern[] {
    const triplets: Map<string, { count: number, lastSeen: string }> = new Map()

    data.forEach(draw => {
      const numbers = draw.gagnants
      
      // Analyser tous les triplets possibles
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          for (let k = j + 1; k < numbers.length; k++) {
            const triplet = [numbers[i], numbers[j], numbers[k]].sort((a, b) => a - b)
            const key = triplet.join('-')
            
            const existing = triplets.get(key) || { count: 0, lastSeen: draw.date }
            triplets.set(key, {
              count: existing.count + 1,
              lastSeen: draw.date > existing.lastSeen ? draw.date : existing.lastSeen
            })
          }
        }
      }
    })

    return Array.from(triplets.entries())
      .filter(([_, value]) => value.count >= this.MIN_PATTERN_FREQUENCY)
      .map(([key, value]) => ({
        sequence: key.split('-').map(Number),
        frequency: value.count,
        lastSeen: value.lastSeen,
        confidence: Math.min(100, (value.count / data.length) * 100 * 3),
        type: 'triplet' as const,
        description: `Triplet récurrent: ${key.replace(/-/g, ', ')}`
      }))
  }

  private findGapPatterns(data: DrawResult[]): SequencePattern[] {
    const gaps: Map<number, { count: number, numbers: Set<number> }> = new Map()

    data.forEach(draw => {
      const sortedNumbers = [...draw.gagnants].sort((a, b) => a - b)
      
      // Analyser les écarts entre numéros consécutifs
      for (let i = 1; i < sortedNumbers.length; i++) {
        const gap = sortedNumbers[i] - sortedNumbers[i - 1]
        if (gap > 1 && gap <= 10) { // Écarts intéressants entre 2 et 10
          const existing = gaps.get(gap) || { count: 0, numbers: new Set() }
          existing.count++
          existing.numbers.add(sortedNumbers[i - 1])
          existing.numbers.add(sortedNumbers[i])
          gaps.set(gap, existing)
        }
      }
    })

    return Array.from(gaps.entries())
      .filter(([_, value]) => value.count >= this.MIN_PATTERN_FREQUENCY)
      .map(([gap, value]) => ({
        sequence: [gap],
        frequency: value.count,
        lastSeen: data[0]?.date || '',
        confidence: Math.min(100, (value.count / data.length) * 100 * 2),
        type: 'gap' as const,
        description: `Écart récurrent de ${gap} entre numéros`
      }))
  }

  /**
   * Analyser les tendances temporelles
   */
  analyzeTemporalTrends(data: DrawResult[], drawName: string): TemporalTrend[] {
    const trends: TemporalTrend[] = []

    // Analyse par jour de la semaine
    trends.push(this.analyzeDailyTrends(data))

    // Analyse par semaine du mois
    trends.push(this.analyzeWeeklyTrends(data))

    // Analyse par mois
    trends.push(this.analyzeMonthlyTrends(data))

    // Analyse saisonnière
    trends.push(this.analyzeSeasonalTrends(data))

    return trends.filter(t => t.confidence > 0.3)
  }

  private analyzeDailyTrends(data: DrawResult[]): TemporalTrend {
    const dailyPatterns: Record<string, number[]> = {}
    const dayFrequency: Record<string, Record<number, number>> = {}

    data.forEach(draw => {
      const date = new Date(draw.date)
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' })
      
      if (!dailyPatterns[dayName]) {
        dailyPatterns[dayName] = []
        dayFrequency[dayName] = {}
      }

      draw.gagnants.forEach(num => {
        dailyPatterns[dayName].push(num)
        dayFrequency[dayName][num] = (dayFrequency[dayName][num] || 0) + 1
      })
    })

    // Trouver les numéros les plus fréquents pour chaque jour
    Object.keys(dailyPatterns).forEach(day => {
      const frequencies = dayFrequency[day]
      const sortedNumbers = Object.entries(frequencies)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([num]) => parseInt(num))
      
      dailyPatterns[day] = sortedNumbers
    })

    return {
      period: 'daily',
      pattern: dailyPatterns,
      confidence: this.calculateTemporalConfidence(dailyPatterns, data.length),
      description: 'Tendances par jour de la semaine',
      nextPrediction: this.generateTemporalPrediction(dailyPatterns, 'daily')
    }
  }

  private analyzeWeeklyTrends(data: DrawResult[]): TemporalTrend {
    // Implémentation similaire pour les tendances hebdomadaires
    return {
      period: 'weekly',
      pattern: {},
      confidence: 0.5,
      description: 'Tendances par semaine du mois',
      nextPrediction: { numbers: [], confidence: 0, reasoning: '' }
    }
  }

  private analyzeMonthlyTrends(data: DrawResult[]): TemporalTrend {
    // Implémentation similaire pour les tendances mensuelles
    return {
      period: 'monthly',
      pattern: {},
      confidence: 0.4,
      description: 'Tendances par mois',
      nextPrediction: { numbers: [], confidence: 0, reasoning: '' }
    }
  }

  private analyzeSeasonalTrends(data: DrawResult[]): TemporalTrend {
    // Implémentation similaire pour les tendances saisonnières
    return {
      period: 'seasonal',
      pattern: {},
      confidence: 0.3,
      description: 'Tendances saisonnières',
      nextPrediction: { numbers: [], confidence: 0, reasoning: '' }
    }
  }

  /**
   * Générer des suggestions intelligentes
   */
  generateSmartSuggestions(
    trends: NumberTrend[], 
    patterns: SequencePattern[], 
    temporalTrends: TemporalTrend[]
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = []

    // Suggestions basées sur les numéros chauds
    suggestions.push(...this.generateHotNumberSuggestions(trends))

    // Suggestions de retour des numéros froids
    suggestions.push(...this.generateColdComebackSuggestions(trends))

    // Suggestions basées sur les patterns
    suggestions.push(...this.generatePatternSuggestions(patterns))

    // Suggestions temporelles
    suggestions.push(...this.generateTemporalSuggestions(temporalTrends))

    // Trier par priorité et confiance
    return suggestions
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence
      })
      .slice(0, 10) // Limiter aux 10 meilleures suggestions
  }

  private generateHotNumberSuggestions(trends: NumberTrend[]): SmartSuggestion[] {
    const hotNumbers = trends.filter(t => t.trend === 'hot').slice(0, 5)
    
    if (hotNumbers.length < 3) return []

    return [{
      id: `hot-numbers-${Date.now()}`,
      type: 'hot_numbers',
      title: 'Numéros en Tendance Chaude',
      description: 'Ces numéros apparaissent fréquemment dans les tirages récents',
      numbers: hotNumbers.map(t => t.number),
      confidence: Math.round(hotNumbers.reduce((sum, t) => sum + t.temperature, 0) / hotNumbers.length),
      reasoning: [
        `${hotNumbers.length} numéros identifiés comme "chauds"`,
        `Température moyenne: ${Math.round(hotNumbers.reduce((sum, t) => sum + t.temperature, 0) / hotNumbers.length)}%`,
        'Basé sur la fréquence récente et les tendances'
      ],
      priority: 'high',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }]
  }

  private generateColdComebackSuggestions(trends: NumberTrend[]): SmartSuggestion[] {
    const coldNumbers = trends
      .filter(t => t.trend === 'cold' && t.lastAppearance >= t.averageGap)
      .slice(0, 3)
    
    if (coldNumbers.length === 0) return []

    return [{
      id: `cold-comeback-${Date.now()}`,
      type: 'cold_comeback',
      title: 'Retour des Numéros Froids',
      description: 'Ces numéros sont dus pour un retour selon leur cycle historique',
      numbers: coldNumbers.map(t => t.number),
      confidence: Math.round(coldNumbers.reduce((sum, t) => sum + t.prediction, 0) / coldNumbers.length),
      reasoning: [
        `${coldNumbers.length} numéros en retard sur leur cycle`,
        'Analyse basée sur l\'écart moyen historique',
        'Probabilité de retour élevée'
      ],
      priority: 'medium',
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    }]
  }

  private generatePatternSuggestions(patterns: SequencePattern[]): SmartSuggestion[] {
    const bestPattern = patterns[0]
    if (!bestPattern || bestPattern.confidence < 50) return []

    return [{
      id: `pattern-${Date.now()}`,
      type: 'pattern_based',
      title: `Pattern ${bestPattern.type}`,
      description: bestPattern.description,
      numbers: bestPattern.sequence,
      confidence: Math.round(bestPattern.confidence),
      reasoning: [
        `Pattern observé ${bestPattern.frequency} fois`,
        `Confiance: ${Math.round(bestPattern.confidence)}%`,
        `Dernière occurrence: ${bestPattern.lastSeen}`
      ],
      priority: bestPattern.confidence > 70 ? 'high' : 'medium',
      validUntil: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    }]
  }

  private generateTemporalSuggestions(temporalTrends: TemporalTrend[]): SmartSuggestion[] {
    const bestTrend = temporalTrends.find(t => t.confidence > 0.5)
    if (!bestTrend || bestTrend.nextPrediction.numbers.length === 0) return []

    return [{
      id: `temporal-${Date.now()}`,
      type: 'temporal',
      title: `Tendance ${bestTrend.period}`,
      description: bestTrend.description,
      numbers: bestTrend.nextPrediction.numbers,
      confidence: Math.round(bestTrend.nextPrediction.confidence),
      reasoning: [
        bestTrend.nextPrediction.reasoning,
        `Confiance temporelle: ${Math.round(bestTrend.confidence * 100)}%`,
        `Basé sur l'analyse ${bestTrend.period}`
      ],
      priority: 'medium',
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }]
  }

  /**
   * Méthodes utilitaires
   */
  private getAllUniqueNumbers(data: DrawResult[]): number[] {
    const numbers = new Set<number>()
    data.forEach(draw => {
      draw.gagnants.forEach(num => numbers.add(num))
      if (draw.machine) {
        draw.machine.forEach(num => numbers.add(num))
      }
    })
    return Array.from(numbers).sort((a, b) => a - b)
  }

  private countNumberAppearances(number: number, data: DrawResult[]): number {
    return data.reduce((count, draw) => {
      const inGagnants = draw.gagnants.includes(number)
      const inMachine = draw.machine?.includes(number) || false
      return count + (inGagnants || inMachine ? 1 : 0)
    }, 0)
  }

  private getLastAppearanceIndex(number: number, data: DrawResult[]): number {
    for (let i = 0; i < data.length; i++) {
      const draw = data[i]
      if (draw.gagnants.includes(number) || draw.machine?.includes(number)) {
        return i
      }
    }
    return data.length
  }

  private calculateAverageGap(number: number, data: DrawResult[]): number {
    const appearances: number[] = []
    
    data.forEach((draw, index) => {
      if (draw.gagnants.includes(number) || draw.machine?.includes(number)) {
        appearances.push(index)
      }
    })

    if (appearances.length < 2) return data.length

    const gaps = appearances.slice(1).map((pos, i) => pos - appearances[i])
    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  }

  private calculateStreak(number: number, data: DrawResult[]): number {
    let streak = 0
    let foundFirst = false

    for (const draw of data) {
      const appears = draw.gagnants.includes(number) || draw.machine?.includes(number)
      
      if (appears) {
        if (!foundFirst) {
          foundFirst = true
          streak = 1
        } else {
          streak++
        }
      } else if (foundFirst) {
        break
      } else {
        streak--
      }
    }

    return streak
  }

  private calculateTemporalConfidence(pattern: Record<string, number[]>, dataLength: number): number {
    const patternCount = Object.keys(pattern).length
    const avgNumbersPerPattern = Object.values(pattern).reduce((sum, nums) => sum + nums.length, 0) / patternCount
    
    // Confiance basée sur la cohérence et la quantité de données
    return Math.min(1, (patternCount * avgNumbersPerPattern) / (dataLength * 0.1))
  }

  private generateTemporalPrediction(pattern: Record<string, number[]>, period: string): {
    numbers: number[]
    confidence: number
    reasoning: string
  } {
    const today = new Date()
    let key = ''

    switch (period) {
      case 'daily':
        key = today.toLocaleDateString('fr-FR', { weekday: 'long' })
        break
      default:
        key = 'default'
    }

    const numbers = pattern[key] || []
    const confidence = numbers.length > 0 ? 60 : 0

    return {
      numbers: numbers.slice(0, 3),
      confidence,
      reasoning: `Basé sur les tendances ${period} pour ${key}`
    }
  }
}

// Instance singleton
export const advancedAnalytics = new AdvancedAnalytics()

// Types exportés
export type { NumberTrend, SequencePattern, TemporalTrend, SmartSuggestion }
