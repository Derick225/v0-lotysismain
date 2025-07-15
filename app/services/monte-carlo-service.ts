"use client"

// Monte Carlo Simulation Service for Lottery Prediction
// Generates thousands of simulations with probability estimates and confidence intervals

import { DrawResult } from "../lib/constants"
import logger from "../lib/logger"

interface MonteCarloConfig {
  simulations: number
  confidenceLevel: number
  scenarios: number
  riskAssessment: boolean
  bootstrapSamples: number
  parallelWorkers: number
  seed?: number
  useHistoricalFrequencies: boolean
  useMarkovChain: boolean
  useBayesianPriors: boolean
}

interface ProbabilityDistribution {
  number: number
  probability: number
  confidenceInterval: [number, number]
  historicalFrequency: number
  recency: number
}

interface ScenarioResult {
  numbers: number[]
  probability: number
  expectedValue: number
  risk: number
  volatility: number
}

interface MonteCarloResult {
  recommendedNumbers: number[]
  probabilityDistributions: ProbabilityDistribution[]
  scenarios: ScenarioResult[]
  confidenceIntervals: {
    lower: number[]
    upper: number[]
    level: number
  }
  riskMetrics: {
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    valueAtRisk: number
    expectedShortfall: number
  }
  performance: {
    simulationTime: number
    simulationsPerSecond: number
    memoryUsage: number
  }
}

export class MonteCarloService {
  private config: MonteCarloConfig
  private rng: () => number
  private transitionMatrix: number[][] = []
  private numberFrequencies: Map<number, number> = new Map()
  private numberRecency: Map<number, number> = new Map()
  private bayesianPriors: Map<number, number> = new Map()
  private isInitialized = false
  private workers: Worker[] = []

  constructor(config?: Partial<MonteCarloConfig>) {
    this.config = {
      simulations: 10000,
      confidenceLevel: 0.95,
      scenarios: 1000,
      riskAssessment: true,
      bootstrapSamples: 1000,
      parallelWorkers: navigator.hardwareConcurrency || 4,
      seed: Date.now(),
      useHistoricalFrequencies: true,
      useMarkovChain: true,
      useBayesianPriors: true,
      ...config
    }
    
    // Initialize pseudo-random number generator with seed
    this.rng = this.createSeededRNG(this.config.seed || Date.now())
  }

