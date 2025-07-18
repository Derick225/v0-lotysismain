// Web Worker pour les calculs d'apprentissage automatique
// Traite les tâches ML en arrière-plan pour éviter de bloquer l'UI

/**
 * Gestionnaire des messages du thread principal
 */
self.onmessage = function(event) {
  const { type, data } = event.data
  
  try {
    switch (type) {
      case 'incremental_training':
        handleIncrementalTraining(data)
        break
        
      case 'feature_extraction':
        handleFeatureExtraction(data)
        break
        
      case 'model_prediction':
        handleModelPrediction(data)
        break
        
      case 'hyperparameter_optimization':
        handleHyperparameterOptimization(data)
        break
        
      case 'model_evaluation':
        handleModelEvaluation(data)
        break
        
      default:
        postMessage({
          type: 'error',
          error: `Type de message non supporté: ${type}`
        })
    }
  } catch (error) {
    postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack
    })
  }
}

/**
 * Gérer l'entraînement incrémental
 */
function handleIncrementalTraining(data) {
  const { trainingData, models, hyperparameters } = data
  const startTime = Date.now()
  
  console.log(`🧠 Worker: Démarrage entraînement incrémental (${trainingData.length} échantillons)`)
  
  try {
    // Simuler l'entraînement incrémental
    const updatedModels = models.map(model => {
      const updatedModel = { ...model }
      
      // Simuler la mise à jour des poids du modèle
      const improvement = simulateModelUpdate(model, trainingData, hyperparameters)
      
      // Mettre à jour les métriques
      updatedModel.accuracy = Math.min(1.0, model.accuracy + improvement)
      updatedModel.trainingData.samples += trainingData.length
      updatedModel.trainingData.lastUpdate = new Date().toISOString()
      updatedModel.metadata.updatedAt = new Date().toISOString()
      updatedModel.metadata.trainingTime = Date.now() - startTime
      updatedModel.version = incrementVersion(model.version)
      
      // Simuler l'évaluation des performances
      updatedModel.performance = evaluateModelPerformance(updatedModel, trainingData)
      
      return updatedModel
    })
    
    postMessage({
      type: 'training_complete',
      data: {
        models: updatedModels,
        trainingTime: Date.now() - startTime,
        samplesProcessed: trainingData.length
      }
    })
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Erreur entraînement: ${error.message}`
    })
  }
}

/**
 * Gérer l'extraction de caractéristiques
 */
function handleFeatureExtraction(data) {
  const { rawData, extractionConfig } = data
  const startTime = Date.now()
  
  try {
    const features = extractFeatures(rawData, extractionConfig)
    
    postMessage({
      type: 'feature_extraction_complete',
      data: {
        features,
        processingTime: Date.now() - startTime,
        featureCount: features.length
      }
    })
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Erreur extraction caractéristiques: ${error.message}`
    })
  }
}

/**
 * Gérer les prédictions de modèle
 */
function handleModelPrediction(data) {
  const { model, features } = data
  const startTime = Date.now()
  
  try {
    const prediction = predictWithModel(model, features)
    
    postMessage({
      type: 'prediction_result',
      data: {
        prediction,
        modelId: model.id,
        processingTime: Date.now() - startTime
      }
    })
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Erreur prédiction: ${error.message}`
    })
  }
}

/**
 * Gérer l'optimisation des hyperparamètres
 */
function handleHyperparameterOptimization(data) {
  const { model, trainingData, searchSpace } = data
  const startTime = Date.now()
  
  try {
    const optimizedParams = optimizeHyperparameters(model, trainingData, searchSpace)
    
    postMessage({
      type: 'hyperparameter_optimization_complete',
      data: {
        optimizedParams,
        modelId: model.id,
        optimizationTime: Date.now() - startTime
      }
    })
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Erreur optimisation hyperparamètres: ${error.message}`
    })
  }
}

/**
 * Gérer l'évaluation de modèle
 */
function handleModelEvaluation(data) {
  const { model, testData } = data
  const startTime = Date.now()
  
  try {
    const evaluation = evaluateModel(model, testData)
    
    postMessage({
      type: 'model_evaluation_complete',
      data: {
        evaluation,
        modelId: model.id,
        evaluationTime: Date.now() - startTime
      }
    })
    
  } catch (error) {
    postMessage({
      type: 'error',
      error: `Erreur évaluation modèle: ${error.message}`
    })
  }
}

/**
 * Simuler la mise à jour d'un modèle
 */
function simulateModelUpdate(model, trainingData, hyperparameters) {
  // Simulation simplifiée de l'apprentissage
  const learningRate = hyperparameters.learningRate || 0.001
  const dataQuality = calculateDataQuality(trainingData)
  const modelComplexity = getModelComplexity(model)
  
  // Calculer l'amélioration basée sur plusieurs facteurs
  let improvement = learningRate * dataQuality * (1 / modelComplexity)
  
  // Ajouter du bruit pour simuler la variabilité
  improvement += (Math.random() - 0.5) * 0.01
  
  // Limiter l'amélioration pour éviter l'overfitting
  improvement = Math.max(-0.02, Math.min(0.05, improvement))
  
  return improvement
}

