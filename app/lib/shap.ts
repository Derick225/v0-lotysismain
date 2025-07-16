/**
 * Implémentation SHAP (SHapley Additive exPlanations) simplifiée
 * Pour expliquer les prédictions des modèles de machine learning
 */

export interface ShapValue {
  feature: string
  value: number
  contribution: number
  baseValue: number
}

export interface ShapExplanation {
  prediction: number
  baseValue: number
  shapValues: ShapValue[]
  featureValues: Record<string, number>
  expectedValue: number
}

export interface ShapSummary {
  featureImportance: Array<{
    feature: string
    meanAbsShap: number
    positiveContribution: number
    negativeContribution: number
  }>
  globalExplanation: {
    topFeatures: string[]
    interactions: Array<{
      feature1: string
      feature2: string
      interaction: number
    }>
  }
}

export class ShapExplainer {
  private model: any
  private baselineData: number[][]
  private featureNames: string[]
  private expectedValue: number = 0

  constructor(model: any, baselineData: number[][], featureNames: string[]) {
    this.model = model
    this.baselineData = baselineData
    this.featureNames = featureNames
    this.calculateExpectedValue()
  }

  /**
   * Calculer la valeur attendue (baseline) du modèle
   */
  private calculateExpectedValue(): void {
    if (this.baselineData.length === 0) {
      this.expectedValue = 0
      return
    }

    // Simulation d'une prédiction moyenne sur les données de base
    let sum = 0
    for (const sample of this.baselineData) {
      // Prédiction simplifiée - dans un vrai cas, on utiliserait model.predict()
      const prediction = sample.reduce((acc, val) => acc + val, 0) / sample.length
      sum += prediction
    }
    
    this.expectedValue = sum / this.baselineData.length
  }

  /**
   * Expliquer une prédiction unique avec les valeurs SHAP
   */
  async explainInstance(
    instance: number[], 
    nSamples: number = 1000
  ): Promise<ShapExplanation> {
    console.log(`Calcul des valeurs SHAP pour ${this.featureNames.length} features`)
    
    const shapValues: ShapValue[] = []
    const featureValues: Record<string, number> = {}
    
    // Calculer la prédiction complète
    const fullPrediction = await this.predictInstance(instance)
    
    // Calculer les valeurs SHAP pour chaque feature
    for (let i = 0; i < instance.length; i++) {
      const featureName = this.featureNames[i] || `feature_${i}`
      const featureValue = instance[i]
      featureValues[featureName] = featureValue
      
      // Calculer la contribution SHAP de cette feature
      const shapValue = await this.calculateShapValue(instance, i, nSamples)
      
      shapValues.push({
        feature: featureName,
        value: featureValue,
        contribution: shapValue,
        baseValue: this.expectedValue
      })
    }
    
    return {
      prediction: fullPrediction,
      baseValue: this.expectedValue,
      shapValues: shapValues.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
      featureValues,
      expectedValue: this.expectedValue
    }
  }

  /**
   * Calculer la valeur SHAP d'une feature spécifique
   */
  private async calculateShapValue(
    instance: number[], 
    featureIndex: number, 
    nSamples: number
  ): Promise<number> {
    let totalContribution = 0
    
    // Méthode de Monte Carlo pour approximer la valeur SHAP
    for (let sample = 0; sample < nSamples; sample++) {
      // Créer un échantillon aléatoire de features à inclure
      const coalition = this.generateRandomCoalition(instance.length, featureIndex)
      
      // Calculer la contribution marginale
      const withFeature = await this.predictCoalition(instance, [...coalition, featureIndex])
      const withoutFeature = await this.predictCoalition(instance, coalition)
      
      totalContribution += (withFeature - withoutFeature)
    }
    
    return totalContribution / nSamples
  }

  /**
   * Générer une coalition aléatoire de features
   */
  private generateRandomCoalition(totalFeatures: number, excludeFeature: number): number[] {
    const coalition: number[] = []
    const coalitionSize = Math.floor(Math.random() * totalFeatures)
    
    const availableFeatures = Array.from({ length: totalFeatures }, (_, i) => i)
      .filter(i => i !== excludeFeature)
    
    for (let i = 0; i < coalitionSize && i < availableFeatures.length; i++) {
      const randomIndex = Math.floor(Math.random() * availableFeatures.length)
      coalition.push(availableFeatures.splice(randomIndex, 1)[0])
    }
    
    return coalition
  }

  /**
   * Prédire avec seulement certaines features (coalition)
   */
  private async predictCoalition(instance: number[], coalition: number[]): Promise<number> {
    // Créer une instance masquée où seules les features de la coalition sont utilisées
    const maskedInstance = instance.map((value, index) => {
      if (coalition.includes(index)) {
        return value
      } else {
        // Remplacer par la valeur moyenne de cette feature dans les données de base
        return this.getFeatureBaseline(index)
      }
    })
    
    return this.predictInstance(maskedInstance)
  }

