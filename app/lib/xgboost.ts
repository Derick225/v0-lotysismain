/**
 * Implémentation XGBoost simplifiée pour les prédictions de loterie
 * Utilise une approche basée sur les gradients pour optimiser les prédictions
 */

export interface XGBoostConfig {
  maxDepth: number
  learningRate: number
  nEstimators: number
  subsample: number
  colsampleBytree: number
  regularization: {
    alpha: number // L1
    lambda: number // L2
  }
}

export interface FeatureImportance {
  feature: string
  importance: number
  gain: number
  cover: number
}

export interface XGBoostPrediction {
  predictions: number[]
  probabilities: number[][]
  featureImportance: FeatureImportance[]
  confidence: number
}

export class XGBoostModel {
  private config: XGBoostConfig
  private trees: any[] = []
  private featureNames: string[] = []
  private trained = false

  constructor(config: Partial<XGBoostConfig> = {}) {
    this.config = {
      maxDepth: config.maxDepth || 6,
      learningRate: config.learningRate || 0.1,
      nEstimators: config.nEstimators || 100,
      subsample: config.subsample || 0.8,
      colsampleBytree: config.colsampleBytree || 0.8,
      regularization: {
        alpha: config.regularization?.alpha || 0.01,
        lambda: config.regularization?.lambda || 1.0
      }
    }
  }

  /**
   * Entraîner le modèle XGBoost avec les données de loterie
   */
  async train(
    features: number[][],
    targets: number[][],
    featureNames: string[] = []
  ): Promise<void> {
    this.featureNames = featureNames.length > 0 ? featureNames : 
      Array.from({ length: features[0].length }, (_, i) => `feature_${i}`)

    console.log(`Début entraînement XGBoost avec ${features.length} échantillons`)
    
    // Simulation d'entraînement progressif
    for (let iteration = 0; iteration < this.config.nEstimators; iteration++) {
      const tree = this.buildTree(features, targets, iteration)
      this.trees.push(tree)
      
      if (iteration % 10 === 0) {
        console.log(`Iteration ${iteration}/${this.config.nEstimators}`)
      }
    }

    this.trained = true
    console.log('Entraînement XGBoost terminé')
  }

  /**
   * Construire un arbre de décision pour l'itération donnée
   */
  private buildTree(features: number[][], targets: number[][], iteration: number): any {
    // Simulation simplifiée d'un arbre de décision
    const sampleIndices = this.sampleData(features.length)
    const featureIndices = this.sampleFeatures(features[0].length)
    
    return {
      iteration,
      sampleIndices,
      featureIndices,
      splits: this.findBestSplits(features, targets, sampleIndices, featureIndices),
      leafValues: this.calculateLeafValues(targets, sampleIndices)
    }
  }

  /**
   * Échantillonnage des données (subsample)
   */
  private sampleData(dataSize: number): number[] {
    const sampleSize = Math.floor(dataSize * this.config.subsample)
    const indices: number[] = []
    
    for (let i = 0; i < sampleSize; i++) {
      indices.push(Math.floor(Math.random() * dataSize))
    }
    
    return indices
  }

  /**
   * Échantillonnage des features (colsample_bytree)
   */
  private sampleFeatures(featureCount: number): number[] {
    const sampleSize = Math.floor(featureCount * this.config.colsampleBytree)
    const indices: number[] = []
    
    for (let i = 0; i < sampleSize; i++) {
      indices.push(Math.floor(Math.random() * featureCount))
    }
    
    return [...new Set(indices)] // Supprimer les doublons
  }

  /**
   * Trouver les meilleurs splits pour l'arbre
   */
  private findBestSplits(
    features: number[][], 
    targets: number[][], 
    sampleIndices: number[], 
    featureIndices: number[]
  ): any[] {
    const splits: any[] = []
    
    for (const featureIdx of featureIndices) {
      const values = sampleIndices.map(i => features[i][featureIdx])
      const threshold = this.findOptimalThreshold(values, targets, sampleIndices)
      
      splits.push({
        featureIndex: featureIdx,
        threshold,
        gain: this.calculateGain(values, targets, threshold, sampleIndices)
      })
    }
    
    return splits.sort((a, b) => b.gain - a.gain).slice(0, this.config.maxDepth)
  }

