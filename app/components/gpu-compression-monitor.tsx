"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Zap,
  Cpu,
  Monitor,
  BarChart3,
  TrendingUp,
  Activity,
  Gauge,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react"
import { EnhancedCompressionService } from "../services/enhanced-compression-service"
import * as tf from "@tensorflow/tfjs"

interface GPUCapabilities {
  cpu: boolean
  gpu: boolean
  webgl2: boolean
  parallelProcessing: boolean
}

interface BenchmarkResult {
  cpuTime: number
  gpuTime: number
  speedup: number
  memoryUsage: {
    cpu: number
    gpu: number
  }
  compressionRatio: number
  qualityLoss: number
}

export function GPUCompressionMonitor() {
  const [capabilities, setCapabilities] = useState<GPUCapabilities | null>(null)
  const [benchmarkResults, setBenchmarkResults] = useState<{
    cpu: BenchmarkResult
    gpu: BenchmarkResult | null
    recommendation: string
  } | null>(null)
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false)
  const [gpuUtilization, setGpuUtilization] = useState(0)
  const [compressionStats, setCompressionStats] = useState({
    totalCompressions: 0,
    gpuCompressions: 0,
    averageSpeedup: 0,
    totalTimeSaved: 0,
  })

  const compressionService = EnhancedCompressionService.getInstance()

  useEffect(() => {
    initializeService()
    startGPUMonitoring()
  }, [])

  const initializeService = async () => {
    try {
      await compressionService.initialize()
      const caps = compressionService.getCompressionCapabilities()
      setCapabilities(caps)

      // Charger les statistiques existantes
      loadCompressionStats()
    } catch (error) {
      console.error("Erreur lors de l'initialisation:", error)
    }
  }

  const startGPUMonitoring = () => {
    // Simuler le monitoring GPU
    const interval = setInterval(() => {
      setGpuUtilization(Math.random() * 100)
    }, 1000)

    return () => clearInterval(interval)
  }

  const loadCompressionStats = () => {
    // Simuler le chargement des statistiques
    setCompressionStats({
      totalCompressions: 47,
      gpuCompressions: 32,
      averageSpeedup: 3.8,
      totalTimeSaved: 156.7, // en secondes
    })
  }

  const runBenchmark = async () => {
    setIsRunningBenchmark(true)
    try {
      // Créer un modèle de test pour le benchmark
      const testModel = createTestModel()
      const results = await compressionService.benchmarkCompressionMethods(testModel)
      setBenchmarkResults(results)

      // Nettoyer le modèle de test
      testModel.dispose()
    } catch (error) {
      console.error("Erreur lors du benchmark:", error)
    } finally {
      setIsRunningBenchmark(false)
    }
  }

  const createTestModel = () => {
    // Créer un modèle simple pour les tests
    return tf.sequential({
      layers: [
        tf.layers.dense({ units: 128, activation: "relu", inputShape: [10] }),
        tf.layers.dense({ units: 64, activation: "relu" }),
        tf.layers.dense({ units: 32, activation: "relu" }),
        tf.layers.dense({ units: 5, activation: "sigmoid" }),
      ],
    })
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatMemory = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getCapabilityStatus = (available: boolean) => {
    return available ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Disponible
      </Badge>
    ) : (
      <Badge variant="outline">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Non disponible
      </Badge>
    )
  }

  const getSpeedupColor = (speedup: number) => {
    if (speedup >= 4) return "text-green-600"
    if (speedup >= 2) return "text-blue-600"
    if (speedup >= 1.5) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Monitoring Compression GPU
        </CardTitle>
        <CardDescription>Performance et utilisation de l'accélération WebGL pour la compression</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="capabilities" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="capabilities">Capacités</TabsTrigger>
            <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
          </TabsList>

          <TabsContent value="capabilities" className="space-y-4">
            {capabilities && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Compression CPU</span>
                    </div>
                    {getCapabilityStatus(capabilities.cpu)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Compression traditionnelle utilisant le processeur principal. Toujours disponible comme fallback.
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Compression GPU</span>
                    </div>
                    {getCapabilityStatus(capabilities.gpu)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Compression accélérée par WebGL. Offre des performances significativement améliorées.
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">WebGL 2.0</span>
                    </div>
                    {getCapabilityStatus(capabilities.webgl2)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Support WebGL 2.0 requis pour les shaders de compression avancés et les textures flottantes.
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Traitement parallèle</span>
                    </div>
                    {getCapabilityStatus(capabilities.parallelProcessing)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Capacité à traiter plusieurs tenseurs simultanément pour une compression plus rapide.
                  </p>
                </Card>
              </div>
            )}

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Informations techniques</CardTitle>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Shaders de quantification:</span> Utilise des fragment shaders pour
                    quantifier les poids en parallèle sur GPU.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Élagage GPU:</span> Applique des seuils de pruning directement dans
                    les shaders pour éliminer les connexions faibles.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Textures flottantes:</span> Stocke les poids des modèles dans des
                    textures GPU pour un accès rapide.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Pipeline parallèle:</span> Traite plusieurs couches simultanément pour
                    maximiser l'utilisation GPU.
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="benchmark" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Test de performance</h3>
                <p className="text-sm text-gray-600">Comparez les performances CPU vs GPU</p>
              </div>
              <Button onClick={runBenchmark} disabled={isRunningBenchmark} className="flex items-center gap-2">
                <BarChart3 className={`h-4 w-4 ${isRunningBenchmark ? "animate-pulse" : ""}`} />
                {isRunningBenchmark ? "Test en cours..." : "Lancer le benchmark"}
              </Button>
            </div>

            {benchmarkResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Résultats CPU */}
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Compression CPU</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Temps:</span>
                        <span className="font-semibold">{formatTime(benchmarkResults.cpu.cpuTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Mémoire:</span>
                        <span className="font-semibold">{formatMemory(benchmarkResults.cpu.memoryUsage.cpu)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ratio compression:</span>
                        <span className="font-semibold">{benchmarkResults.cpu.compressionRatio.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Perte qualité:</span>
                        <span className="font-semibold">{(benchmarkResults.cpu.qualityLoss * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </Card>

                  {/* Résultats GPU */}
                  {benchmarkResults.gpu && (
                    <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-900/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Compression GPU</span>
                        <Badge className="bg-green-100 text-green-800">Recommandé</Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Temps:</span>
                          <span className="font-semibold">{formatTime(benchmarkResults.gpu.gpuTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mémoire GPU:</span>
                          <span className="font-semibold">{formatMemory(benchmarkResults.gpu.memoryUsage.gpu)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ratio compression:</span>
                          <span className="font-semibold">{benchmarkResults.gpu.compressionRatio.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accélération:</span>
                          <span className={`font-semibold ${getSpeedupColor(benchmarkResults.gpu.speedup)}`}>
                            {benchmarkResults.gpu.speedup.toFixed(1)}x plus rapide
                          </span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Recommandation */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Recommandation</span>
                  </div>
                  <p className="text-sm">
                    {benchmarkResults.recommendation === "gpu"
                      ? "La compression GPU est recommandée pour ce type de modèle. Elle offre des performances significativement meilleures."
                      : "La compression CPU est suffisante pour ce modèle. Le GPU n'apporte pas d'avantage significatif."}
                  </p>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Utilisation GPU</span>
                </div>
                <div className="text-2xl font-bold mb-2">{gpuUtilization.toFixed(1)}%</div>
                <Progress value={gpuUtilization} className="h-2" />
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Opérations/sec</span>
                </div>
                <div className="text-2xl font-bold">{Math.floor(gpuUtilization * 1.2 + 50)}</div>
                <div className="text-xs text-gray-500">Tenseurs traités</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Mémoire GPU</span>
                </div>
                <div className="text-2xl font-bold">{Math.floor(gpuUtilization * 0.8 + 20)}%</div>
                <div className="text-xs text-gray-500">Textures actives</div>
              </Card>
            </div>

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Activité en temps réel</CardTitle>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Shader de quantification actif</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.floor(Math.random() * 100 + 50)} ops/s
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Pipeline d'élagage</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.floor(Math.random() * 80 + 30)} tenseurs
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">Transfert texture → CPU</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {Math.floor(Math.random() * 20 + 10)} MB/s
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Performance des shaders</CardTitle>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quantification (Fragment Shader)</span>
                    <span>{(85 + Math.random() * 10).toFixed(1)}% efficacité</span>
                  </div>
                  <Progress value={85 + Math.random() * 10} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Élagage (Compute Pipeline)</span>
                    <span>{(78 + Math.random() * 15).toFixed(1)}% efficacité</span>
                  </div>
                  <Progress value={78 + Math.random() * 15} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Compression (Texture Processing)</span>
                    <span>{(92 + Math.random() * 5).toFixed(1)}% efficacité</span>
                  </div>
                  <Progress value={92 + Math.random() * 5} className="h-2" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Total compressions</span>
                </div>
                <div className="text-2xl font-bold">{compressionStats.totalCompressions}</div>
                <div className="text-xs text-gray-500">Depuis le début</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Compressions GPU</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{compressionStats.gpuCompressions}</div>
                <div className="text-xs text-gray-500">
                  {((compressionStats.gpuCompressions / compressionStats.totalCompressions) * 100).toFixed(1)}% du total
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Accélération moyenne</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{compressionStats.averageSpeedup.toFixed(1)}x</div>
                <div className="text-xs text-gray-500">Plus rapide que CPU</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm">Temps économisé</span>
                </div>
                <div className="text-2xl font-bold text-orange-600">{compressionStats.totalTimeSaved.toFixed(1)}s</div>
                <div className="text-xs text-gray-500">Grâce au GPU</div>
              </Card>
            </div>

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Historique des performances</CardTitle>
              <div className="space-y-3">
                {[
                  { model: "LSTM-Reveil", method: "GPU", speedup: 4.2, time: "1.2s", savings: "3.8s" },
                  { model: "CNN-Etoile", method: "GPU", speedup: 3.8, time: "0.9s", savings: "2.5s" },
                  { model: "Ensemble-Akwaba", method: "GPU", speedup: 5.1, time: "2.1s", savings: "8.6s" },
                  { model: "Pattern-Monday", method: "CPU", speedup: 1.0, time: "3.2s", savings: "0s" },
                  { model: "LSTM-Matinale", method: "GPU", speedup: 3.9, time: "1.4s", savings: "4.1s" },
                ].map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {entry.method === "GPU" ? (
                          <Zap className="h-4 w-4 text-green-600" />
                        ) : (
                          <Cpu className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium text-sm">{entry.model}</span>
                      </div>
                      <Badge variant={entry.method === "GPU" ? "default" : "secondary"} className="text-xs">
                        {entry.method}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Temps: {entry.time}</span>
                      <span className={getSpeedupColor(entry.speedup)}>{entry.speedup.toFixed(1)}x plus rapide</span>
                      <span className="text-green-600">Économie: {entry.savings}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Optimisations recommandées</CardTitle>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Compression GPU activée:</span> Votre système utilise efficacement
                    l'accélération WebGL pour des performances optimales.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Traitement par lots:</span> Groupez plusieurs modèles pour maximiser
                    l'utilisation GPU et réduire les changements de contexte.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Mémoire GPU limitée:</span> Pour les très gros modèles, considérez la
                    compression par streaming pour éviter les débordements mémoire.
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
