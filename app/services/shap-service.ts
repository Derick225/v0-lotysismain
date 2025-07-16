"use client"

import * as tf from "@tensorflow/tfjs"
import { DrawResult } from "../lib/constants"
import logger from "../lib/logger"

interface ShapValue {
  feature: string
  value: number
  contribution: number
  baseValue: number
  description: string
}

interface ShapExplanation {
  prediction: number[]
  baseValue: number
  shapValues: ShapValue[]
  expectedValue: number
  featureImportances: { [key: string]: number }
  summary: {
    topPositiveFeatures: ShapValue[]
    topNegativeFeatures: ShapValue[]
    totalContribution: number
  }
}

interface GlobalShapExplanation {
  featureImportances: { [key: string]: number }
  averageShapValues: { [key: string]: number }
  featureInteractions: { [key: string]: number }
  summary: {
    mostImportantFeatures: string[]
    leastImportantFeatures: string[]
    stabilityScore: number
  }
}

export class ShapService {
  private model: tf.LayersModel | null = null
  private featureNames: string[] = []
  private baselineData: number[][] = []
  private numSamples = 100 // Nombre d'échantillons pour l'approximation SHAP

  constructor() {
    this.initializeFeatureNames()
  }

  private initializeFeatureNames(): void {
    this.featureNames = [
      'freq_1_10', 'freq_11_20', 'freq_21_30', 'freq_31_40', 'freq_41_50',
      'freq_51_60', 'freq_61_70', 'freq_71_80', 'freq_81_90',
      'even_count', 'odd_count', 'even_odd_ratio',
      'sum_total', 'sum_normalized', 'variance', 'std_dev',
      'min_number', 'max_number', 'range_span',
      'avg_distance', 'min_distance', 'max_distance',
      'consecutive_count', 'gap_pattern',
      'day_of_week', 'week_of_month', 'month_trend',
      'pair_frequency', 'triplet_frequency',
      'recent_trend_5', 'recent_trend_10', 'recent_trend_20',
      'cyclical_pattern_7', 'cyclical_pattern_14', 'cyclical_pattern_30'
    ]
  }

  // Initialiser le service avec un modèle et des données de référence
  initialize(model: tf.LayersModel, baselineData: number[][]): void {
    this.model = model
    this.baselineData = baselineData
    logger.info("Service SHAP initialisé", { 
      featureCount: this.featureNames.length,
      baselineSize: baselineData.length 
    })
  }

  // Calculer les valeurs SHAP pour une prédiction spécifique
  async explainPrediction(
    inputFeatures: number[],
    targetNumbers: number[] = []
  ): Promise<ShapExplanation> {
    if (!this.model) {
      throw new Error("Le modèle n'est pas initialisé")
    }

    try {
      logger.info("Calcul des valeurs SHAP pour une prédiction")

      // Calculer la valeur de base (moyenne des prédictions sur les données de référence)
      const baseValue = await this.calculateBaseValue()

      // Calculer la prédiction actuelle
      const currentPrediction = await this.predict(inputFeatures)

      // Calculer les valeurs SHAP pour chaque caractéristique
      const shapValues = await this.calculateShapValues(inputFeatures, baseValue)

      // Analyser les contributions
      const summary = this.analyzeSummary(shapValues)

      // Calculer les importances des caractéristiques
      const featureImportances = this.calculateFeatureImportances(shapValues)

      return {
        prediction: Array.from(currentPrediction),
        baseValue,
        shapValues,
        expectedValue: baseValue,
        featureImportances,
        summary
      }

    } catch (error) {
      logger.error("Erreur lors du calcul des valeurs SHAP", error)
      throw error
    }
  }

  // Calculer les valeurs SHAP globales pour comprendre le modèle
  async explainModel(sampleData: number[][]): Promise<GlobalShapExplanation> {
    if (!this.model) {
      throw new Error("Le modèle n'est pas initialisé")
    }

    try {
      logger.info("Calcul de l'explication globale SHAP", { sampleSize: sampleData.length })

      const allShapValues: ShapValue[][] = []
      
      // Calculer les valeurs SHAP pour chaque échantillon
      for (let i = 0; i < Math.min(sampleData.length, 50); i++) {
        const explanation = await this.explainPrediction(sampleData[i])
        allShapValues.push(explanation.shapValues)
      }

      // Agréger les résultats
      const featureImportances = this.aggregateFeatureImportances(allShapValues)
      const averageShapValues = this.calculateAverageShapValues(allShapValues)
      const featureInteractions = this.calculateFeatureInteractions(allShapValues)
      const summary = this.analyzeGlobalSummary(featureImportances, averageShapValues)

      return {
        featureImportances,
        averageShapValues,
        featureInteractions,
        summary
      }

    } catch (error) {
      logger.error("Erreur lors de l'explication globale SHAP", error)
      throw error
    }
  }