  /**
   * Calculer les valeurs des feuilles
   */
  private calculateLeafValues(targets: number[][], sampleIndices: number[]): number[] {
    const leafValues: number[] = []
    
    for (let numPos = 1; numPos <= 90; numPos++) {
      let sum = 0
      let count = 0
      
      for (const idx of sampleIndices) {
        if (targets[idx].includes(numPos)) {
          sum += 1
          count++
        }
      }
      
      leafValues.push(count > 0 ? sum / count : 0)
    }
    
    return leafValues
  }

  /**
   * Trouver le seuil optimal pour un split
   */
  private findOptimalThreshold(values: number[], targets: number[][], sampleIndices: number[]): number {
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b)
    let bestThreshold = uniqueValues[0]
    let bestGain = -Infinity
    
    for (let i = 1; i < uniqueValues.length; i++) {
      const threshold = (uniqueValues[i-1] + uniqueValues[i]) / 2
      const gain = this.calculateGain(values, targets, threshold, sampleIndices)
      
      if (gain > bestGain) {
        bestGain = gain
        bestThreshold = threshold
      }
    }
    
    return bestThreshold
  }

  /**
   * Calculer le gain d'information pour un split
   */
  private calculateGain(values: number[], targets: number[][], threshold: number, sampleIndices: number[]): number {
    const leftIndices = sampleIndices.filter(i => values[i] <= threshold)
    const rightIndices = sampleIndices.filter(i => values[i] > threshold)
    
    if (leftIndices.length === 0 || rightIndices.length === 0) return 0
    
    const totalEntropy = this.calculateEntropy(targets, sampleIndices)
    const leftEntropy = this.calculateEntropy(targets, leftIndices)
    const rightEntropy = this.calculateEntropy(targets, rightIndices)
    
    const weightedEntropy = 
      (leftIndices.length / sampleIndices.length) * leftEntropy +
      (rightIndices.length / sampleIndices.length) * rightEntropy
    
    return totalEntropy - weightedEntropy
  }

  /**
   * Calculer l'entropie
   */
  private calculateEntropy(targets: number[][], indices: number[]): number {
    if (indices.length === 0) return 0
    
    const numberCounts: Record<number, number> = {}
    
    for (const idx of indices) {
      for (const num of targets[idx]) {
        numberCounts[num] = (numberCounts[num] || 0) + 1
      }
    }
    
    const total = Object.values(numberCounts).reduce((sum, count) => sum + count, 0)
    let entropy = 0
    
    for (const count of Object.values(numberCounts)) {
      if (count > 0) {
        const probability = count / total
        entropy -= probability * Math.log2(probability)
      }
    }
    
    return entropy
  }

  /**
   * Faire des prédictions avec le modèle entraîné
   */
  async predict(features: number[][]): Promise<XGBoostPrediction> {
    if (!this.trained) {
      throw new Error('Le modèle doit être entraîné avant de faire des prédictions')
    }

    const predictions: number[] = []
    const probabilities: number[][] = []
    
    for (const featureRow of features) {
      const scores = new Array(90).fill(0)
      
      // Aggréger les prédictions de tous les arbres
      for (const tree of this.trees) {
        const treeScores = this.predictWithTree(featureRow, tree)
        for (let i = 0; i < 90; i++) {
          scores[i] += this.config.learningRate * treeScores[i]
        }
      }
      
      // Appliquer la fonction sigmoïde pour obtenir des probabilités
      const probs = scores.map(score => 1 / (1 + Math.exp(-score)))
      
      // Sélectionner les 5 numéros avec les plus hautes probabilités
      const topIndices = probs
        .map((prob, index) => ({ prob, index: index + 1 }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 5)
        .map(item => item.index)
      
      predictions.push(...topIndices)
      probabilities.push(probs)
    }

    const featureImportance = this.calculateFeatureImportance()
    const confidence = this.calculateConfidence(probabilities)

    return {
      predictions: predictions.slice(0, 5), // Prendre seulement les 5 premiers
      probabilities,
      featureImportance,
      confidence
    }
  }

  /**
   * Prédiction avec un arbre spécifique
   */
  private predictWithTree(features: number[], tree: any): number[] {
    const scores = new Array(90).fill(0)
    
    // Parcourir les splits de l'arbre
    for (const split of tree.splits) {
      const featureValue = features[split.featureIndex]
      const weight = featureValue <= split.threshold ? 1 : -1
      
      // Appliquer le poids avec régularisation
      const regularizedWeight = weight / (1 + this.config.regularization.lambda)
      
      for (let i = 0; i < 90; i++) {
        scores[i] += regularizedWeight * tree.leafValues[i] * split.gain
      }
    }
    
    return scores
  }

  /**
   * Calculer l'importance des features
   */
  private calculateFeatureImportance(): FeatureImportance[] {
    const importance: Record<string, { gain: number; cover: number; frequency: number }> = {}
    
    // Initialiser l'importance pour toutes les features
    for (const featureName of this.featureNames) {
      importance[featureName] = { gain: 0, cover: 0, frequency: 0 }
    }
    
    // Aggréger l'importance de tous les arbres
    for (const tree of this.trees) {
      for (const split of tree.splits) {
        const featureName = this.featureNames[split.featureIndex]
        if (importance[featureName]) {
          importance[featureName].gain += split.gain
          importance[featureName].cover += 1
          importance[featureName].frequency += 1
        }
      }
    }
    
    // Normaliser et convertir en tableau
    const totalGain = Object.values(importance).reduce((sum, imp) => sum + imp.gain, 0)
    
    return Object.entries(importance).map(([feature, imp]) => ({
      feature,
      importance: totalGain > 0 ? imp.gain / totalGain : 0,
      gain: imp.gain,
      cover: imp.cover
    })).sort((a, b) => b.importance - a.importance)
  }

  /**
   * Calculer la confiance de la prédiction
   */
  private calculateConfidence(probabilities: number[][]): number {
    if (probabilities.length === 0) return 0
    
    // Calculer la confiance moyenne basée sur l'entropie des probabilités
    let totalEntropy = 0
    
    for (const probs of probabilities) {
      let entropy = 0
      for (const prob of probs) {
        if (prob > 0) {
          entropy -= prob * Math.log2(prob)
        }
      }
      totalEntropy += entropy
    }
    
    const avgEntropy = totalEntropy / probabilities.length
    const maxEntropy = Math.log2(90) // Entropie maximale pour 90 numéros
    
    // Convertir l'entropie en score de confiance (0-1)
    return Math.max(0, 1 - (avgEntropy / maxEntropy))
  }

  /**
   * Sauvegarder le modèle
   */
  async save(): Promise<string> {
    if (!this.trained) {
      throw new Error('Le modèle doit être entraîné avant d\'être sauvegardé')
    }

    const modelData = {
      config: this.config,
      trees: this.trees,
      featureNames: this.featureNames,
      trained: this.trained,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }

    return JSON.stringify(modelData)
  }

  /**
   * Charger un modèle sauvegardé
   */
  async load(modelData: string): Promise<void> {
    try {
      const data = JSON.parse(modelData)
      
      this.config = data.config
      this.trees = data.trees
      this.featureNames = data.featureNames
      this.trained = data.trained
      
      console.log('Modèle XGBoost chargé avec succès')
    } catch (error) {
      throw new Error(`Erreur lors du chargement du modèle: ${error}`)
    }
  }

  /**
   * Obtenir les métriques du modèle
   */
  getMetrics(): any {
    return {
      config: this.config,
      treeCount: this.trees.length,
      featureCount: this.featureNames.length,
      trained: this.trained,
      memoryUsage: JSON.stringify(this.trees).length + ' bytes'
    }
  }
}

export default XGBoostModel
