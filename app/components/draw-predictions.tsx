"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Zap, RefreshCw, TrendingUp, Target, Star, Lightbulb, BarChart3, Clock, CheckCircle } from "lucide-react"
import { getNumberColor, type DrawResult, formatDateTime } from "../lib/constants"
import { aiPredictionEngine, type PredictionResult, type ModelPerformance } from "../lib/ai-prediction-engine"
import { useOfflineCache } from "../hooks/use-offline-cache"
import { useQuickPredictionSave } from "../hooks/use-prediction-history"

interface DrawPredictionsProps {
  drawName: string
  data: DrawResult[]
}

export function DrawPredictions({ drawName, data }: DrawPredictionsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<string[]>(['all'])
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Cache pour les prédictions
  const { getCachedPredictions, setCachedPredictions, isOnline } = useOfflineCache()
  const { saveQuick } = useQuickPredictionSave()

  // Initialiser le moteur IA au montage
  useEffect(() => {
    const initializeEngine = async () => {
      if (isInitialized) return
      
      setIsInitializing(true)
      try {
        await aiPredictionEngine.initialize()
        const performance = aiPredictionEngine.getModelPerformance()
        setModelPerformance(performance)
        setIsInitialized(true)
        
        // Charger les prédictions en cache si disponibles
        const cachedPredictions = await getCachedPredictions(drawName)
        if (cachedPredictions) {
          setPredictions(cachedPredictions)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur initialisation IA')
        console.error('Erreur initialisation moteur IA:', err)
      } finally {
        setIsInitializing(false)
      }
    }

    initializeEngine()
  }, [drawName, getCachedPredictions, isInitialized])

  // Générer des prédictions
  const generatePredictions = async () => {
    if (!isInitialized || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const algorithms = selectedAlgorithms.includes('all') 
        ? ['FREQUENCY_ANALYSIS', 'PATTERN_RECOGNITION', 'LSTM_NEURAL', 'XGBOOST_ENSEMBLE']
        : selectedAlgorithms

      const newPredictions = await aiPredictionEngine.generatePredictions({
        drawName,
        historicalData: data,
        algorithms,
        minConfidence: 0.5
      })

      setPredictions(newPredictions)

      // Sauvegarder dans le cache
      await setCachedPredictions(drawName, newPredictions)

      // Sauvegarder automatiquement dans l'historique
      if (newPredictions.length > 0) {
        const bestPrediction = newPredictions[0] // Prendre la meilleure prédiction
        try {
          await saveQuick(
            drawName,
            bestPrediction.algorithm,
            bestPrediction.numbers,
            bestPrediction.confidence,
            bestPrediction.reasoning
          )
          console.log(`📚 Prédiction sauvegardée dans l'historique`)
        } catch (historyError) {
          console.warn('Erreur sauvegarde historique:', historyError)
        }
      }

      console.log(`✅ ${newPredictions.length} prédictions générées pour ${drawName}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur génération prédictions'
      setError(errorMessage)
      console.error('Erreur génération prédictions:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Prédiction recommandée (meilleure confiance)
  const recommendedPrediction = useMemo(() => {
    return predictions.length > 0 ? predictions[0] : null
  }, [predictions])

  // Statistiques des prédictions
  const predictionStats = useMemo(() => {
    if (predictions.length === 0) return null

    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    const maxConfidence = Math.max(...predictions.map(p => p.confidence))
    const minConfidence = Math.min(...predictions.map(p => p.confidence))

    return { avgConfidence, maxConfidence, minConfidence }
  }, [predictions])

  if (isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            Initialisation du Moteur IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Chargement des modèles de prédiction...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Prédictions IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {error || 'Le moteur de prédiction IA n\'est pas disponible.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Prédictions IA - {drawName}
            </CardTitle>
            <div className="flex items-center gap-2">
              {!isOnline && (
                <Badge variant="outline" className="text-orange-600">
                  Mode hors ligne
                </Badge>
              )}
              <Badge variant="secondary">
                {data.length} échantillons
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sélection des algorithmes */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Algorithmes:</label>
            <Select
              value={selectedAlgorithms.includes('all') ? 'all' : selectedAlgorithms[0]}
              onValueChange={(value) => setSelectedAlgorithms(value === 'all' ? ['all'] : [value])}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les algorithmes</SelectItem>
                <SelectItem value="FREQUENCY_ANALYSIS">Analyse de Fréquence</SelectItem>
                <SelectItem value="PATTERN_RECOGNITION">Reconnaissance de Motifs</SelectItem>
                <SelectItem value="LSTM_NEURAL">Réseau LSTM</SelectItem>
                <SelectItem value="XGBOOST_ENSEMBLE">XGBoost Ensemble</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bouton de génération */}
          <Button 
            onClick={generatePredictions} 
            disabled={isGenerating || !isOnline}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Générer des Prédictions
              </>
            )}
          </Button>

          {error && (
            <Alert>
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Prédiction recommandée */}
      {recommendedPrediction && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Star className="h-5 w-5" />
              Prédiction Recommandée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-green-600">
                {recommendedPrediction.algorithm}
              </Badge>
              <div className="flex items-center gap-2">
                <Progress value={recommendedPrediction.confidence * 100} className="w-20" />
                <span className="text-sm font-medium">
                  {Math.round(recommendedPrediction.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {recommendedPrediction.numbers.map((num, idx) => (
                <div
                  key={idx}
                  className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${getNumberColor(num)}`}
                >
                  {num}
                </div>
              ))}
            </div>

            <div className="text-sm text-green-700">
              <p className="font-medium mb-1">Explication:</p>
              <p>{recommendedPrediction.explanation}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toutes les prédictions */}
      {predictions.length > 0 && (
        <Tabs defaultValue="predictions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions">Prédictions</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            {predictions.map((prediction, index) => (
              <Card key={prediction.id} className={index === 0 ? "border-blue-200" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {index === 0 && <Target className="h-4 w-4 text-blue-500" />}
                      {prediction.algorithm}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Progress value={prediction.confidence * 100} className="w-20" />
                      <span className="text-sm font-medium">
                        {Math.round(prediction.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    {prediction.numbers.map((num, idx) => (
                      <div
                        key={idx}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg ${getNumberColor(num)}`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {prediction.explanation}
                    </p>
                    
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">
                        Détails du raisonnement
                      </summary>
                      <ul className="mt-2 space-y-1 ml-4">
                        {prediction.reasoning.map((reason, idx) => (
                          <li key={idx} className="list-disc">{reason}</li>
                        ))}
                      </ul>
                    </details>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Modèle: v{prediction.metadata.modelVersion}</span>
                      <span>Précision: {Math.round(prediction.metadata.accuracy * 100)}%</span>
                      <span>Données: {prediction.metadata.trainingData}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {predictionStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analyse des Prédictions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(predictionStats.maxConfidence * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Confiance Max</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(predictionStats.avgConfidence * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Confiance Moy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(predictionStats.minConfidence * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Confiance Min</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {modelPerformance.map((perf) => (
              <Card key={perf.algorithm}>
                <CardHeader>
                  <CardTitle className="text-lg">{perf.algorithm}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Précision</div>
                      <div className="flex items-center gap-2">
                        <Progress value={perf.accuracy * 100} className="flex-1" />
                        <span className="text-sm font-medium">
                          {Math.round(perf.accuracy * 100)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">F1-Score</div>
                      <div className="flex items-center gap-2">
                        <Progress value={perf.f1Score * 100} className="flex-1" />
                        <span className="text-sm font-medium">
                          {Math.round(perf.f1Score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Prédictions totales: {perf.totalPredictions}</span>
                    <span>Dernière évaluation: {formatDateTime(perf.lastEvaluated)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {predictions.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="text-center py-8">
            <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune prédiction disponible</h3>
            <p className="text-muted-foreground mb-4">
              Cliquez sur "Générer des Prédictions" pour obtenir des recommandations IA.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
