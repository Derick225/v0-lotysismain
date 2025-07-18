'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { 
  useRealtimeML, 
  useMLMetrics, 
  useModelComparison, 
  useAIPredictions 
} from '../hooks/use-realtime-ml'
import type { MLModel } from '../lib/realtime-ml-manager'

interface MLDashboardProps {
  className?: string
}

export function MLDashboard({ className }: MLDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedModels, setSelectedModels] = useState<string[]>([])

  const {
    models,
    metrics,
    systemStatus,
    forceTraining,
    isTraining,
    error
  } = useRealtimeML()

  const { modelStats, learningStats, healthScore } = useMLMetrics()
  const { compareModels } = useModelComparison()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Brain" critical size={20} />
            Intelligence Artificielle
            <Badge variant={healthScore >= 80 ? "default" : healthScore >= 60 ? "secondary" : "destructive"}>
              Santé: {healthScore.toFixed(0)}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="models">Modèles</TabsTrigger>
              <TabsTrigger value="training">Entraînement</TabsTrigger>
              <TabsTrigger value="predictions">Prédictions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <MLOverviewSection 
                modelStats={modelStats}
                learningStats={learningStats}
                systemStatus={systemStatus}
                healthScore={healthScore}
              />
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <MLModelsSection 
                models={models}
                selectedModels={selectedModels}
                onSelectionChange={setSelectedModels}
                compareModels={compareModels}
              />
            </TabsContent>

            <TabsContent value="training" className="space-y-4">
              <MLTrainingSection 
                metrics={metrics}
                systemStatus={systemStatus}
                onForceTraining={forceTraining}
                isTraining={isTraining}
              />
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <MLPredictionsSection />
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <OptimizedIcon name="AlertCircle" critical size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Section vue d'ensemble
function MLOverviewSection({ 
  modelStats, 
  learningStats, 
  systemStatus, 
  healthScore 
}: {
  modelStats: any
  learningStats: any
  systemStatus: any
  healthScore: number
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{modelStats.activeModels}</div>
            <div className="text-sm text-muted-foreground">Modèles actifs</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{(modelStats.avgAccuracy * 100).toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Précision moyenne</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{learningStats.totalSamples}</div>
            <div className="text-sm text-muted-foreground">Échantillons</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{systemStatus.queueSize || 0}</div>
            <div className="text-sm text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Santé du Système IA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Score global</span>
                <span>{healthScore.toFixed(0)}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progrès d'apprentissage</span>
                <span>{learningStats.learningProgress.toFixed(0)}%</span>
              </div>
              <Progress value={learningStats.learningProgress} className="h-2" />
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${systemStatus.isTraining ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Entraînement {systemStatus.isTraining ? 'actif' : 'inactif'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${learningStats.isConverged ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                <span>{learningStats.isConverged ? 'Convergé' : 'En apprentissage'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${systemStatus.workersCount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{systemStatus.workersCount || 0} worker(s)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {learningStats.accuracyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendance de Précision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end gap-1">
              {learningStats.accuracyTrend.slice(-20).map((point: any, index: number) => (
                <div
                  key={index}
                  className="bg-blue-500 rounded-t flex-1 min-w-0"
                  style={{ height: `${point.accuracy * 100}%` }}
                  title={`${new Date(point.date).toLocaleDateString()}: ${(point.accuracy * 100).toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              Évolution sur les 20 derniers points
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Section des modèles
function MLModelsSection({ 
  models, 
  selectedModels, 
  onSelectionChange, 
  compareModels 
}: {
  models: MLModel[]
  selectedModels: string[]
  onSelectionChange: (models: string[]) => void
  compareModels: (ids: string[]) => any[]
}) {
  const comparison = selectedModels.length > 0 ? compareModels(selectedModels) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Modèles IA ({models.length})</h3>
        {selectedModels.length > 1 && (
          <Badge variant="outline">
            {selectedModels.length} sélectionnés pour comparaison
          </Badge>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={selectedModels.includes(model.id)}
            onToggleSelection={(selected) => {
              if (selected) {
                onSelectionChange([...selectedModels, model.id])
              } else {
                onSelectionChange(selectedModels.filter(id => id !== model.id))
              }
            }}
          />
        ))}
      </div>

      {comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comparaison des Modèles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparison.map((model, index) => (
                <div key={model.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      #{model.rank}
                    </Badge>
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{(model.performance?.accuracy * 100 || 0).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Précision</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Carte de modèle individuel
function ModelCard({ 
  model, 
  isSelected, 
  onToggleSelection 
}: { 
  model: MLModel
  isSelected: boolean
  onToggleSelection: (selected: boolean) => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'default'
      case 'training': return 'secondary'
      case 'updating': return 'secondary'
      case 'error': return 'destructive'
      default: return 'outline'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'neural_network': return 'Network'
      case 'random_forest': return 'TreePine'
      case 'gradient_boosting': return 'TrendingUp'
      case 'ensemble': return 'Layers'
      default: return 'Bot'
    }
  }

  return (
    <Card 
      className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}
      onClick={() => onToggleSelection(!isSelected)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <OptimizedIcon 
              name={getTypeIcon(model.type)} 
              category="interface" 
              size={16} 
            />
            <h4 className="font-medium text-sm">{model.name}</h4>
          </div>
          <Badge variant={getStatusColor(model.status)}>
            {model.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Précision</span>
            <span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Échantillons</span>
            <span>{model.trainingData.samples}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Version</span>
            <span className="font-mono text-xs">{model.version}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Dernière MAJ</span>
            <span className="text-xs">
              {new Date(model.trainingData.lastUpdate).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1">Performance</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-medium">{(model.performance.precision * 100).toFixed(0)}%</div>
              <div className="text-muted-foreground">Précision</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{(model.performance.recall * 100).toFixed(0)}%</div>
              <div className="text-muted-foreground">Rappel</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{(model.performance.f1Score * 100).toFixed(0)}%</div>
              <div className="text-muted-foreground">F1</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Section d'entraînement
function MLTrainingSection({ 
  metrics, 
  systemStatus, 
  onForceTraining, 
  isTraining 
}: {
  metrics: any
  systemStatus: any
  onForceTraining: () => Promise<boolean>
  isTraining: boolean
}) {
  const [isForcing, setIsForcing] = useState(false)

  const handleForceTraining = async () => {
    setIsForcing(true)
    try {
      await onForceTraining()
    } finally {
      setIsForcing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Entraînement Continu</h3>
        <AccessibleButton
          onClick={handleForceTraining}
          disabled={isTraining || isForcing || systemStatus.queueSize === 0}
          variant="outline"
        >
          <OptimizedIcon 
            name={isForcing ? "Loader2" : "Zap"} 
            critical 
            size={16} 
            className={`mr-2 ${isForcing ? 'animate-spin' : ''}`}
          />
          Forcer l'entraînement
        </AccessibleButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Statut d'Entraînement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">État</span>
                <Badge variant={isTraining ? "default" : "secondary"}>
                  {isTraining ? 'En cours' : 'Inactif'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Queue</span>
                <span className="font-medium">{systemStatus.queueSize || 0} échantillons</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Workers</span>
                <span className="font-medium">{systemStatus.workersCount || 0} actifs</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Taux d'apprentissage</span>
                <span className="font-mono text-sm">{metrics.learningRate.toFixed(6)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Métriques d'Apprentissage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total échantillons</span>
                <span className="font-medium">{metrics.totalSamples}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Convergence</span>
                <Badge variant={metrics.convergence ? "default" : "secondary"}>
                  {metrics.convergence ? 'Convergé' : 'En cours'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Tendance</span>
                <span className="text-sm">
                  {metrics.accuracyTrend.length > 1 ? (
                    metrics.accuracyTrend[metrics.accuracyTrend.length - 1].accuracy > 
                    metrics.accuracyTrend[metrics.accuracyTrend.length - 2].accuracy ? '📈' : '📉'
                  ) : '➡️'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {metrics.featureImportance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Importance des Caractéristiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.featureImportance.slice(0, 10).map((feature: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-24 truncate">{feature.feature}</span>
                  <div className="flex-1">
                    <Progress value={feature.importance * 100} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {(feature.importance * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Section des prédictions
function MLPredictionsSection() {
  const { predictNumbers, isPredicting, bestModelAccuracy, isAvailable } = useAIPredictions()
  const [selectedDraw, setSelectedDraw] = useState('euromillions')
  const [lastPrediction, setLastPrediction] = useState<any>(null)

  const handlePredict = async () => {
    const prediction = await predictNumbers(selectedDraw)
    setLastPrediction(prediction)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Prédictions IA</h3>
        <Badge variant={isAvailable ? "default" : "destructive"}>
          {isAvailable ? 'Disponible' : 'Indisponible'}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tirage</label>
            <select
              value={selectedDraw}
              onChange={(e) => setSelectedDraw(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="euromillions">EuroMillions</option>
              <option value="loto">Loto</option>
              <option value="keno">Keno</option>
            </select>
          </div>

          <AccessibleButton
            onClick={handlePredict}
            disabled={!isAvailable || isPredicting}
            className="w-full"
          >
            <OptimizedIcon 
              name={isPredicting ? "Loader2" : "Brain"} 
              critical 
              size={16} 
              className={`mr-2 ${isPredicting ? 'animate-spin' : ''}`}
            />
            {isPredicting ? 'Génération...' : 'Générer une prédiction IA'}
          </AccessibleButton>

          {lastPrediction && (
            <div className="p-4 border rounded bg-muted/50">
              <h4 className="font-medium mb-2">Dernière prédiction</h4>
              <div className="flex items-center gap-2 mb-2">
                {lastPrediction.numbers.map((num: number, index: number) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                  >
                    {num}
                  </div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Confiance: {lastPrediction.confidence.toFixed(1)}% • Algorithme: {lastPrediction.algorithm}
              </div>
              {lastPrediction.reasoning && (
                <div className="text-xs text-muted-foreground mt-1">
                  {lastPrediction.reasoning.join(' • ')}
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Précision du meilleur modèle</span>
              <span className="font-medium">{(bestModelAccuracy * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