  /**
   * Obtenir la valeur de base d'une feature
   */
  private getFeatureBaseline(featureIndex: number): number {
    if (this.baselineData.length === 0) return 0
    
    const values = this.baselineData.map(row => row[featureIndex]).filter(v => v !== undefined)
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  /**
   * Prédiction simplifiée pour une instance
   */
  private async predictInstance(instance: number[]): Promise<number> {
    // Dans un vrai cas, on utiliserait this.model.predict()
    // Ici, on simule une prédiction basée sur une combinaison linéaire
    let prediction = this.expectedValue
    
    for (let i = 0; i < instance.length; i++) {
      const weight = 0.1 + (i * 0.01) // Poids simulés
      prediction += instance[i] * weight
    }
    
    return Math.max(0, Math.min(1, prediction)) // Normaliser entre 0 et 1
  }

  /**
   * Calculer un résumé global des contributions SHAP
   */
  async calculateGlobalImportance(
    testData: number[][], 
    nSamples: number = 100
  ): Promise<ShapSummary> {
    console.log('Calcul de l\'importance globale SHAP...')
    
    const featureContributions: Record<string, number[]> = {}
    
    // Initialiser les contributions pour chaque feature
    for (const featureName of this.featureNames) {
      featureContributions[featureName] = []
    }
    
    // Calculer les valeurs SHAP pour un échantillon de données
    const sampleSize = Math.min(testData.length, nSamples)
    for (let i = 0; i < sampleSize; i++) {
      const explanation = await this.explainInstance(testData[i], 200)
      
      for (const shapValue of explanation.shapValues) {
        featureContributions[shapValue.feature].push(shapValue.contribution)
      }
      
      if (i % 10 === 0) {
        console.log(`Traité ${i}/${sampleSize} échantillons`)
      }
    }
    
    // Calculer les statistiques d'importance
    const featureImportance = Object.entries(featureContributions).map(([feature, contributions]) => {
      const meanAbsShap = contributions.reduce((sum, val) => sum + Math.abs(val), 0) / contributions.length
      const positiveContribution = contributions.filter(val => val > 0).reduce((sum, val) => sum + val, 0)
      const negativeContribution = contributions.filter(val => val < 0).reduce((sum, val) => sum + Math.abs(val), 0)
      
      return {
        feature,
        meanAbsShap,
        positiveContribution,
        negativeContribution
      }
    }).sort((a, b) => b.meanAbsShap - a.meanAbsShap)
    
    const topFeatures = featureImportance.slice(0, 10).map(item => item.feature)
    const interactions = this.calculateFeatureInteractions(featureContributions, topFeatures)
    
    return {
      featureImportance,
      globalExplanation: {
        topFeatures,
        interactions
      }
    }
  }

  /**
   * Calculer les interactions entre features
   */
  private calculateFeatureInteractions(
    contributions: Record<string, number[]>, 
    topFeatures: string[]
  ): Array<{ feature1: string; feature2: string; interaction: number }> {
    const interactions: Array<{ feature1: string; feature2: string; interaction: number }> = []
    
    // Calculer la corrélation entre les contributions des features
    for (let i = 0; i < topFeatures.length; i++) {
      for (let j = i + 1; j < topFeatures.length; j++) {
        const feature1 = topFeatures[i]
        const feature2 = topFeatures[j]
        
        const contrib1 = contributions[feature1] || []
        const contrib2 = contributions[feature2] || []
        
        if (contrib1.length > 0 && contrib2.length > 0) {
          const correlation = this.calculateCorrelation(contrib1, contrib2)
          
          interactions.push({
            feature1,
            feature2,
            interaction: Math.abs(correlation)
          })
        }
      }
    }
    
    return interactions.sort((a, b) => b.interaction - a.interaction).slice(0, 10)
  }

  /**
   * Calculer la corrélation entre deux séries de valeurs
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    if (n === 0) return 0
    
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let denomX = 0
    let denomY = 0
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      const dy = y[i] - meanY
      
      numerator += dx * dy
      denomX += dx * dx
      denomY += dy * dy
    }
    
    const denominator = Math.sqrt(denomX * denomY)
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Visualiser les valeurs SHAP sous forme de données pour graphique
   */
  prepareVisualizationData(explanation: ShapExplanation): any {
    const data = {
      waterfall: {
        features: explanation.shapValues.map(sv => sv.feature),
        contributions: explanation.shapValues.map(sv => sv.contribution),
        baseValue: explanation.baseValue,
        prediction: explanation.prediction
      },
      summary: {
        positiveFeatures: explanation.shapValues.filter(sv => sv.contribution > 0),
        negativeFeatures: explanation.shapValues.filter(sv => sv.contribution < 0)
      },
      forceplot: {
        expectedValue: explanation.expectedValue,
        shapValues: explanation.shapValues.map(sv => ({
          feature: sv.feature,
          value: sv.value,
          shap: sv.contribution
        }))
      }
    }
    
    return data
  }

  /**
   * Obtenir les métriques de performance de l'explainer
   */
  getMetrics(): any {
    return {
      baselineSize: this.baselineData.length,
      featureCount: this.featureNames.length,
      expectedValue: this.expectedValue,
      memoryUsage: JSON.stringify(this.baselineData).length + ' bytes'
    }
  }
}

export default ShapExplainer
