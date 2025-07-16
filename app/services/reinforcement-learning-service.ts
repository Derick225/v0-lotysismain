"use client"

// Reinforcement Learning Agent for Lottery Prediction
// Implements Q-Learning with dynamic model weight adjustment

import * as tf from "@tensorflow/tfjs"
import { DrawResult } from "../lib/constants"
import logger from "../lib/logger"

interface RLConfig {
  learningRate: number
  discountFactor: number
  explorationRate: number
  explorationDecay: number
  minExplorationRate: number
  memorySize: number
  batchSize: number
  targetUpdateFreq: number
  rewardFunction: 'accuracy' | 'profit' | 'hybrid'
  stateSize: number
  actionSize: number
  hiddenLayers: number[]
  activationFunction: 'relu' | 'tanh' | 'sigmoid'
}

interface RLState {
  recentDraws: number[][]
  modelPredictions: number[][]
  modelWeights: number[]
  performance: number[]
  userFeedback: number[]
  marketConditions: number[]
}

interface RLAction {
  modelWeights: number[]
  predictionAdjustment: number[]
  explorationBonus: number
}

interface Experience {
  state: RLState
  action: RLAction
  reward: number
  nextState: RLState
  done: boolean
  timestamp: number
}

interface RLPrediction {
  numbers: number[]
  qValues: number[]
  actionProbabilities: number[]
  stateValue: number
  explorationBonus: number
  confidence: number
  modelWeights: number[]
}

export class ReinforcementLearningService {
  private qNetwork: tf.LayersModel | null = null
  private targetNetwork: tf.LayersModel | null = null
  private config: RLConfig
  private replayBuffer: Experience[] = []
  private currentState: RLState | null = null
  private episodeCount = 0
  private totalReward = 0
  private isInitialized = false
  private userPreferences: Map<string, number> = new Map()
  private performanceHistory: number[] = []
  private modelWeights: number[] = [0.25, 0.25, 0.25, 0.25] // XGBoost, LSTM, Monte Carlo, Base

  constructor(config?: Partial<RLConfig>) {
    this.config = {
      learningRate: 0.001,
      discountFactor: 0.95,
      explorationRate: 1.0,
      explorationDecay: 0.995,
      minExplorationRate: 0.01,
      memorySize: 10000,
      batchSize: 32,
      targetUpdateFreq: 100,
      rewardFunction: 'hybrid',
      stateSize: 50, // Configurable based on state representation
      actionSize: 20, // Number of possible actions
      hiddenLayers: [128, 64, 32],
      activationFunction: 'relu',
      ...config
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await tf.ready()
      
      // Create Q-network
      this.qNetwork = this.createQNetwork()
      
      // Create target network (copy of Q-network)
      this.targetNetwork = this.createQNetwork()
      await this.updateTargetNetwork()
      
      // Initialize user preferences
      this.userPreferences.set('risk_tolerance', 0.5)
      this.userPreferences.set('prediction_horizon', 0.7)
      this.userPreferences.set('model_preference', 0.5)
      this.userPreferences.set('feedback_weight', 0.3)
      
      this.isInitialized = true
      logger.info("Reinforcement Learning Service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize RL Service:", error)
      throw error
    }
  }

