"use client"

// Advanced RNN-LSTM Neural Network with Attention Mechanism for Lottery Prediction
// Implements temporal pattern recognition with configurable window size

import * as tf from "@tensorflow/tfjs"
import { DrawResult } from "../lib/constants"
import logger from "../lib/logger"

interface LSTMConfig {
  units: number
  layers: number
  dropout: number
  recurrentDropout: number
  temporalWindow: number
  attentionHeads: number
  bidirectional: boolean
  batchSize: number
  epochs: number
  learningRate: number
  optimizer: 'adam' | 'rmsprop' | 'sgd'
  activation: 'tanh' | 'relu' | 'sigmoid'
  recurrentActivation: 'hard_sigmoid' | 'sigmoid'
  returnSequences: boolean
  stateful: boolean
}

interface AttentionWeights {
  timesteps: number[]
  features: number[]
  heads: number[][][]
}

interface LSTMPrediction {
  numbers: number[]
  probabilities: number[]
  confidence: number
  attentionWeights: AttentionWeights
  metrics: {
    accuracy: number
    loss: number
    perplexity: number
    trainingTime: number
  }
}

export class RNNLSTMService {
  private lstmModel: tf.LayersModel | null = null
  private attentionModel: tf.LayersModel | null = null
  private isInitialized = false
  private config: LSTMConfig
  private featureScaler: { mean: number[]; std: number[] } | null = null
  private attentionWeights: AttentionWeights | null = null
  private drawTypeEmbeddings: Map<string, number[]> = new Map()
  private trainingHistory: {
    loss: number[]
    valLoss: number[]
    accuracy: number[]
    valAccuracy: number[]
  } = { loss: [], valLoss: [], accuracy: [], valAccuracy: [] }

