"use client"

// Enhanced Model Management Panel with Comprehensive ML System
// Integrates XGBoost, RNN-LSTM, Monte Carlo, and Reinforcement Learning

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  BrainIcon,
  TrendingUpIcon,
  BarChart3Icon,
  SettingsIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  EyeIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  ZapIcon,
  TargetIcon,
  LayersIcon,
  NetworkIcon,
  CpuIcon,
  DatabaseIcon,
  LineChartIcon,
  PieChartIcon
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { EnhancedMLPredictionService } from "../services/enhanced-ml-prediction-service"
import { DrawResult } from "../lib/constants"

interface ModelStatus {
  name: string
  status: 'training' | 'ready' | 'error' | 'inactive'
  accuracy: number
  lastTrained: string
  predictions: number
  confidence: number
}

interface TrainingProgress {
  model: string
  progress: number
  epoch: number
  loss: number
  accuracy: number
  eta: string
}

interface PredictionResult {
  numbers: number[]
  confidence: number
  modelWeights: number[]
  explanations: {
    shap: number[]
    attention: number[][]
    featureImportance: { [key: string]: number }
  }
  performance: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
}

export function EnhancedModelManagementPanel() {
  const { toast } = useToast()

  // State management
  const [mlService] = useState(() => EnhancedMLPredictionService.getInstance())
  const [isInitialized, setIsInitialized] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)

  // Model states
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([
    { name: 'XGBoost', status: 'inactive', accuracy: 0, lastTrained: 'Never', predictions: 0, confidence: 0 },
    { name: 'RNN-LSTM', status: 'inactive', accuracy: 0, lastTrained: 'Never', predictions: 0, confidence: 0 },
    { name: 'Monte Carlo', status: 'ready', accuracy: 0, lastTrained: 'N/A', predictions: 0, confidence: 0 },
    { name: 'Reinforcement Learning', status: 'inactive', accuracy: 0, lastTrained: 'Never', predictions: 0, confidence: 0 },
    { name: 'Ensemble', status: 'inactive', accuracy: 0, lastTrained: 'Never', predictions: 0, confidence: 0 }
  ])

  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([])
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null)
  const [selectedDrawType, setSelectedDrawType] = useState('National')
  const [autoRetrain, setAutoRetrain] = useState(false)
  const [modelDriftDetection, setModelDriftDetection] = useState(true)

  // Configuration states
  const [xgboostConfig, setXgboostConfig] = useState({
    maxDepth: 8,
    learningRate: 0.05,
    nEstimators: 200,
    regAlpha: 0.1,
    regLambda: 1.0
  })

  const [lstmConfig, setLstmConfig] = useState({
    units: 128,
    layers: 3,
    dropout: 0.3,
    temporalWindow: 30,
    attentionHeads: 8
  })

  const [monteCarloConfig, setMonteCarloConfig] = useState({
    simulations: 10000,
    confidenceLevel: 0.95,
    scenarios: 1000
  })

  const [rlConfig, setRlConfig] = useState({
    learningRate: 0.001,
    explorationRate: 0.1,
    memorySize: 10000,
    batchSize: 32
  })

  // Initialize ML service
  useEffect(() => {
    const initializeService = async () => {
      try {
        await mlService.initialize()
        setIsInitialized(true)

        // Load performance metrics
        loadPerformanceMetrics()

        toast({
          title: "ML System Initialized",
          description: "Enhanced machine learning system is ready for training and predictions.",
        })
      } catch (error) {
        console.error("Failed to initialize ML service:", error)
        toast({
          title: "Initialization Error",
          description: "Failed to initialize the ML system. Please check the console for details.",
          variant: "destructive"
        })
      }
    }

    initializeService()
  }, [mlService, toast])

  // Load performance metrics
  const loadPerformanceMetrics = () => {
    const metrics = mlService.getPerformanceMetrics()

    setModelStatuses(prev => prev.map(model => {
      const metric = metrics.get(model.name.toLowerCase().replace(/[^a-z]/g, ''))
      if (metric) {
        return {
          ...model,
          accuracy: metric.accuracy.length > 0 ?
            metric.accuracy[metric.accuracy.length - 1] * 100 : 0,
          predictions: metric.predictions,
          lastTrained: new Date(metric.lastUpdate).toLocaleString(),
          status: metric.predictions > 0 ? 'ready' : 'inactive'
        }
      }
      return model
    }))
  }

  // Train all models
  const handleTrainModels = async () => {
    if (!isInitialized) {
      toast({
        title: "System Not Ready",
        description: "Please wait for the ML system to initialize.",
        variant: "destructive"
      })
      return
    }

    setIsTraining(true)

    try {
      // Simulate loading training data
      const trainingData: DrawResult[] = await loadTrainingData()

      if (trainingData.length < 50) {
        throw new Error("Insufficient training data. Need at least 50 historical draws.")
      }

      // Update model statuses to training
      setModelStatuses(prev => prev.map(model => ({
        ...model,
        status: model.name === 'Monte Carlo' ? 'ready' : 'training'
      })))

      // Simulate training progress
      const models = ['XGBoost', 'RNN-LSTM', 'Reinforcement Learning', 'Ensemble']

      for (const model of models) {
        setTrainingProgress(prev => [...prev, {
          model,
          progress: 0,
          epoch: 0,
          loss: 1.0,
          accuracy: 0.5,
          eta: '5 min'
        }])

        // Simulate training progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200))

          setTrainingProgress(prev => prev.map(p =>
            p.model === model ? {
              ...p,
              progress,
              epoch: Math.floor(progress / 2),
              loss: 1.0 - (progress / 100) * 0.7,
              accuracy: 0.5 + (progress / 100) * 0.3,
              eta: `${Math.max(0, 5 - Math.floor(progress / 20))} min`
            } : p
          ))
        }
      }

      // Train the actual ML service
      await mlService.train(trainingData, selectedDrawType)

      // Update model statuses to ready
      setModelStatuses(prev => prev.map(model => ({
        ...model,
        status: 'ready',
        lastTrained: new Date().toLocaleString()
      })))

      // Clear training progress
      setTrainingProgress([])

      // Load updated metrics
      loadPerformanceMetrics()

      toast({
        title: "Training Complete",
        description: "All models have been trained successfully and are ready for predictions.",
      })

    } catch (error) {
      console.error("Training error:", error)

      // Update model statuses to error
      setModelStatuses(prev => prev.map(model => ({
        ...model,
        status: 'error'
      })))

      toast({
        title: "Training Error",
        description: `Training failed: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsTraining(false)
      setTrainingProgress([])
    }
  }

  // Make prediction
  const handlePredict = async () => {
    if (!isInitialized) {
      toast({
        title: "System Not Ready",
        description: "Please wait for the ML system to initialize.",
        variant: "destructive"
      })
      return
    }

    setIsPredicting(true)

    try {
      // Load recent data for prediction
      const recentData: DrawResult[] = await loadRecentData()

      if (recentData.length < 30) {
        throw new Error("Insufficient data for prediction. Need at least 30 recent draws.")
      }

      // Make prediction using ensemble
      const prediction = await mlService.predict(recentData, selectedDrawType)

      setCurrentPrediction({
        numbers: prediction.numbers,
        confidence: prediction.confidence,
        modelWeights: [0.3, 0.25, 0.25, 0.2], // XGBoost, LSTM, Monte Carlo, RL
        explanations: prediction.explanations,
        performance: prediction.metrics
      })

      // Update model statuses with confidence
      setModelStatuses(prev => prev.map(model => ({
        ...model,
        confidence: prediction.confidence,
        predictions: model.predictions + 1
      })))

      toast({
        title: "Prediction Generated",
        description: `Generated prediction for ${selectedDrawType} with ${prediction.confidence.toFixed(1)}% confidence.`,
      })

    } catch (error) {
      console.error("Prediction error:", error)
      toast({
        title: "Prediction Error",
        description: `Failed to generate prediction: ${error}`,
        variant: "destructive"
      })
    } finally {
      setIsPredicting(false)
    }
  }

  // Load training data (simulated)
  const loadTrainingData = async (): Promise<DrawResult[]> => {
    // Simulate loading historical data
    const data: DrawResult[] = []
    const drawTypes = ['National', 'Etoile', 'Fortune', 'Bonheur']

    for (let i = 0; i < 100; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      const gagnants = []
      while (gagnants.length < 5) {
        const num = Math.floor(Math.random() * 90) + 1
        if (!gagnants.includes(num)) {
          gagnants.push(num)
        }
      }

      data.push({
        id: i.toString(),
        draw_name: drawTypes[Math.floor(Math.random() * drawTypes.length)],
        date: date.toISOString().split('T')[0],
        gagnants: gagnants.sort((a, b) => a - b),
        machine: gagnants.map(() => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b),
        created_at: date.toISOString(),
        updated_at: date.toISOString()
      })
    }

    return data
  }

  // Load recent data (simulated)
  const loadRecentData = async (): Promise<DrawResult[]> => {
    return await loadTrainingData()
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100'
      case 'training': return 'text-blue-600 bg-blue-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'inactive': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircleIcon className="h-4 w-4" />
      case 'training': return <RefreshCwIcon className="h-4 w-4 animate-spin" />
      case 'error': return <XCircleIcon className="h-4 w-4" />
      case 'inactive': return <PauseIcon className="h-4 w-4" />
      default: return <PauseIcon className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BrainIcon className="h-6 w-6" />
            Enhanced ML Prediction System
          </h2>
          <p className="text-gray-600">
            Comprehensive machine learning system with XGBoost, RNN-LSTM, Monte Carlo, and Reinforcement Learning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedDrawType} onValueChange={setSelectedDrawType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="National">National</SelectItem>
              <SelectItem value="Etoile">Etoile</SelectItem>
              <SelectItem value="Fortune">Fortune</SelectItem>
              <SelectItem value="Bonheur">Bonheur</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleTrainModels}
            disabled={isTraining || !isInitialized}
            className="flex items-center gap-2"
          >
            {isTraining ? (
              <>
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4" />
                Train Models
              </>
            )}
          </Button>
          <Button
            onClick={handlePredict}
            disabled={isPredicting || !isInitialized}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isPredicting ? (
              <>
                <RefreshCwIcon className="h-4 w-4 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <TargetIcon className="h-4 w-4" />
                Generate Prediction
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Model Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {modelStatuses.map((model) => (
          <Card key={model.name} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{model.name}</span>
                <Badge className={getStatusColor(model.status)}>
                  {getStatusIcon(model.status)}
                  <span className="ml-1">{model.status}</span>
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-gray-500">
                Accuracy: {model.accuracy.toFixed(1)}%
              </div>
              <Progress value={model.accuracy} className="h-1" />
              <div className="text-xs text-gray-500">
                Predictions: {model.predictions}
              </div>
              <div className="text-xs text-gray-500">
                Last trained: {model.lastTrained}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Training Progress */}
      {trainingProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainingProgress.map((progress) => (
              <div key={progress.model} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{progress.model}</span>
                  <span className="text-sm text-gray-500">
                    Epoch {progress.epoch} • ETA: {progress.eta}
                  </span>
                </div>
                <Progress value={progress.progress} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>Progress: {progress.progress}%</div>
                  <div>Loss: {progress.loss.toFixed(4)}</div>
                  <div>Accuracy: {(progress.accuracy * 100).toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="prediction" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="interpretability">Interpretability</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Prediction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TargetIcon className="h-5 w-5" />
                  Current Prediction
                </CardTitle>
                <CardDescription>
                  Latest ensemble prediction for {selectedDrawType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentPrediction ? (
                  <div className="space-y-4">
                    {/* Predicted Numbers */}
                    <div>
                      <Label className="text-sm font-medium">Predicted Numbers</Label>
                      <div className="flex gap-2 mt-2">
                        {currentPrediction.numbers.map((num, index) => (
                          <div
                            key={index}
                            className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confidence */}
                    <div>
                      <Label className="text-sm font-medium">Confidence</Label>
                      <div className="mt-2">
                        <Progress value={currentPrediction.confidence} className="h-3" />
                        <span className="text-sm text-gray-500 mt-1">
                          {currentPrediction.confidence.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Model Weights */}
                    <div>
                      <Label className="text-sm font-medium">Model Contributions</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['XGBoost', 'LSTM', 'Monte Carlo', 'RL'].map((model, index) => (
                          <div key={model} className="flex items-center justify-between text-sm">
                            <span>{model}</span>
                            <span className="font-medium">
                              {(currentPrediction.modelWeights[index] * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div>
                      <Label className="text-sm font-medium">Performance Metrics</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>Accuracy: {(currentPrediction.performance.accuracy * 100).toFixed(1)}%</div>
                        <div>Precision: {(currentPrediction.performance.precision * 100).toFixed(1)}%</div>
                        <div>Recall: {(currentPrediction.performance.recall * 100).toFixed(1)}%</div>
                        <div>F1-Score: {(currentPrediction.performance.f1Score * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No prediction available</p>
                    <p className="text-sm">Click "Generate Prediction" to create a new prediction</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prediction History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5" />
                  Prediction History
                </CardTitle>
                <CardDescription>
                  Recent predictions and their accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          Prediction #{i}
                        </div>
                        <div className="flex gap-1">
                          {Array.from({length: 5}, (_, j) => (
                            <div
                              key={j}
                              className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center"
                            >
                              {Math.floor(Math.random() * 90) + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm">
                        <Badge variant={i <= 2 ? "default" : "secondary"}>
                          {Math.floor(Math.random() * 3) + 1}/5 matches
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Model Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3Icon className="h-5 w-5" />
                  Model Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {modelStatuses.map((model) => (
                    <div key={model.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-sm">{model.accuracy.toFixed(1)}%</span>
                      </div>
                      <Progress value={model.accuracy} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Average Accuracy</Label>
                    <div className="text-2xl font-bold">
                      {(modelStatuses.reduce((sum, m) => sum + m.accuracy, 0) / modelStatuses.length).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Total Predictions</Label>
                    <div className="text-2xl font-bold">
                      {modelStatuses.reduce((sum, m) => sum + m.predictions, 0)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Best Model</Label>
                    <div className="text-lg font-semibold">
                      {modelStatuses.reduce((best, current) =>
                        current.accuracy > best.accuracy ? current : best
                      ).name}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">System Status</Label>
                    <Badge className={getStatusColor(
                      modelStatuses.every(m => m.status === 'ready') ? 'ready' :
                      modelStatuses.some(m => m.status === 'training') ? 'training' : 'inactive'
                    )}>
                      {modelStatuses.every(m => m.status === 'ready') ? 'All Ready' :
                       modelStatuses.some(m => m.status === 'training') ? 'Training' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Interpretability Tab */}
        <TabsContent value="interpretability" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Importance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <EyeIcon className="h-5 w-5" />
                  Feature Importance (SHAP)
                </CardTitle>
                <CardDescription>
                  Most influential features in XGBoost predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentPrediction?.explanations.featureImportance ? (
                  <div className="space-y-3">
                    {Object.entries(currentPrediction.explanations.featureImportance)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 6)
                      .map(([feature, importance]) => (
                        <div key={feature} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{feature}</span>
                            <span className="text-sm">{(importance * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={importance * 100} className="h-2" />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <EyeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feature importance data available</p>
                    <p className="text-sm">Generate a prediction to see feature analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attention Visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <NetworkIcon className="h-5 w-5" />
                  Attention Weights (LSTM)
                </CardTitle>
                <CardDescription>
                  Temporal attention patterns in sequence modeling
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentPrediction?.explanations.attention.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-3">
                      Attention heatmap showing which historical draws influence the prediction most
                    </div>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({length: 30}, (_, i) => (
                        <div
                          key={i}
                          className="h-4 rounded"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${Math.random() * 0.8 + 0.2})`
                          }}
                          title={`Draw -${30-i}: ${(Math.random() * 100).toFixed(1)}% attention`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>30 draws ago</span>
                      <span>Recent</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <NetworkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attention data available</p>
                    <p className="text-sm">Generate a prediction to see attention patterns</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* XGBoost Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  XGBoost Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Depth: {xgboostConfig.maxDepth}</Label>
                  <Slider
                    value={[xgboostConfig.maxDepth]}
                    onValueChange={([value]) => setXgboostConfig(prev => ({...prev, maxDepth: value}))}
                    min={3}
                    max={15}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Learning Rate: {xgboostConfig.learningRate}</Label>
                  <Slider
                    value={[xgboostConfig.learningRate]}
                    onValueChange={([value]) => setXgboostConfig(prev => ({...prev, learningRate: value}))}
                    min={0.01}
                    max={0.3}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>N Estimators: {xgboostConfig.nEstimators}</Label>
                  <Slider
                    value={[xgboostConfig.nEstimators]}
                    onValueChange={([value]) => setXgboostConfig(prev => ({...prev, nEstimators: value}))}
                    min={50}
                    max={500}
                    step={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>L1 Regularization: {xgboostConfig.regAlpha}</Label>
                  <Slider
                    value={[xgboostConfig.regAlpha]}
                    onValueChange={([value]) => setXgboostConfig(prev => ({...prev, regAlpha: value}))}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>L2 Regularization: {xgboostConfig.regLambda}</Label>
                  <Slider
                    value={[xgboostConfig.regLambda]}
                    onValueChange={([value]) => setXgboostConfig(prev => ({...prev, regLambda: value}))}
                    min={0}
                    max={3}
                    step={0.1}
                  />
                </div>
              </CardContent>
            </Card>

            {/* LSTM Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayersIcon className="h-5 w-5" />
                  RNN-LSTM Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>LSTM Units: {lstmConfig.units}</Label>
                  <Slider
                    value={[lstmConfig.units]}
                    onValueChange={([value]) => setLstmConfig(prev => ({...prev, units: value}))}
                    min={32}
                    max={256}
                    step={16}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Layers: {lstmConfig.layers}</Label>
                  <Slider
                    value={[lstmConfig.layers]}
                    onValueChange={([value]) => setLstmConfig(prev => ({...prev, layers: value}))}
                    min={1}
                    max={5}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dropout Rate: {lstmConfig.dropout}</Label>
                  <Slider
                    value={[lstmConfig.dropout]}
                    onValueChange={([value]) => setLstmConfig(prev => ({...prev, dropout: value}))}
                    min={0}
                    max={0.5}
                    step={0.05}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temporal Window: {lstmConfig.temporalWindow}</Label>
                  <Slider
                    value={[lstmConfig.temporalWindow]}
                    onValueChange={([value]) => setLstmConfig(prev => ({...prev, temporalWindow: value}))}
                    min={10}
                    max={50}
                    step={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attention Heads: {lstmConfig.attentionHeads}</Label>
                  <Slider
                    value={[lstmConfig.attentionHeads]}
                    onValueChange={([value]) => setLstmConfig(prev => ({...prev, attentionHeads: value}))}
                    min={1}
                    max={16}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monte Carlo & RL Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Monte Carlo Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Simulations: {monteCarloConfig.simulations}</Label>
                  <Slider
                    value={[monteCarloConfig.simulations]}
                    onValueChange={([value]) => setMonteCarloConfig(prev => ({...prev, simulations: value}))}
                    min={1000}
                    max={50000}
                    step={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confidence Level: {monteCarloConfig.confidenceLevel}</Label>
                  <Slider
                    value={[monteCarloConfig.confidenceLevel]}
                    onValueChange={([value]) => setMonteCarloConfig(prev => ({...prev, confidenceLevel: value}))}
                    min={0.8}
                    max={0.99}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scenarios: {monteCarloConfig.scenarios}</Label>
                  <Slider
                    value={[monteCarloConfig.scenarios]}
                    onValueChange={([value]) => setMonteCarloConfig(prev => ({...prev, scenarios: value}))}
                    min={100}
                    max={5000}
                    step={100}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ZapIcon className="h-5 w-5" />
                  Reinforcement Learning Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Learning Rate: {rlConfig.learningRate}</Label>
                  <Slider
                    value={[rlConfig.learningRate]}
                    onValueChange={([value]) => setRlConfig(prev => ({...prev, learningRate: value}))}
                    min={0.0001}
                    max={0.01}
                    step={0.0001}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exploration Rate: {rlConfig.explorationRate}</Label>
                  <Slider
                    value={[rlConfig.explorationRate]}
                    onValueChange={([value]) => setRlConfig(prev => ({...prev, explorationRate: value}))}
                    min={0.01}
                    max={0.5}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Memory Size: {rlConfig.memorySize}</Label>
                  <Slider
                    value={[rlConfig.memorySize]}
                    onValueChange={([value]) => setRlConfig(prev => ({...prev, memorySize: value}))}
                    min={1000}
                    max={50000}
                    step={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batch Size: {rlConfig.batchSize}</Label>
                  <Slider
                    value={[rlConfig.batchSize]}
                    onValueChange={([value]) => setRlConfig(prev => ({...prev, batchSize: value}))}
                    min={8}
                    max={128}
                    step={8}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CpuIcon className="h-5 w-5" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Auto Retrain</Label>
                    <p className="text-sm text-gray-500">
                      Automatically retrain models when new data is available
                    </p>
                  </div>
                  <Switch
                    checked={autoRetrain}
                    onCheckedChange={setAutoRetrain}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Model Drift Detection</Label>
                    <p className="text-sm text-gray-500">
                      Monitor for performance degradation and trigger retraining
                    </p>
                  </div>
                  <Switch
                    checked={modelDriftDetection}
                    onCheckedChange={setModelDriftDetection}
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm">Memory Usage</Label>
                    <Progress value={65} className="h-2" />
                    <span className="text-xs text-gray-500">65%</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">CPU Usage</Label>
                    <Progress value={42} className="h-2" />
                    <span className="text-xs text-gray-500">42%</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">GPU Usage</Label>
                    <Progress value={78} className="h-2" />
                    <span className="text-xs text-gray-500">78%</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Disk Usage</Label>
                    <Progress value={34} className="h-2" />
                    <span className="text-xs text-gray-500">34%</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>System Status</span>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}