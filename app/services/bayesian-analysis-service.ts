"use client"

import { DrawResult } from "../lib/constants"
import logger from "../lib/logger"

interface BayesianPrior {
  alpha: number // Paramètre de forme (succès + 1)
  beta: number  // Paramètre de forme (échecs + 1)
  mean: number
  variance: number
}

interface BayesianPosterior {
  alpha: number
  beta: number
  mean: number
  variance: number
  credibleInterval: [number, number]
  probability: number
}

interface BayesianPrediction {
  numbers: number[]
  posteriors: BayesianPosterior[]
  confidence: number
  credibleInterval: [number, number]
  probabilityDistribution: { [key: number]: number }
  uncertaintyMeasures: {
    entropy: number
    variance: number
    standardDeviation: number
    coefficientOfVariation: number
  }
}

interface NumberFrequencyPrior {
  number: number
  prior: BayesianPrior
  observations: number
  successes: number
}

export class BayesianAnalysisService {
  private numberPriors: Map<number, NumberFrequencyPrior> = new Map()
  private globalPrior: BayesianPrior
  private confidenceLevel = 0.95

  constructor() {
    this.globalPrior = {
      alpha: 1,
      beta: 1,
      mean: 0.5,
      variance: 0.25
    }
    this.initializePriors()
  }

  // Initialiser les priors pour chaque numéro (1-90)
  private initializePriors(): void {
    for (let num = 1; num <= 90; num++) {
      // Prior non-informatif (Jeffrey's prior pour proportion)
      const prior: BayesianPrior = {
        alpha: 0.5,
        beta: 0.5,
        mean: 0.5,
        variance: 0.25
      }

      this.numberPriors.set(num, {
        number: num,
        prior,
        observations: 0,
        successes: 0
      })
    }

    logger.info("Priors bayésiens initialisés pour 90 numéros")
  }

  // Mettre à jour les priors avec de nouvelles données
  updatePriors(data: DrawResult[]): void {
    logger.info("Mise à jour des priors bayésiens", { dataSize: data.length })

    // Réinitialiser les compteurs
    for (const [num, prior] of this.numberPriors) {
      prior.observations = 0
      prior.successes = 0
    }

    // Compter les occurrences
    for (const result of data) {
      for (let num = 1; num <= 90; num++) {
        const priorData = this.numberPriors.get(num)!
        priorData.observations++
        
        if (result.gagnants.includes(num)) {
          priorData.successes++
        }
      }
    }

    // Mettre à jour les paramètres bayésiens
    for (const [num, priorData] of this.numberPriors) {
      const alpha = priorData.prior.alpha + priorData.successes
      const beta = priorData.prior.beta + (priorData.observations - priorData.successes)
      
      priorData.prior = {
        alpha,
        beta,
        mean: alpha / (alpha + beta),
        variance: (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
      }
    }
  }

  // Calculer la distribution postérieure pour un numéro
  calculatePosterior(
    number: number, 
    additionalSuccesses: number = 0, 
    additionalObservations: number = 0
  ): BayesianPosterior {
    const priorData = this.numberPriors.get(number)
    if (!priorData) {
      throw new Error(`Numéro ${number} non valide`)
    }

    const alpha = priorData.prior.alpha + additionalSuccesses
    const beta = priorData.prior.beta + (additionalObservations - additionalSuccesses)
    
    const mean = alpha / (alpha + beta)
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
    
    // Calculer l'intervalle de crédibilité
    const credibleInterval = this.calculateCredibleInterval(alpha, beta, this.confidenceLevel)
    
    return {
      alpha,
      beta,
      mean,
      variance,
      credibleInterval,
      probability: mean
    }
  }

  // Calculer l'intervalle de crédibilité pour une distribution Beta
  private calculateCredibleInterval(alpha: number, beta: number, level: number): [number, number] {
    const tail = (1 - level) / 2
    
    // Approximation pour les quantiles de la distribution Beta
    // Pour une implémentation plus précise, on pourrait utiliser une bibliothèque statistique
    const lower = this.betaQuantile(tail, alpha, beta)
    const upper = this.betaQuantile(1 - tail, alpha, beta)
    
    return [lower, upper]
  }

  // Approximation du quantile de la distribution Beta
  private betaQuantile(p: number, alpha: number, beta: number): number {
    // Approximation simple basée sur la transformation normale
    if (alpha > 1 && beta > 1) {
      const mean = alpha / (alpha + beta)
      const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1))
      const stdDev = Math.sqrt(variance)
      
      // Approximation normale
      const z = this.normalQuantile(p)
      let result = mean + z * stdDev
      
      // Contraindre entre 0 et 1
      return Math.max(0, Math.min(1, result))
    }
    