  // Calculer la valeur de base du modèle
  private async calculateBaseValue(): Promise<number> {
    if (this.baselineData.length === 0) {
      return 0.5 // Valeur par défaut pour un problème de classification binaire
    }

    const predictions = []
    for (const sample of this.baselineData.slice(0, 20)) {
      const pred = await this.predict(sample)
      predictions.push(pred.reduce((sum, val) => sum + val, 0) / pred.length)
    }

    return predictions.reduce((sum, val) => sum + val, 0) / predictions.length
  }

  // Prédiction avec le modèle
  private async predict(features: number[]): Promise<number[]> {
    const inputTensor = tf.tensor2d([features])
    const prediction = this.model!.predict(inputTensor) as tf.Tensor
    const result = await prediction.data()
    
    inputTensor.dispose()
    prediction.dispose()
    
    return Array.from(result)
  }

  // Calculer les valeurs SHAP en utilisant l'approximation de Shapley
  private async calculateShapValues(
    inputFeatures: number[],
    baseValue: number
  ): Promise<ShapValue[]> {
    const shapValues: ShapValue[] = []

    for (let featureIndex = 0; featureIndex < inputFeatures.length; featureIndex++) {
      const contribution = await this.calculateFeatureContribution(
        inputFeatures,
        featureIndex,
        baseValue
      )

      shapValues.push({
        feature: this.featureNames[featureIndex] || `feature_${featureIndex}`,
        value: inputFeatures[featureIndex],
        contribution,
        baseValue,
        description: this.getFeatureDescription(this.featureNames[featureIndex])
      })
    }

    return shapValues
  }

  // Calculer la contribution d'une caractéristique spécifique
  private async calculateFeatureContribution(
    inputFeatures: number[],
    featureIndex: number,
    baseValue: number
  ): Promise<number> {
    let totalContribution = 0
    const numSamples = Math.min(this.numSamples, 20) // Limiter pour les performances

    for (let i = 0; i < numSamples; i++) {
      // Créer une coalition aléatoire de caractéristiques
      const coalition = this.generateRandomCoalition(inputFeatures.length, featureIndex)
      
      // Calculer la différence marginale
      const marginalContribution = await this.calculateMarginalContribution(
        inputFeatures,
        featureIndex,
        coalition
      )
      
      totalContribution += marginalContribution
    }

    return totalContribution / numSamples
  }

  // Générer une coalition aléatoire pour l'approximation de Shapley
  private generateRandomCoalition(numFeatures: number, targetFeature: number): boolean[] {
    const coalition = new Array(numFeatures).fill(false)
    
    // Inclure aléatoirement des caractéristiques (sauf la caractéristique cible)
    for (let i = 0; i < numFeatures; i++) {
      if (i !== targetFeature && Math.random() > 0.5) {
        coalition[i] = true
      }
    }
    
    return coalition
  }

  // Calculer la contribution marginale d'une caractéristique
  private async calculateMarginalContribution(
    inputFeatures: number[],
    featureIndex: number,
    coalition: boolean[]
  ): Promise<number> {
    // Créer les vecteurs avec et sans la caractéristique
    const withFeature = [...inputFeatures]
    const withoutFeature = [...inputFeatures]
    
    // Remplacer les caractéristiques non incluses par des valeurs de référence
    const referenceValues = this.getRandomReferenceValues()
    
    for (let i = 0; i < inputFeatures.length; i++) {
      if (!coalition[i] && i !== featureIndex) {
        withFeature[i] = referenceValues[i]
        withoutFeature[i] = referenceValues[i]
      }
    }
    
    // Remplacer la caractéristique cible dans le vecteur "sans"
    withoutFeature[featureIndex] = referenceValues[featureIndex]

    // Calculer les prédictions
    const predWith = await this.predict(withFeature)
    const predWithout = await this.predict(withoutFeature)

    // Retourner la différence moyenne
    const avgWith = predWith.reduce((sum, val) => sum + val, 0) / predWith.length
    const avgWithout = predWithout.reduce((sum, val) => sum + val, 0) / predWithout.length

    return avgWith - avgWithout
  }

  // Obtenir des valeurs de référence aléatoires
  private getRandomReferenceValues(): number[] {
    if (this.baselineData.length === 0) {
      return new Array(this.featureNames.length).fill(0)
    }

    const randomIndex = Math.floor(Math.random() * this.baselineData.length)
    return this.baselineData[randomIndex]
  }

  // Analyser le résumé des valeurs SHAP
  private analyzeSummary(shapValues: ShapValue[]): {
    topPositiveFeatures: ShapValue[]
    topNegativeFeatures: ShapValue[]
    totalContribution: number
  } {
    const sortedByContribution = [...shapValues].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    
    const positiveFeatures = shapValues
      .filter(sv => sv.contribution > 0)
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5)

    const negativeFeatures = shapValues
      .filter(sv => sv.contribution < 0)
      .sort((a, b) => a.contribution - b.contribution)
      .slice(0, 5)

    const totalContribution = shapValues.reduce((sum, sv) => sum + sv.contribution, 0)