  constructor(config?: Partial<LSTMConfig>) {
    this.config = {
      units: 128,
      layers: 3,
      dropout: 0.3,
      recurrentDropout: 0.2,
      temporalWindow: 30,
      attentionHeads: 8,
      bidirectional: true,
      batchSize: 32,
      epochs: 100,
      learningRate: 0.001,
      optimizer: 'adam',
      activation: 'tanh',
      recurrentActivation: 'hard_sigmoid',
      returnSequences: true,
      stateful: false,
      ...config
    }
    
    // Initialize draw type embeddings
    this.drawTypeEmbeddings.set('National', [1, 0, 0, 0, 0])
    this.drawTypeEmbeddings.set('Etoile', [0, 1, 0, 0, 0])
    this.drawTypeEmbeddings.set('Fortune', [0, 0, 1, 0, 0])
    this.drawTypeEmbeddings.set('Bonheur', [0, 0, 0, 1, 0])
    this.drawTypeEmbeddings.set('Special', [0, 0, 0, 0, 1])
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await tf.ready()
      this.isInitialized = true
      logger.info("RNN-LSTM Service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize RNN-LSTM Service:", error)
      throw error
    }
  }

  // Create LSTM model with attention mechanism
  private createLSTMModel(inputShape: [number, number, number]): tf.LayersModel {
    const [timesteps, features, _] = inputShape
    
    // Input layer
    const input = tf.input({shape: [timesteps, features]})
    
    // LSTM layers with bidirectional option
    let lstm = input
    for (let i = 0; i < this.config.layers; i++) {
      const isLastLayer = i === this.config.layers - 1
      const returnSeq = isLastLayer ? this.config.returnSequences : true
      
      if (this.config.bidirectional) {
        const forwardLSTM = tf.layers.lstm({
          units: this.config.units,
          returnSequences: returnSeq,
          dropout: this.config.dropout,
          recurrentDropout: this.config.recurrentDropout,
          activation: this.config.activation,
          recurrentActivation: this.config.recurrentActivation
        })
        
        const backwardLSTM = tf.layers.lstm({
          units: this.config.units,
          returnSequences: returnSeq,
          dropout: this.config.dropout,
          recurrentDropout: this.config.recurrentDropout,
          activation: this.config.activation,
          recurrentActivation: this.config.recurrentActivation,
          goBackwards: true
        })
        
        const bidirectional = tf.layers.bidirectional({
          layer: forwardLSTM,
          mergeMode: 'concat',
          backwardLayer: backwardLSTM
        })
        
        lstm = bidirectional.apply(lstm) as tf.SymbolicTensor
      } else {
        const lstmLayer = tf.layers.lstm({
          units: this.config.units,
          returnSequences: returnSeq,
          dropout: this.config.dropout,
          recurrentDropout: this.config.recurrentDropout,
          activation: this.config.activation,
          recurrentActivation: this.config.recurrentActivation
        })
        
        lstm = lstmLayer.apply(lstm) as tf.SymbolicTensor
      }
    }
    
    // Multi-head attention mechanism
    if (this.config.returnSequences) {
      const attentionHeads = []
      for (let i = 0; i < this.config.attentionHeads; i++) {
        // Query, Key, Value projections
        const query = tf.layers.dense({units: this.config.units, activation: 'linear'}).apply(lstm) as tf.SymbolicTensor
        const key = tf.layers.dense({units: this.config.units, activation: 'linear'}).apply(lstm) as tf.SymbolicTensor
        const value = tf.layers.dense({units: this.config.units, activation: 'linear'}).apply(lstm) as tf.SymbolicTensor
        
        // Scaled dot-product attention
        const scores = tf.layers.dot({axes: [2, 2]}).apply([query, key]) as tf.SymbolicTensor
        const scaledScores = tf.layers.lambda({
          outputShape: [timesteps, timesteps],
          function: (x: tf.Tensor) => tf.div(x, Math.sqrt(this.config.units))
        }).apply(scores) as tf.SymbolicTensor
        
        const attentionWeights = tf.layers.softmax().apply(scaledScores) as tf.SymbolicTensor
        const attentionOutput = tf.layers.dot({axes: [2, 1]}).apply([attentionWeights, value]) as tf.SymbolicTensor
        
        attentionHeads.push(attentionOutput)
      }
      
      // Concatenate attention heads
      let attentionOutput
      if (attentionHeads.length > 1) {
        attentionOutput = tf.layers.concatenate().apply(attentionHeads) as tf.SymbolicTensor
      } else {
        attentionOutput = attentionHeads[0]
      }
      
      // Project back to original dimension
      const projectedAttention = tf.layers.dense({
        units: this.config.bidirectional ? this.config.units * 2 : this.config.units,
        activation: 'linear'
      }).apply(attentionOutput) as tf.SymbolicTensor
      
      // Residual connection and layer normalization
      const attentionWithResidual = tf.layers.add().apply([lstm, projectedAttention]) as tf.SymbolicTensor
      lstm = tf.layers.layerNormalization().apply(attentionWithResidual) as tf.SymbolicTensor
      
      // Global attention pooling
      lstm = tf.layers.globalAveragePooling1d().apply(lstm) as tf.SymbolicTensor
    }
    
    // Dense layers for prediction
    let dense = tf.layers.dense({units: 256, activation: 'relu'}).apply(lstm) as tf.SymbolicTensor
    dense = tf.layers.dropout({rate: 0.3}).apply(dense) as tf.SymbolicTensor
    dense = tf.layers.dense({units: 128, activation: 'relu'}).apply(dense) as tf.SymbolicTensor
    dense = tf.layers.dropout({rate: 0.2}).apply(dense) as tf.SymbolicTensor
    
    // Output layer for lottery numbers (90 possible numbers)
    const output = tf.layers.dense({units: 90, activation: 'sigmoid'}).apply(dense) as tf.SymbolicTensor
    
    // Create and compile model
    const model = tf.model({inputs: input, outputs: output})
    
    const optimizer = this.getOptimizer()
    model.compile({
      optimizer,
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })
    
    return model
  }

  private getOptimizer(): tf.Optimizer {
    switch (this.config.optimizer) {
      case 'adam':
        return tf.train.adam(this.config.learningRate)
      case 'rmsprop':
        return tf.train.rmsprop(this.config.learningRate)
      case 'sgd':
        return tf.train.sgd(this.config.learningRate)
      default:
        return tf.train.adam(this.config.learningRate)
    }
  }

  // Preprocess data for LSTM model
  private preprocessData(data: DrawResult[], drawType: string): {
    sequences: tf.Tensor3d,
    targets: tf.Tensor2d,
    scaler: { mean: number[], std: number[] }
  } {
    const window = this.config.temporalWindow
    const sequences: number[][][] = []
    const targets: number[][] = []
    
    // Calculate mean and std for normalization
    const allNumbers = data.flatMap(d => d.gagnants)
    const mean = allNumbers.reduce((a, b) => a + b, 0) / allNumbers.length
    const std = Math.sqrt(allNumbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / allNumbers.length)
    
    // Create sequences with sliding window
    for (let i = window; i < data.length; i++) {
      const sequence: number[][] = []
      
      // Add historical draws to sequence
      for (let j = i - window; j < i; j++) {
        const draw = data[j]
        const normalizedNumbers = draw.gagnants.map(n => (n - mean) / std)
        
        // Add draw type embedding
        const drawTypeEmbed = this.drawTypeEmbeddings.get(draw.draw_name) || [0, 0, 0, 0, 0]
        
        // Add date features (day of week, day of month, month)
        const date = new Date(draw.date)
        const dateFeatures = [
          Math.sin(2 * Math.PI * date.getDay() / 7),
          Math.cos(2 * Math.PI * date.getDay() / 7),
          Math.sin(2 * Math.PI * date.getDate() / 31),
          Math.cos(2 * Math.PI * date.getDate() / 31),
          Math.sin(2 * Math.PI * date.getMonth() / 12),
          Math.cos(2 * Math.PI * date.getMonth() / 12)
        ]
        
        // Combine all features
        sequence.push([
          ...normalizedNumbers,
          ...drawTypeEmbed,
          ...dateFeatures
        ])
      }
      
      sequences.push(sequence)
      
      // Target: one-hot encoding of winning numbers
      const target = new Array(90).fill(0)
      data[i].gagnants.forEach(n => {
        target[n - 1] = 1
      })
      targets.push(target)
    }
    
    return {
      sequences: tf.tensor3d(sequences),
      targets: tf.tensor2d(targets),
      scaler: { mean: [mean], std: [std] }
    }
  }

  // Train the LSTM model
  async train(data: DrawResult[], drawType: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    if (data.length < this.config.temporalWindow + 10) {
      throw new Error(`Not enough data for training. Need at least ${this.config.temporalWindow + 10} draws.`)
    }
    
    const { sequences, targets, scaler } = this.preprocessData(data, drawType)
    this.featureScaler = scaler
    
    // Create model if it doesn't exist
    if (!this.lstmModel) {
      const inputShape: [number, number, number] = [
        sequences.shape[1],
        sequences.shape[2],
        1
      ]
      this.lstmModel = this.createLSTMModel(inputShape)
    }
    
    try {
      // Train the model
      const startTime = performance.now()
      
      const history = await this.lstmModel.fit(sequences, targets, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (logs) {
              this.trainingHistory.loss.push(logs.loss)
              this.trainingHistory.valLoss.push(logs.val_loss)
              if (logs.acc) {
                this.trainingHistory.accuracy.push(logs.acc)
                this.trainingHistory.valAccuracy.push(logs.val_acc)
              }
            }
            
            if (epoch % 10 === 0) {
              logger.info(`LSTM Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4)}`)
            }
          }
        }
      })
      
      const trainingTime = performance.now() - startTime
      logger.info(`LSTM training completed in ${trainingTime.toFixed(0)}ms`)
      
      // Extract attention weights for interpretability
      this.extractAttentionWeights(sequences)
      
      // Clean up tensors
      sequences.dispose()
      targets.dispose()
      
    } catch (error) {
      logger.error("Error training LSTM model:", error)
      throw error
    }
  }

  // Extract attention weights for interpretability
  private async extractAttentionWeights(sequences: tf.Tensor3d): Promise<void> {
    if (!this.lstmModel) return
    
    try {
      // Create a model that outputs attention weights
      const attentionLayer = this.lstmModel.layers.find(l => l.name.includes('attention'))
      if (!attentionLayer) return
      
      const attentionModel = tf.model({
        inputs: this.lstmModel.inputs,
        outputs: attentionLayer.output as tf.SymbolicTensor
      })
      
      // Get attention weights
      const weights = await attentionModel.predict(sequences) as tf.Tensor
      const weightsData = await weights.array()
      
      // Store attention weights
      this.attentionWeights = {
        timesteps: Array.from({length: this.config.temporalWindow}, (_, i) => i),
        features: Array.from({length: sequences.shape[2]}, (_, i) => i),
        heads: weightsData as number[][][]
      }
      
      weights.dispose()
    } catch (error) {
      logger.error("Error extracting attention weights:", error)
    }
  }

  // Make predictions with the LSTM model
  async predict(data: DrawResult[], drawType: string): Promise<LSTMPrediction> {
    if (!this.lstmModel || !this.featureScaler) {
      throw new Error("LSTM model not trained")
    }
    
    const window = this.config.temporalWindow
    if (data.length < window) {
      throw new Error(`Not enough data for prediction. Need at least ${window} draws.`)
    }
    
    const recentData = data.slice(-window)
    const { mean, std } = this.featureScaler
    
    // Prepare input sequence
    const sequence: number[][] = []
    for (const draw of recentData) {
      const normalizedNumbers = draw.gagnants.map(n => (n - mean[0]) / std[0])
      
      // Add draw type embedding
      const drawTypeEmbed = this.drawTypeEmbeddings.get(draw.draw_name) || [0, 0, 0, 0, 0]
      
      // Add date features
      const date = new Date(draw.date)
      const dateFeatures = [
        Math.sin(2 * Math.PI * date.getDay() / 7),
        Math.cos(2 * Math.PI * date.getDay() / 7),
        Math.sin(2 * Math.PI * date.getDate() / 31),
        Math.cos(2 * Math.PI * date.getDate() / 31),
        Math.sin(2 * Math.PI * date.getMonth() / 12),
        Math.cos(2 * Math.PI * date.getMonth() / 12)
      ]
      
      sequence.push([
        ...normalizedNumbers,
        ...drawTypeEmbed,
        ...dateFeatures
      ])
    }
    
    const inputTensor = tf.tensor3d([sequence])
    
    try {
      // Make prediction
      const startTime = performance.now()
      const prediction = this.lstmModel.predict(inputTensor) as tf.Tensor
      const probabilities = await prediction.data()
      
      // Get top 5 numbers with highest probabilities
      const probs = Array.from(probabilities)
      const indices = Array.from({length: probs.length}, (_, i) => i)
      const sortedIndices = indices.sort((a, b) => probs[b] - probs[a])
      const topIndices = sortedIndices.slice(0, 5)
      const numbers = topIndices.map(i => i + 1).sort((a, b) => a - b)
      
      // Calculate confidence as average probability of selected numbers
      const confidence = topIndices.reduce((sum, i) => sum + probs[i], 0) / 5
      
      // Calculate metrics
      const trainingTime = performance.now() - startTime
      const loss = this.trainingHistory.loss.length > 0 ? 
        this.trainingHistory.loss[this.trainingHistory.loss.length - 1] : 0
      const perplexity = Math.exp(loss)
      const accuracy = this.trainingHistory.accuracy.length > 0 ?
        this.trainingHistory.accuracy[this.trainingHistory.accuracy.length - 1] : 0
      
      // Clean up tensors
      inputTensor.dispose()
      prediction.dispose()
      
      return {
        numbers,
        probabilities: topIndices.map(i => probs[i]),
        confidence: confidence * 100,
        attentionWeights: this.attentionWeights || {
          timesteps: [],
          features: [],
          heads: []
        },
        metrics: {
          accuracy,
          loss,
          perplexity,
          trainingTime
        }
      }
    } catch (error) {
      inputTensor.dispose()
      logger.error("Error making LSTM prediction:", error)
      throw error
    }
  }
}