/**
 * Évaluer les performances d'un modèle
 */
function evaluateModelPerformance(model, trainingData) {
  // Simulation de l'évaluation des performances
  const baseAccuracy = model.accuracy
  const noise = (Math.random() - 0.5) * 0.1
  
  const precision = Math.max(0, Math.min(1, baseAccuracy + noise * 0.8))
  const recall = Math.max(0, Math.min(1, baseAccuracy + noise * 0.9))
  const f1Score = 2 * (precision * recall) / (precision + recall)
  
  // Matrice de confusion simulée
  const truePositives = Math.round(f1Score * 100)
  const falsePositives = Math.round((1 - precision) * 50)
  const falseNegatives = Math.round((1 - recall) * 50)
  const trueNegatives = 100 - truePositives - falsePositives - falseNegatives
  
  return {
    precision,
    recall,
    f1Score,
    confusionMatrix: [
      [trueNegatives, falsePositives],
      [falseNegatives, truePositives]
    ]
  }
}

/**
 * Extraire les caractéristiques des données brutes
 */
function extractFeatures(rawData, config) {
  const features = []
  
  rawData.forEach(sample => {
    const sampleFeatures = []
    
    // Caractéristiques temporelles
    if (config.temporal) {
      const date = new Date(sample.timestamp)
      sampleFeatures.push(
        date.getDay() / 6,
        date.getDate() / 31,
        date.getMonth() / 11,
        date.getHours() / 23
      )
    }
    
    // Caractéristiques numériques
    if (config.numerical && sample.numbers) {
      const numbers = sample.numbers.sort((a, b) => a - b)
      sampleFeatures.push(
        ...numbers,
        Math.max(...numbers) / 49,
        Math.min(...numbers) / 49,
        numbers.reduce((sum, n) => sum + n, 0) / (numbers.length * 49),
        calculateVariance(numbers) / 100
      )
    }
    
    // Caractéristiques statistiques
    if (config.statistical && sample.numbers) {
      const stats = calculateStatisticalFeatures(sample.numbers)
      sampleFeatures.push(...stats)
    }
    
    features.push(normalizeFeatures(sampleFeatures))
  })
  
  return features
}

/**
 * Prédire avec un modèle
 */
function predictWithModel(model, features) {
  // Simulation de prédiction basée sur le type de modèle
  switch (model.type) {
    case 'neural_network':
      return predictNeuralNetwork(model, features)
    case 'random_forest':
      return predictRandomForest(model, features)
    case 'gradient_boosting':
      return predictGradientBoosting(model, features)
    default:
      return predictDefault(model, features)
  }
}

/**
 * Prédiction avec réseau de neurones (simulé)
 */
function predictNeuralNetwork(model, features) {
  // Simulation simplifiée d'un réseau de neurones
  const weights = generateRandomWeights(features.length, 6)
  const predictions = []
  
  for (let i = 0; i < 6; i++) {
    let sum = 0
    for (let j = 0; j < features.length; j++) {
      sum += features[j] * weights[j][i]
    }
    // Activation sigmoid
    const activated = 1 / (1 + Math.exp(-sum))
    predictions.push(Math.round(activated * 48) + 1)
  }
  
  // Assurer l'unicité et trier
  const uniquePredictions = [...new Set(predictions)]
  while (uniquePredictions.length < 6) {
    const newNum = Math.floor(Math.random() * 49) + 1
    if (!uniquePredictions.includes(newNum)) {
      uniquePredictions.push(newNum)
    }
  }
  
  return {
    numbers: uniquePredictions.slice(0, 6).sort((a, b) => a - b),
    confidence: model.accuracy * (0.8 + Math.random() * 0.4),
    reasoning: [`Réseau de neurones ${model.name}`, `${features.length} caractéristiques`]
  }
}

/**
 * Prédiction avec forêt aléatoire (simulé)
 */
function predictRandomForest(model, features) {
  const trees = model.hyperparameters.nEstimators || 100
  const votes = new Map()
  
  // Simuler les votes de chaque arbre
  for (let t = 0; t < Math.min(trees, 20); t++) {
    const treeNumbers = generateRandomNumbers(6, 1, 49)
    treeNumbers.forEach(num => {
      votes.set(num, (votes.get(num) || 0) + 1)
    })
  }
  
  // Sélectionner les 6 numéros les plus votés
  const sortedVotes = Array.from(votes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([num]) => num)
    .sort((a, b) => a - b)
  
  return {
    numbers: sortedVotes,
    confidence: model.accuracy * (0.7 + Math.random() * 0.5),
    reasoning: [`Forêt aléatoire ${model.name}`, `${trees} arbres`]
  }
}

/**
 * Prédiction par défaut
 */
function predictDefault(model, features) {
  return {
    numbers: generateRandomNumbers(6, 1, 49),
    confidence: model.accuracy * (0.5 + Math.random() * 0.5),
    reasoning: [`Modèle ${model.name}`, 'Prédiction par défaut']
  }
}