    return {
      topPositiveFeatures: positiveFeatures,
      topNegativeFeatures: negativeFeatures,
      totalContribution
    }
  }

  // Calculer les importances des caractéristiques
  private calculateFeatureImportances(shapValues: ShapValue[]): { [key: string]: number } {
    const importances: { [key: string]: number } = {}
    
    for (const sv of shapValues) {
      importances[sv.feature] = Math.abs(sv.contribution)
    }

    return importances
  }

  // Agréger les importances des caractéristiques sur plusieurs échantillons
  private aggregateFeatureImportances(allShapValues: ShapValue[][]): { [key: string]: number } {
    const aggregated: { [key: string]: number[] } = {}

    for (const shapValues of allShapValues) {
      for (const sv of shapValues) {
        if (!aggregated[sv.feature]) {
          aggregated[sv.feature] = []
        }
        aggregated[sv.feature].push(Math.abs(sv.contribution))
      }
    }

    const result: { [key: string]: number } = {}
    for (const [feature, values] of Object.entries(aggregated)) {
      result[feature] = values.reduce((sum, val) => sum + val, 0) / values.length
    }

    return result
  }

  // Calculer les valeurs SHAP moyennes
  private calculateAverageShapValues(allShapValues: ShapValue[][]): { [key: string]: number } {
    const aggregated: { [key: string]: number[] } = {}

    for (const shapValues of allShapValues) {
      for (const sv of shapValues) {
        if (!aggregated[sv.feature]) {
          aggregated[sv.feature] = []
        }
        aggregated[sv.feature].push(sv.contribution)
      }
    }

    const result: { [key: string]: number } = {}
    for (const [feature, values] of Object.entries(aggregated)) {
      result[feature] = values.reduce((sum, val) => sum + val, 0) / values.length
    }

    return result
  }

  // Calculer les interactions entre caractéristiques (simplifié)
  private calculateFeatureInteractions(allShapValues: ShapValue[][]): { [key: string]: number } {
    const interactions: { [key: string]: number } = {}

    // Calculer les corrélations entre les contributions des caractéristiques
    for (let i = 0; i < this.featureNames.length; i++) {
      for (let j = i + 1; j < this.featureNames.length; j++) {
        const feature1 = this.featureNames[i]
        const feature2 = this.featureNames[j]
        
        const values1 = allShapValues.map(sv => sv[i]?.contribution || 0)
        const values2 = allShapValues.map(sv => sv[j]?.contribution || 0)
        
        const correlation = this.calculateCorrelation(values1, values2)
        interactions[`${feature1}_x_${feature2}`] = correlation
      }
    }

    return interactions
  }

  // Calculer la corrélation entre deux séries de valeurs
  private calculateCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length === 0) {
      return 0
    }

    const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length

    let numerator = 0
    let denominator1 = 0
    let denominator2 = 0

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1
      const diff2 = values2[i] - mean2
      
      numerator += diff1 * diff2
      denominator1 += diff1 * diff1
      denominator2 += diff2 * diff2
    }

    const denominator = Math.sqrt(denominator1 * denominator2)
    return denominator === 0 ? 0 : numerator / denominator
  }

  // Analyser le résumé global
  private analyzeGlobalSummary(
    featureImportances: { [key: string]: number },
    averageShapValues: { [key: string]: number }
  ): {
    mostImportantFeatures: string[]
    leastImportantFeatures: string[]
    stabilityScore: number
  } {
    const sortedFeatures = Object.entries(featureImportances)
      .sort(([, a], [, b]) => b - a)

    const mostImportant = sortedFeatures.slice(0, 5).map(([feature]) => feature)
    const leastImportant = sortedFeatures.slice(-5).map(([feature]) => feature)

    // Calculer un score de stabilité basé sur la variance des valeurs SHAP
    const shapVariances = Object.values(averageShapValues).map(val => Math.abs(val))
    const stabilityScore = 1 - (Math.max(...shapVariances) - Math.min(...shapVariances)) / Math.max(...shapVariances)

    return {
      mostImportantFeatures: mostImportant,
      leastImportantFeatures: leastImportant,
      stabilityScore: Math.max(0, Math.min(1, stabilityScore))
    }
  }

  // Obtenir la description d'une caractéristique
  private getFeatureDescription(featureName: string): string {
    const descriptions: { [key: string]: string } = {
      'freq_1_10': 'Fréquence des numéros 1-10 dans l\'historique',
      'freq_11_20': 'Fréquence des numéros 11-20 dans l\'historique',
      'even_count': 'Nombre de numéros pairs dans le tirage',
      'sum_total': 'Somme totale des 5 numéros',
      'avg_distance': 'Distance moyenne entre numéros consécutifs',
      'day_of_week': 'Jour de la semaine du tirage',
      'recent_trend_5': 'Tendance des 5 derniers tirages',
      'cyclical_pattern_7': 'Pattern cyclique sur 7 jours',
      // Ajouter d'autres descriptions selon les besoins
    }

    return descriptions[featureName] || `Caractéristique: ${featureName}`
  }

  // Nettoyer les ressources
  dispose(): void {
    this.model = null
    this.baselineData = []
    logger.info("Service SHAP nettoyé")
  }
}

export default ShapService
export type { ShapValue, ShapExplanation, GlobalShapExplanation }