  // Create Q-network architecture
  private createQNetwork(): tf.LayersModel {
    const input = tf.input({shape: [this.config.stateSize]})
    
    let layer = input
    
    // Hidden layers
    for (let i = 0; i < this.config.hiddenLayers.length; i++) {
      layer = tf.layers.dense({
        units: this.config.hiddenLayers[i],
        activation: this.config.activationFunction,
        kernelInitializer: 'heNormal'
      }).apply(layer) as tf.SymbolicTensor
      
      // Add dropout for regularization
      layer = tf.layers.dropout({rate: 0.2}).apply(layer) as tf.SymbolicTensor
    }
    
    // Output layer for Q-values
    const qValues = tf.layers.dense({
      units: this.config.actionSize,
      activation: 'linear',
      name: 'q_values'
    }).apply(layer) as tf.SymbolicTensor
    
    // Additional output for state value (for advantage calculation)
    const stateValue = tf.layers.dense({
      units: 1,
      activation: 'linear',
      name: 'state_value'
    }).apply(layer) as tf.SymbolicTensor
    
    const model = tf.model({
      inputs: input,
      outputs: [qValues, stateValue]
    })
    
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: ['meanSquaredError', 'meanSquaredError'],
      lossWeights: [1.0, 0.5]
    })
    
    return model
  }

  // Update target network
  private async updateTargetNetwork(): Promise<void> {
    if (!this.qNetwork || !this.targetNetwork) return
    
    const weights = this.qNetwork.getWeights()
    this.targetNetwork.setWeights(weights)
  }

  // Convert game state to RL state representation
  private encodeState(
    recentDraws: DrawResult[],
    modelPredictions: number[][],
    modelPerformance: number[],
    userFeedback?: number[]
  ): RLState {
    // Encode recent draws
    const recentNumbers = recentDraws.slice(-5).map(draw => 
      draw.gagnants.map(n => (n - 1) / 89) // Normalize to [0,1]
    )
    
    // Pad if necessary
    while (recentNumbers.length < 5) {
      recentNumbers.unshift(Array(5).fill(0))
    }
    
    // Encode model predictions
    const encodedPredictions = modelPredictions.map(pred => 
      pred.map(n => (n - 1) / 89)
    )
    
    // Pad predictions if necessary
    while (encodedPredictions.length < 4) {
      encodedPredictions.push(Array(5).fill(0))
    }
    
    // Encode performance metrics
    const normalizedPerformance = modelPerformance.map(p => Math.max(0, Math.min(1, p)))
    
    // Encode user feedback
    const encodedFeedback = userFeedback || Array(5).fill(0.5)
    
    // Market conditions (simulated)
    const marketConditions = [
      Math.sin(Date.now() / (1000 * 60 * 60 * 24)), // Daily cycle
      Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 7)), // Weekly cycle
      Math.sin(Date.now() / (1000 * 60 * 60 * 24 * 30)), // Monthly cycle
      this.performanceHistory.length > 0 ? 
        this.performanceHistory[this.performanceHistory.length - 1] : 0.5
    ]
    
    return {
      recentDraws: recentNumbers,
      modelPredictions: encodedPredictions,
      modelWeights: [...this.modelWeights],
      performance: normalizedPerformance,
      userFeedback: encodedFeedback,
      marketConditions
    }
  }

  // Convert state to tensor
  private stateToTensor(state: RLState): tf.Tensor2d {
    const flatState = [
      ...state.recentDraws.flat(),
      ...state.modelPredictions.flat(),
      ...state.modelWeights,
      ...state.performance,
      ...state.userFeedback,
      ...state.marketConditions
    ]
    
    // Pad or truncate to match state size
    while (flatState.length < this.config.stateSize) {
      flatState.push(0)
    }
    
    return tf.tensor2d([flatState.slice(0, this.config.stateSize)])
  }

  // Select action using epsilon-greedy policy
  private async selectAction(state: RLState): Promise<RLAction> {
    if (!this.qNetwork) {
      throw new Error("Q-network not initialized")
    }
    
    const stateTensor = this.stateToTensor(state)
    
    try {
      // Get Q-values and state value
      const [qValues, stateValue] = this.qNetwork.predict(stateTensor) as [tf.Tensor, tf.Tensor]
      const qValuesData = await qValues.data()
      const stateValueData = await stateValue.data()
      
      let actionIndex: number
      
      // Epsilon-greedy action selection
      if (Math.random() < this.config.explorationRate) {
        // Explore: random action
        actionIndex = Math.floor(Math.random() * this.config.actionSize)
      } else {
        // Exploit: best action
        actionIndex = qValuesData.indexOf(Math.max(...Array.from(qValuesData)))
      }
      
      // Decode action
      const action = this.decodeAction(actionIndex, Array.from(qValuesData))
      
      // Clean up tensors
      stateTensor.dispose()
      qValues.dispose()
      stateValue.dispose()
      
      return action
    } catch (error) {
      stateTensor.dispose()
      throw error
    }
  }

  // Decode action index to action parameters
  private decodeAction(actionIndex: number, qValues: number[]): RLAction {
    // Map action index to model weight adjustments
    const weightAdjustments = Array(4).fill(0)
    const adjustmentSize = 0.1
    
    // Determine which model weight to adjust
    const modelIndex = actionIndex % 4
    const direction = Math.floor(actionIndex / 4) % 2 === 0 ? 1 : -1
    
    weightAdjustments[modelIndex] = direction * adjustmentSize
    
    // Apply adjustments to current weights
    const newWeights = this.modelWeights.map((weight, i) => 
      Math.max(0, Math.min(1, weight + weightAdjustments[i]))
    )
    
    // Normalize weights
    const sum = newWeights.reduce((a, b) => a + b, 0)
    const normalizedWeights = sum > 0 ? newWeights.map(w => w / sum) : [0.25, 0.25, 0.25, 0.25]
    
    // Prediction adjustment based on action
    const predictionAdjustment = Array(5).fill(0)
    const adjustmentIndex = Math.floor(actionIndex / 8) % 5
    predictionAdjustment[adjustmentIndex] = (actionIndex % 8 - 4) * 2 // -8 to +6
    
    // Exploration bonus
    const explorationBonus = this.config.explorationRate * 0.1
    
    return {
      modelWeights: normalizedWeights,
      predictionAdjustment,
      explorationBonus
    }
  }

  // Calculate reward based on prediction accuracy and user feedback
  private calculateReward(
    predictedNumbers: number[],
    actualNumbers: number[],
    userFeedback?: number
  ): number {
    let reward = 0
    
    // Accuracy-based reward
    const matches = predictedNumbers.filter(n => actualNumbers.includes(n)).length
    const accuracyReward = matches / 5 // 0 to 1
    
    // Profit-based reward (simulated)
    const profitMultipliers = [0, 0, 1, 5, 25, 100] // Reward for 0-5 matches
    const profitReward = profitMultipliers[matches] / 100
    
    // User feedback reward
    const feedbackReward = userFeedback !== undefined ? userFeedback / 10 : 0
    
    // Combine rewards based on configuration
    switch (this.config.rewardFunction) {
      case 'accuracy':
        reward = accuracyReward
        break
      case 'profit':
        reward = profitReward
        break
      case 'hybrid':
        reward = 0.4 * accuracyReward + 0.4 * profitReward + 0.2 * feedbackReward
        break
    }
    
    // Bonus for consistency
    if (this.performanceHistory.length > 5) {
      const recentPerformance = this.performanceHistory.slice(-5)
      const consistency = 1 - (Math.max(...recentPerformance) - Math.min(...recentPerformance))
      reward += 0.1 * consistency
    }
    
    return reward
  }

  // Store experience in replay buffer
  private storeExperience(experience: Experience): void {
    this.replayBuffer.push(experience)
    
    // Remove old experiences if buffer is full
    if (this.replayBuffer.length > this.config.memorySize) {
      this.replayBuffer.shift()
    }
  }

  // Train the Q-network using experience replay
  private async trainNetwork(): Promise<void> {
    if (!this.qNetwork || !this.targetNetwork || this.replayBuffer.length < this.config.batchSize) {
      return
    }
    
    // Sample random batch from replay buffer
    const batch: Experience[] = []
    for (let i = 0; i < this.config.batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.replayBuffer.length)
      batch.push(this.replayBuffer[randomIndex])
    }
    
    // Prepare training data
    const states = batch.map(exp => this.stateToTensor(exp.state))
    const nextStates = batch.map(exp => this.stateToTensor(exp.nextState))
    
    try {
      // Get current Q-values
      const currentQValues = this.qNetwork.predict(tf.concat(states)) as tf.Tensor
      
      // Get next Q-values from target network
      const nextQValues = this.targetNetwork.predict(tf.concat(nextStates)) as tf.Tensor
      
      const currentQData = await currentQValues.data()
      const nextQData = await nextQValues.data()
      
      // Calculate target Q-values
      const targetQValues = Array.from(currentQData)
      
      for (let i = 0; i < batch.length; i++) {
        const experience = batch[i]
        const actionIndex = this.getActionIndex(experience.action)
        
        let target = experience.reward
        if (!experience.done) {
          const nextMaxQ = Math.max(...Array.from(nextQData).slice(i * this.config.actionSize, (i + 1) * this.config.actionSize))
          target += this.config.discountFactor * nextMaxQ
        }
        
        targetQValues[i * this.config.actionSize + actionIndex] = target
      }
      
      // Train the network
      const targetTensor = tf.tensor2d([targetQValues])
      const stateTensor = tf.concat(states)
      
      await this.qNetwork.fit(stateTensor, targetTensor, {
        epochs: 1,
        verbose: 0
      })
      
      // Clean up tensors
      states.forEach(s => s.dispose())
      nextStates.forEach(s => s.dispose())
      currentQValues.dispose()
      nextQValues.dispose()
      targetTensor.dispose()
      stateTensor.dispose()
      
    } catch (error) {
      logger.error("Error training RL network:", error)
      // Clean up on error
      states.forEach(s => s.dispose())
      nextStates.forEach(s => s.dispose())
    }
  }

  // Get action index from action object
  private getActionIndex(action: RLAction): number {
    // Find the model with the highest weight change
    let maxChange = 0
    let modelIndex = 0
    
    for (let i = 0; i < action.modelWeights.length; i++) {
      const change = Math.abs(action.modelWeights[i] - this.modelWeights[i])
      if (change > maxChange) {
        maxChange = change
        modelIndex = i
      }
    }
    
    // Determine direction
    const direction = action.modelWeights[modelIndex] > this.modelWeights[modelIndex] ? 0 : 1
    
    return modelIndex + direction * 4
  }

  // Make prediction using RL agent
  async predict(
    recentDraws: DrawResult[],
    modelPredictions: number[][],
    modelPerformance: number[],
    userFeedback?: number[]
  ): Promise<RLPrediction> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    // Encode current state
    const state = this.encodeState(recentDraws, modelPredictions, modelPerformance, userFeedback)
    this.currentState = state
    
    // Select action
    const action = await this.selectAction(state)
    
    // Update model weights
    this.modelWeights = action.modelWeights
    
    // Combine model predictions using learned weights
    const combinedPrediction = this.combineModelPredictions(modelPredictions, action.modelWeights)
    
    // Apply prediction adjustments
    const adjustedPrediction = combinedPrediction.map((num, i) => 
      Math.max(1, Math.min(90, num + action.predictionAdjustment[i] || 0))
    )
    
    // Get Q-values for interpretability
    const stateTensor = this.stateToTensor(state)
    const [qValues, stateValue] = this.qNetwork!.predict(stateTensor) as [tf.Tensor, tf.Tensor]
    const qValuesData = await qValues.data()
    const stateValueData = await stateValue.data()
    
    // Calculate action probabilities using softmax
    const qValuesArray = Array.from(qValuesData)
    const maxQ = Math.max(...qValuesArray)
    const expQ = qValuesArray.map(q => Math.exp(q - maxQ))
    const sumExpQ = expQ.reduce((a, b) => a + b, 0)
    const actionProbabilities = expQ.map(eq => eq / sumExpQ)
    
    // Calculate confidence
    const confidence = Math.max(...actionProbabilities) * 100
    
    // Clean up tensors
    stateTensor.dispose()
    qValues.dispose()
    stateValue.dispose()
    
    return {
      numbers: adjustedPrediction.sort((a, b) => a - b),
      qValues: qValuesArray,
      actionProbabilities,
      stateValue: stateValueData[0],
      explorationBonus: action.explorationBonus,
      confidence,
      modelWeights: action.modelWeights
    }
  }

  // Combine model predictions using weights
  private combineModelPredictions(predictions: number[][], weights: number[]): number[] {
    const combined: number[] = Array(5).fill(0)
    
    for (let i = 0; i < 5; i++) {
      let weightedSum = 0
      let totalWeight = 0
      
      for (let j = 0; j < Math.min(predictions.length, weights.length); j++) {
        if (predictions[j] && predictions[j][i] !== undefined) {
          weightedSum += predictions[j][i] * weights[j]
          totalWeight += weights[j]
        }
      }
      
      combined[i] = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 
        Math.floor(Math.random() * 90) + 1
    }
    
    return combined
  }

  // Update agent with feedback
  async updateWithFeedback(
    predictedNumbers: number[],
    actualNumbers: number[],
    userFeedback?: number
  ): Promise<void> {
    if (!this.currentState) return
    
    // Calculate reward
    const reward = this.calculateReward(predictedNumbers, actualNumbers, userFeedback)
    this.totalReward += reward
    this.performanceHistory.push(reward)
    
    // Create next state (simplified - would be the state after the draw)
    const nextState = { ...this.currentState }
    
    // Store experience
    const experience: Experience = {
      state: this.currentState,
      action: {
        modelWeights: this.modelWeights,
        predictionAdjustment: Array(5).fill(0),
        explorationBonus: this.config.explorationRate * 0.1
      },
      reward,
      nextState,
      done: false,
      timestamp: Date.now()
    }
    
    this.storeExperience(experience)
    
    // Train network
    await this.trainNetwork()
    
    // Update target network periodically
    this.episodeCount++
    if (this.episodeCount % this.config.targetUpdateFreq === 0) {
      await this.updateTargetNetwork()
    }
    
    // Decay exploration rate
    this.config.explorationRate = Math.max(
      this.config.minExplorationRate,
      this.config.explorationRate * this.config.explorationDecay
    )
    
    logger.info(`RL Agent updated: reward=${reward.toFixed(3)}, exploration=${this.config.explorationRate.toFixed(3)}`)
  }

  // Update user preferences
  updateUserPreferences(preferences: { [key: string]: number }): void {
    for (const [key, value] of Object.entries(preferences)) {
      this.userPreferences.set(key, value)
    }
    
    logger.info("User preferences updated:", preferences)
  }

  // Get current performance metrics
  getPerformanceMetrics(): {
    totalReward: number
    averageReward: number
    explorationRate: number
    episodeCount: number
    replayBufferSize: number
    modelWeights: number[]
  } {
    const averageReward = this.performanceHistory.length > 0 ?
      this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length : 0
    
    return {
      totalReward: this.totalReward,
      averageReward,
      explorationRate: this.config.explorationRate,
      episodeCount: this.episodeCount,
      replayBufferSize: this.replayBuffer.length,
      modelWeights: [...this.modelWeights]
    }
  }
}