    // Pour les cas extrêmes, utiliser une approximation simple
    return p
  }

  // Approximation du quantile normal standard
  private normalQuantile(p: number): number {
    // Approximation de Beasley-Springer-Moro
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]

    if (p < 0.02425) {
      const q = Math.sqrt(-2 * Math.log(p))
      return (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1)
    }
    
    if (p > 0.97575) {
      const q = Math.sqrt(-2 * Math.log(1 - p))
      return -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1)
    }
    
    const q = p - 0.5
    const r = q * q
    return (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1)
  }

  // Générer une prédiction bayésienne
  generateBayesianPrediction(
    data: DrawResult[],
    contextualFactors: { [key: string]: number } = {}
  ): BayesianPrediction {
    logger.info("Génération d'une prédiction bayésienne")

    // Mettre à jour les priors avec les données récentes
    this.updatePriors(data)

    // Calculer les postérieurs pour chaque numéro
    const posteriors: BayesianPosterior[] = []
    const probabilityDistribution: { [key: number]: number } = {}

    for (let num = 1; num <= 90; num++) {
      const posterior = this.calculatePosterior(num)
      posteriors.push(posterior)
      probabilityDistribution[num] = posterior.probability
    }

    // Ajuster les probabilités avec les facteurs contextuels
    this.adjustProbabilitiesWithContext(probabilityDistribution, contextualFactors)

    // Sélectionner les 5 numéros les plus probables
    const sortedNumbers = Object.entries(probabilityDistribution)
      .map(([num, prob]) => ({ number: parseInt(num), probability: prob }))
      .sort((a, b) => b.probability - a.probability)

    const selectedNumbers = sortedNumbers.slice(0, 5).map(item => item.number)
    const selectedPosteriors = selectedNumbers.map(num => 
      posteriors.find(p => posteriors.indexOf(p) === num - 1)!
    )

    // Calculer la confiance globale
    const confidence = this.calculateGlobalConfidence(selectedPosteriors)

    // Calculer l'intervalle de crédibilité global
    const credibleInterval = this.calculateGlobalCredibleInterval(selectedPosteriors)

    // Calculer les mesures d'incertitude
    const uncertaintyMeasures = this.calculateUncertaintyMeasures(probabilityDistribution)

    return {
      numbers: selectedNumbers.sort((a, b) => a - b),
      posteriors: selectedPosteriors,
      confidence,
      credibleInterval,
      probabilityDistribution,
      uncertaintyMeasures
    }
  }

  // Ajuster les probabilités avec des facteurs contextuels
  private adjustProbabilitiesWithContext(
    probabilities: { [key: number]: number },
    contextualFactors: { [key: string]: number }
  ): void {
    // Facteur de tendance récente
    if (contextualFactors.recentTrend) {
      const trendFactor = 1 + (contextualFactors.recentTrend - 0.5) * 0.1
      for (let num = 1; num <= 90; num++) {
        probabilities[num] *= trendFactor
      }
    }

    // Facteur saisonnier
    if (contextualFactors.seasonalFactor) {
      const seasonalFactor = 1 + (contextualFactors.seasonalFactor - 0.5) * 0.05
      for (let num = 1; num <= 90; num++) {
        probabilities[num] *= seasonalFactor
      }
    }

    // Normaliser les probabilités
    const total = Object.values(probabilities).reduce((sum, prob) => sum + prob, 0)
    for (let num = 1; num <= 90; num++) {
      probabilities[num] /= total
    }
  }

  // Calculer la confiance globale
  private calculateGlobalConfidence(posteriors: BayesianPosterior[]): number {
    // Confiance basée sur la précision des postérieurs
    const avgVariance = posteriors.reduce((sum, p) => sum + p.variance, 0) / posteriors.length
    const confidence = Math.max(0, Math.min(1, 1 - avgVariance * 10))
    
    return confidence * 100
  }

  // Calculer l'intervalle de crédibilité global
  private calculateGlobalCredibleInterval(posteriors: BayesianPosterior[]): [number, number] {
    const lowerBounds = posteriors.map(p => p.credibleInterval[0])
    const upperBounds = posteriors.map(p => p.credibleInterval[1])
    
    const avgLower = lowerBounds.reduce((sum, val) => sum + val, 0) / lowerBounds.length
    const avgUpper = upperBounds.reduce((sum, val) => sum + val, 0) / upperBounds.length
    
    return [avgLower * 100, avgUpper * 100]
  }

  // Calculer les mesures d'incertitude
  private calculateUncertaintyMeasures(probabilities: { [key: number]: number }): {
    entropy: number
    variance: number
    standardDeviation: number
    coefficientOfVariation: number
  } {
    const probs = Object.values(probabilities)
    
    // Entropie de Shannon
    const entropy = -probs.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0)
    
    // Variance
    const mean = probs.reduce((sum, p) => sum + p, 0) / probs.length
    const variance = probs.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probs.length
    
    // Écart-type
    const standardDeviation = Math.sqrt(variance)
    
    // Coefficient de variation
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0
    
    return {
      entropy,
      variance,
      standardDeviation,
      coefficientOfVariation
    }
  }

  // Analyser la convergence des priors
  analyzePriorConvergence(): {
    converged: boolean
    convergenceScore: number
    unstableNumbers: number[]
    recommendations: string[]
  } {
    const convergenceThreshold = 0.01
    const unstableNumbers: number[] = []
    let totalVariance = 0

    for (const [num, priorData] of this.numberPriors) {
      if (priorData.prior.variance > convergenceThreshold) {
        unstableNumbers.push(num)
      }
      totalVariance += priorData.prior.variance
    }

    const avgVariance = totalVariance / this.numberPriors.size
    const convergenceScore = Math.max(0, 1 - avgVariance / convergenceThreshold)
    const converged = unstableNumbers.length < 10 && avgVariance < convergenceThreshold

    const recommendations: string[] = []
    if (!converged) {
      recommendations.push("Collecter plus de données pour améliorer la convergence")
      if (unstableNumbers.length > 20) {
        recommendations.push("Considérer des priors plus informatifs")
      }
      if (avgVariance > 0.05) {
        recommendations.push("Augmenter la période d'observation")
      }
    }

    return {
      converged,
      convergenceScore,
      unstableNumbers,
      recommendations
    }
  }

  // Obtenir les statistiques des priors
  getPriorStatistics(): {
    totalObservations: number
    averageSuccessRate: number
    mostFrequentNumbers: number[]
    leastFrequentNumbers: number[]
    priorSummary: { [key: number]: { mean: number; variance: number; observations: number } }
  } {
    let totalObservations = 0
    let totalSuccesses = 0
    const numberStats: { number: number; successRate: number; observations: number }[] = []
    const priorSummary: { [key: number]: { mean: number; variance: number; observations: number } } = {}

    for (const [num, priorData] of this.numberPriors) {
      totalObservations += priorData.observations
      totalSuccesses += priorData.successes
      
      const successRate = priorData.observations > 0 ? priorData.successes / priorData.observations : 0
      numberStats.push({ number: num, successRate, observations: priorData.observations })
      
      priorSummary[num] = {
        mean: priorData.prior.mean,
        variance: priorData.prior.variance,
        observations: priorData.observations
      }
    }

    numberStats.sort((a, b) => b.successRate - a.successRate)
    
    return {
      totalObservations,
      averageSuccessRate: totalObservations > 0 ? totalSuccesses / totalObservations : 0,
      mostFrequentNumbers: numberStats.slice(0, 10).map(s => s.number),
      leastFrequentNumbers: numberStats.slice(-10).map(s => s.number),
      priorSummary
    }
  }

  // Configurer le niveau de confiance
  setConfidenceLevel(level: number): void {
    if (level <= 0 || level >= 1) {
      throw new Error("Le niveau de confiance doit être entre 0 et 1")
    }
    this.confidenceLevel = level
    logger.info(`Niveau de confiance mis à jour: ${level * 100}%`)
  }

  // Réinitialiser les priors
  resetPriors(): void {
    this.initializePriors()
    logger.info("Priors bayésiens réinitialisés")
  }
}

export default BayesianAnalysisService
export type { BayesianPrior, BayesianPosterior, BayesianPrediction, NumberFrequencyPrior }