/**
 * Optimiser les hyperparamètres
 */
function optimizeHyperparameters(model, trainingData, searchSpace) {
  // Simulation d'optimisation par recherche aléatoire
  let bestParams = { ...model.hyperparameters }
  let bestScore = model.accuracy
  
  const iterations = 20
  
  for (let i = 0; i < iterations; i++) {
    const candidateParams = {}
    
    // Générer des paramètres candidats
    Object.keys(searchSpace).forEach(param => {
      const space = searchSpace[param]
      if (space.type === 'float') {
        candidateParams[param] = space.min + Math.random() * (space.max - space.min)
      } else if (space.type === 'int') {
        candidateParams[param] = Math.floor(space.min + Math.random() * (space.max - space.min + 1))
      } else if (space.type === 'choice') {
        candidateParams[param] = space.choices[Math.floor(Math.random() * space.choices.length)]
      }
    })
    
    // Évaluer les paramètres candidats (simulation)
    const score = evaluateHyperparameters(candidateParams, trainingData)
    
    if (score > bestScore) {
      bestScore = score
      bestParams = { ...candidateParams }
    }
  }
  
  return bestParams
}

/**
 * Évaluer un modèle
 */
function evaluateModel(model, testData) {
  // Simulation d'évaluation croisée
  const folds = 5
  const scores = []
  
  for (let fold = 0; fold < folds; fold++) {
    // Simuler l'évaluation sur un fold
    const foldScore = model.accuracy + (Math.random() - 0.5) * 0.1
    scores.push(Math.max(0, Math.min(1, foldScore)))
  }
  
  const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const stdScore = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length)
  
  return {
    meanAccuracy: meanScore,
    stdAccuracy: stdScore,
    foldScores: scores,
    confidence: 1 - stdScore // Plus la variance est faible, plus on est confiant
  }
}

/**
 * Fonctions utilitaires
 */

function calculateDataQuality(trainingData) {
  // Simuler la qualité des données basée sur la cohérence
  const weights = trainingData.map(d => d.weight || 1)
  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length
  return Math.min(1, avgWeight)
}

function getModelComplexity(model) {
  // Estimer la complexité du modèle
  switch (model.type) {
    case 'neural_network':
      const layers = model.hyperparameters.hiddenLayers || [32]
      return layers.reduce((sum, size) => sum + size, 0) / 100
    case 'random_forest':
      return (model.hyperparameters.nEstimators || 100) / 200
    default:
      return 1
  }
}

function calculateVariance(numbers) {
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length
}

function calculateStatisticalFeatures(numbers) {
  const sorted = numbers.sort((a, b) => a - b)
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  const variance = calculateVariance(numbers)
  
  return [
    mean / 49, // Moyenne normalisée
    Math.sqrt(variance) / 49, // Écart-type normalisé
    (sorted[sorted.length - 1] - sorted[0]) / 49, // Étendue normalisée
    numbers.filter(n => n % 2 === 0).length / numbers.length, // Proportion de pairs
    countConsecutive(sorted) / numbers.length // Proportion de consécutifs
  ]
}

function countConsecutive(sortedNumbers) {
  let count = 0
  for (let i = 1; i < sortedNumbers.length; i++) {
    if (sortedNumbers[i] === sortedNumbers[i-1] + 1) count++
  }
  return count
}

function normalizeFeatures(features) {
  const min = Math.min(...features)
  const max = Math.max(...features)
  const range = max - min
  
  if (range === 0) return features.map(() => 0)
  
  return features.map(f => (f - min) / range)
}

function generateRandomWeights(inputSize, outputSize) {
  const weights = []
  for (let i = 0; i < inputSize; i++) {
    weights[i] = []
    for (let j = 0; j < outputSize; j++) {
      weights[i][j] = (Math.random() - 0.5) * 2 // Entre -1 et 1
    }
  }
  return weights
}

function generateRandomNumbers(count, min, max) {
  const numbers = []
  while (numbers.length < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min
    if (!numbers.includes(num)) {
      numbers.push(num)
    }
  }
  return numbers.sort((a, b) => a - b)
}

function evaluateHyperparameters(params, trainingData) {
  // Simulation d'évaluation des hyperparamètres
  let score = 0.3 + Math.random() * 0.4 // Score de base entre 0.3 et 0.7
  
  // Ajuster selon les paramètres
  if (params.learningRate) {
    // Pénaliser les taux d'apprentissage trop élevés ou trop faibles
    const lr = params.learningRate
    if (lr > 0.0001 && lr < 0.01) score += 0.05
    else score -= 0.02
  }
  
  return Math.max(0, Math.min(1, score))
}

function incrementVersion(version) {
  const parts = version.split('.')
  const patch = parseInt(parts[2] || '0') + 1
  return `${parts[0]}.${parts[1]}.${patch}`
}

console.log('🔧 Worker ML initialisé et prêt')