  // Create a seeded random number generator
  private createSeededRNG(seed: number): () => number {
    return () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      // Initialize transition matrix for Markov chain
      this.transitionMatrix = Array(91).fill(0).map(() => Array(91).fill(0))
      
      // Initialize Bayesian priors (uniform prior)
      for (let i = 1; i <= 90; i++) {
        this.bayesianPriors.set(i, 1/90)
      }
      
      this.isInitialized = true
      logger.info("Monte Carlo Service initialized successfully")
    } catch (error) {
      logger.error("Failed to initialize Monte Carlo Service:", error)
      throw error
    }
  }

  // Analyze historical data to build probability models
  private analyzeHistoricalData(data: DrawResult[]): void {
    // Reset data structures
    this.numberFrequencies.clear()
    this.numberRecency.clear()
    this.transitionMatrix = Array(91).fill(0).map(() => Array(91).fill(0))
    
    // Count frequencies and build transition matrix
    let totalNumbers = 0
    
    data.forEach((draw, index) => {
      // Update frequencies
      draw.gagnants.forEach(num => {
        this.numberFrequencies.set(num, (this.numberFrequencies.get(num) || 0) + 1)
        this.numberRecency.set(num, index)
        totalNumbers++
      })
      
      // Update transition matrix (Markov chain)
      if (index > 0) {
        const prevDraw = data[index - 1].gagnants
        const currentDraw = draw.gagnants
        
        prevDraw.forEach(prev => {
          currentDraw.forEach(curr => {
            this.transitionMatrix[prev][curr]++
          })
        })
      }
    })
    
    // Normalize frequencies
    for (const [num, freq] of this.numberFrequencies.entries()) {
      this.numberFrequencies.set(num, freq / totalNumbers)
    }
    
    // Normalize transition matrix
    for (let i = 1; i <= 90; i++) {
      const rowSum = this.transitionMatrix[i].reduce((sum, val) => sum + val, 0)
      if (rowSum > 0) {
        for (let j = 1; j <= 90; j++) {
          this.transitionMatrix[i][j] /= rowSum
        }
      }
    }
    
    // Update Bayesian priors using historical data
    if (this.config.useBayesianPriors) {
      const alpha = 1 // Prior strength parameter
      const totalDraws = data.length
      
      for (let i = 1; i <= 90; i++) {
        const freq = this.numberFrequencies.get(i) || 0
        const prior = (freq * totalDraws + alpha) / (totalDraws + 90 * alpha)
        this.bayesianPriors.set(i, prior)
      }
    }
  }

  // Run Monte Carlo simulations
  async runSimulations(data: DrawResult[], drawType: string): Promise<MonteCarloResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    const startTime = performance.now()
    
    // Analyze historical data
    this.analyzeHistoricalData(data)
    
    // Generate simulations
    const simulationResults: number[][] = []
    const probabilities: Map<number, number[]> = new Map()
    
    for (let i = 1; i <= 90; i++) {
      probabilities.set(i, [])
    }
    
    // Run simulations
    for (let sim = 0; sim < this.config.simulations; sim++) {
      const result = this.generateSimulation(data, drawType)
      simulationResults.push(result)
      
      // Update probability distributions
      result.forEach(num => {
        const probs = probabilities.get(num)
        if (probs) {
          probs.push(1)
        }
      })
      
      // Update zeros for non-selected numbers
      for (let i = 1; i <= 90; i++) {
        if (!result.includes(i)) {
          const probs = probabilities.get(i)
          if (probs) {
            probs.push(0)
          }
        }
      }
    }
    
    // Calculate probability distributions
    const probabilityDistributions: ProbabilityDistribution[] = []
    
    for (let i = 1; i <= 90; i++) {
      const probs = probabilities.get(i) || []
      const probability = probs.reduce((sum, p) => sum + p, 0) / this.config.simulations
      
      // Calculate confidence intervals using bootstrap
      const confidenceInterval = this.calculateConfidenceInterval(probs)
      
      probabilityDistributions.push({
        number: i,
        probability,
        confidenceInterval,
        historicalFrequency: this.numberFrequencies.get(i) || 0,
        recency: this.numberRecency.get(i) !== undefined ? 
          (data.length - 1 - this.numberRecency.get(i)!) / data.length : 1
      })
    }
    
    // Sort by probability
    probabilityDistributions.sort((a, b) => b.probability - a.probability)
    
    // Generate scenarios
    const scenarios = this.generateScenarios(probabilityDistributions)
    
    // Get recommended numbers (top 5 by probability)
    const recommendedNumbers = probabilityDistributions
      .slice(0, 5)
      .map(pd => pd.number)
      .sort((a, b) => a - b)
    
    // Calculate confidence intervals for the recommended set
    const confidenceIntervals = this.calculateSetConfidenceIntervals(
      recommendedNumbers, 
      simulationResults
    )
    
    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(
      recommendedNumbers, 
      simulationResults, 
      probabilityDistributions
    )
    
    const endTime = performance.now()
    const simulationTime = endTime - startTime
    
    return {
      recommendedNumbers,
      probabilityDistributions,
      scenarios: scenarios.slice(0, this.config.scenarios),
      confidenceIntervals,
      riskMetrics,
      performance: {
        simulationTime,
        simulationsPerSecond: Math.round(this.config.simulations / (simulationTime / 1000)),
        memoryUsage: this.estimateMemoryUsage(simulationResults, probabilityDistributions)
      }
    }
  }

  // Generate a single simulation
  private generateSimulation(data: DrawResult[], drawType: string): number[] {
    const result: number[] = []
    const recentDraws = data.slice(-5)
    
    // Get recent numbers
    const recentNumbers = new Set<number>()
    recentDraws.forEach(draw => {
      draw.gagnants.forEach(num => recentNumbers.add(num))
    })
    
    // Calculate probabilities for each number
    const probabilities: number[] = Array(91).fill(0)
    
    for (let i = 1; i <= 90; i++) {
      let probability = 0
      
      // Historical frequency component
      if (this.config.useHistoricalFrequencies) {
        probability += (this.numberFrequencies.get(i) || 0) * 0.4
      }
      
      // Markov chain component
      if (this.config.useMarkovChain && recentDraws.length > 0) {
        const lastDraw = recentDraws[recentDraws.length - 1].gagnants
        let markovProb = 0
        
        lastDraw.forEach(prev => {
          markovProb += this.transitionMatrix[prev][i]
        })
        
        probability += (markovProb / lastDraw.length) * 0.3
      }
      
      // Bayesian prior component
      if (this.config.useBayesianPriors) {
        probability += (this.bayesianPriors.get(i) || 1/90) * 0.3
      }
      
      // Ensure minimum probability
      probability = Math.max(probability, 0.001)
      
      probabilities[i] = probability
    }
    
    // Normalize probabilities
    const sum = probabilities.reduce((acc, p) => acc + p, 0)
    for (let i = 1; i <= 90; i++) {
      probabilities[i] /= sum
    }
    
    // Select 5 unique numbers based on probabilities
    while (result.length < 5) {
      const rand = this.rng()
      let cumulative = 0
      
      for (let i = 1; i <= 90; i++) {
        cumulative += probabilities[i]
        if (rand < cumulative && !result.includes(i)) {
          result.push(i)
          break
        }
      }
    }
    
    return result.sort((a, b) => a - b)
  }

  // Calculate confidence interval using bootstrap
  private calculateConfidenceInterval(samples: number[]): [number, number] {
    if (samples.length === 0) return [0, 0]
    
    const bootstrapMeans: number[] = []
    const n = samples.length
    
    for (let i = 0; i < this.config.bootstrapSamples; i++) {
      let sum = 0
      for (let j = 0; j < n; j++) {
        const idx = Math.floor(this.rng() * n)
        sum += samples[idx]
      }
      bootstrapMeans.push(sum / n)
    }
    
    bootstrapMeans.sort((a, b) => a - b)
    
    const alpha = 1 - this.config.confidenceLevel
    const lowerIdx = Math.floor(alpha / 2 * this.config.bootstrapSamples)
    const upperIdx = Math.floor((1 - alpha / 2) * this.config.bootstrapSamples)
    
    return [bootstrapMeans[lowerIdx], bootstrapMeans[upperIdx]]
  }

  // Generate different scenarios
  private generateScenarios(distributions: ProbabilityDistribution[]): ScenarioResult[] {
    const scenarios: ScenarioResult[] = []
    
    for (let i = 0; i < this.config.scenarios; i++) {
      const numbers: number[] = []
      const availableNumbers = Array.from({length: 90}, (_, i) => i + 1)
      
      // Select 5 numbers for this scenario
      for (let j = 0; j < 5; j++) {
        // Calculate selection probabilities
        const selectionProbs: number[] = []
        let totalProb = 0
        
        for (const num of availableNumbers) {
          const dist = distributions.find(d => d.number === num)
          if (dist) {
            const prob = dist.probability
            selectionProbs.push(prob)
            totalProb += prob
          } else {
            selectionProbs.push(0.001)
            totalProb += 0.001
          }
        }
        
        // Normalize probabilities
        for (let k = 0; k < selectionProbs.length; k++) {
          selectionProbs[k] /= totalProb
        }
        
        // Select a number
        const rand = this.rng()
        let cumulative = 0
        let selectedIdx = -1
        
        for (let k = 0; k < selectionProbs.length; k++) {
          cumulative += selectionProbs[k]
          if (rand < cumulative) {
            selectedIdx = k
            break
          }
        }
        
        if (selectedIdx >= 0) {
          numbers.push(availableNumbers[selectedIdx])
          availableNumbers.splice(selectedIdx, 1)
        }
      }
      
      // Calculate scenario metrics
      const probability = numbers.reduce((prod, num) => {
        const dist = distributions.find(d => d.number === num)
        return prod * (dist ? dist.probability : 0.001)
      }, 1)
      
      const expectedValue = probability * 5
      
      // Risk calculation
      const volatility = Math.sqrt(numbers.reduce((sum, num) => {
        const dist = distributions.find(d => d.number === num)
        const p = dist ? dist.probability : 0.001
        return sum + p * (1 - p)
      }, 0))
      
      const risk = volatility / expectedValue
      
      scenarios.push({
        numbers: numbers.sort((a, b) => a - b),
        probability,
        expectedValue,
        risk,
        volatility
      })
    }
    
    // Sort scenarios by expected value (descending)
    return scenarios.sort((a, b) => b.expectedValue - a.expectedValue)
  }

  // Calculate confidence intervals for the recommended set
  private calculateSetConfidenceIntervals(
    recommendedNumbers: number[],
    simulations: number[][]
  ): { lower: number[], upper: number[], level: number } {
    const matchCounts: number[] = []
    
    // Count matches in each simulation
    simulations.forEach(sim => {
      let matches = 0
      recommendedNumbers.forEach(num => {
        if (sim.includes(num)) matches++
      })
      matchCounts.push(matches)
    })
    
    // Calculate confidence intervals for each match count
    const confidenceIntervals: number[][] = []
    
    for (let i = 0; i <= 5; i++) {
      const indicator = matchCounts.map(count => count === i ? 1 : 0)
      const interval = this.calculateConfidenceInterval(indicator)
      confidenceIntervals.push(interval)
    }
    
    // Convert to lower and upper bounds
    const lower = confidenceIntervals.map(interval => interval[0])
    const upper = confidenceIntervals.map(interval => interval[1])
    
    return {
      lower,
      upper,
      level: this.config.confidenceLevel
    }
  }

  // Calculate risk metrics
  private calculateRiskMetrics(
    recommendedNumbers: number[],
    simulations: number[][],
    distributions: ProbabilityDistribution[]
  ): {
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
    valueAtRisk: number
    expectedShortfall: number
  } {
    // Calculate match probabilities
    const matchProbs: number[] = Array(6).fill(0)
    
    simulations.forEach(sim => {
      let matches = 0
      recommendedNumbers.forEach(num => {
        if (sim.includes(num)) matches++
      })
      matchProbs[matches]++
    })
    
    // Normalize
    for (let i = 0; i <= 5; i++) {
      matchProbs[i] /= simulations.length
    }
    
    // Expected value
    const expectedValue = matchProbs.reduce((sum, prob, i) => sum + i * prob, 0)
    
    // Volatility
    const variance = matchProbs.reduce((sum, prob, i) => sum + prob * Math.pow(i - expectedValue, 2), 0)
    const volatility = Math.sqrt(variance)
    
    // Sharpe ratio (using risk-free rate of 0)
    const sharpeRatio = expectedValue / volatility
    
    // Maximum drawdown
    const cumulativeReturns = simulations.map(sim => {
      let matches = 0
      recommendedNumbers.forEach(num => {
        if (sim.includes(num)) matches++
      })
      return matches - 2.5 // Adjust for expected value
    })
    
    let maxDrawdown = 0
    let peak = 0
    
    cumulativeReturns.forEach(ret => {
      peak = Math.max(peak, ret)
      const drawdown = peak - ret
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    })
    
    // Value at Risk (VaR) at 95% confidence
    const sortedReturns = [...cumulativeReturns].sort((a, b) => a - b)
    const varIdx = Math.floor(0.05 * sortedReturns.length)
    const valueAtRisk = -sortedReturns[varIdx]
    
    // Expected Shortfall (ES) / Conditional VaR
    const expectedShortfall = -sortedReturns.slice(0, varIdx).reduce((sum, ret) => sum + ret, 0) / varIdx
    
    return {
      volatility,
      sharpeRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall
    }
  }

  // Estimate memory usage
  private estimateMemoryUsage(
    simulations: number[][],
    distributions: ProbabilityDistribution[]
  ): number {
    // Rough estimate in MB
    const simulationsSize = simulations.length * 5 * 4 / (1024 * 1024)
    const distributionsSize = distributions.length * 32 / (1024 * 1024)
    const matrixSize = 91 * 91 * 8 / (1024 * 1024)
    
    return simulationsSize + distributionsSize + matrixSize
  }
}
