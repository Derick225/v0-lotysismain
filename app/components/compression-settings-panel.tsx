"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Zap,
  Settings,
  BarChart3,
  TrendingDown,
  HardDrive,
  Gauge,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CompressionSettings {
  level: "fast" | "balanced" | "maximum"
  quantization: boolean
  pruning: boolean
  weightSharing: boolean
  autoOptimize: boolean
  compressionThreshold: number
}

interface CompressionStats {
  totalSavings: number
  averageRatio: number
  modelsCompressed: number
  lastOptimization: number | null
}

export function CompressionSettingsPanel() {
  const [settings, setSettings] = useState<CompressionSettings>({
    level: "balanced",
    quantization: true,
    pruning: true,
    weightSharing: false,
    autoOptimize: true,
    compressionThreshold: 1024 * 1024, // 1MB
  })

  const [stats, setStats] = useState<CompressionStats>({
    totalSavings: 0,
    averageRatio: 1,
    modelsCompressed: 0,
    lastOptimization: null,
  })

  const [isOptimizing, setIsOptimizing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
    loadStats()
  }, [])

  const loadSettings = () => {
    const savedSettings = localStorage.getItem("compressionSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }

  const loadStats = () => {
    // Simuler le chargement des statistiques
    setStats({
      totalSavings: 15.7 * 1024 * 1024, // 15.7 MB
      averageRatio: 3.2,
      modelsCompressed: 12,
      lastOptimization: Date.now() - 2 * 60 * 60 * 1000, // Il y a 2 heures
    })
  }

  const saveSettings = (newSettings: CompressionSettings) => {
    setSettings(newSettings)
    localStorage.setItem("compressionSettings", JSON.stringify(newSettings))
    toast({
      title: "Paramètres sauvegardés",
      description: "Les nouveaux paramètres de compression ont été appliqués.",
    })
  }

  const handleOptimizeAll = async () => {
    setIsOptimizing(true)
    try {
      // Simuler l'optimisation de tous les modèles
      await new Promise((resolve) => setTimeout(resolve, 3000))

      setStats((prev) => ({
        ...prev,
        totalSavings: prev.totalSavings + 5.2 * 1024 * 1024,
        averageRatio: prev.averageRatio + 0.3,
        lastOptimization: Date.now(),
      }))

      toast({
        title: "Optimisation terminée",
        description: "Tous les modèles ont été recompressés avec les nouveaux paramètres.",
      })
    } catch (error) {
      toast({
        title: "Erreur d'optimisation",
        description: "Impossible d'optimiser les modèles.",
        variant: "destructive",
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Jamais"
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) return `Il y a ${hours}h ${minutes}min`
    return `Il y a ${minutes} min`
  }

  const getCompressionLevelInfo = (level: string) => {
    switch (level) {
      case "fast":
        return {
          description: "Compression rapide avec ratio modéré",
          ratio: "2-3x",
          time: "Rapide",
          quality: "Excellente",
          color: "text-blue-600",
        }
      case "balanced":
        return {
          description: "Équilibre optimal entre vitesse et compression",
          ratio: "3-5x",
          time: "Modéré",
          quality: "Très bonne",
          color: "text-green-600",
        }
      case "maximum":
        return {
          description: "Compression maximale, plus lente",
          ratio: "5-8x",
          time: "Lent",
          quality: "Bonne",
          color: "text-orange-600",
        }
      default:
        return {
          description: "",
          ratio: "",
          time: "",
          quality: "",
          color: "",
        }
    }
  }

  const levelInfo = getCompressionLevelInfo(settings.level)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Paramètres de Compression
        </CardTitle>
        <CardDescription>Configuration avancée de la compression des modèles ML</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="advanced">Avancé</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            {/* Niveau de compression */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Niveau de compression</Label>
                <p className="text-sm text-gray-600 mb-3">Choisissez le niveau d'optimisation des modèles</p>
              </div>

              <Select
                value={settings.level}
                onValueChange={(value: "fast" | "balanced" | "maximum") => saveSettings({ ...settings, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span>Rapide</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-green-600" />
                      <span>Équilibré</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maximum">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      <span>Maximum</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <Info className={`h-5 w-5 mt-0.5 ${levelInfo.color}`} />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{levelInfo.description}</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Ratio:</span> {levelInfo.ratio}
                      </div>
                      <div>
                        <span className="font-medium">Vitesse:</span> {levelInfo.time}
                      </div>
                      <div>
                        <span className="font-medium">Qualité:</span> {levelInfo.quality}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Options de compression */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Techniques de compression</Label>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="quantization">Quantification des poids</Label>
                    <p className="text-sm text-gray-600">Réduit la précision des poids pour économiser l'espace</p>
                  </div>
                  <Switch
                    id="quantization"
                    checked={settings.quantization}
                    onCheckedChange={(checked) => saveSettings({ ...settings, quantization: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="pruning">Élagage des connexions</Label>
                    <p className="text-sm text-gray-600">Supprime les connexions faibles du réseau</p>
                  </div>
                  <Switch
                    id="pruning"
                    checked={settings.pruning}
                    onCheckedChange={(checked) => saveSettings({ ...settings, pruning: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="weightSharing">Partage de poids</Label>
                    <p className="text-sm text-gray-600">Groupe les poids similaires pour réduire la redondance</p>
                  </div>
                  <Switch
                    id="weightSharing"
                    checked={settings.weightSharing}
                    onCheckedChange={(checked) => saveSettings({ ...settings, weightSharing: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="autoOptimize">Optimisation automatique</Label>
                    <p className="text-sm text-gray-600">Recompresse automatiquement les modèles anciens</p>
                  </div>
                  <Switch
                    id="autoOptimize"
                    checked={settings.autoOptimize}
                    onCheckedChange={(checked) => saveSettings({ ...settings, autoOptimize: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleOptimizeAll} disabled={isOptimizing} className="flex items-center gap-2">
                <TrendingDown className={`h-4 w-4 ${isOptimizing ? "animate-pulse" : ""}`} />
                {isOptimizing ? "Optimisation..." : "Optimiser tous les modèles"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {/* Statistiques globales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Espace économisé</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{formatSize(stats.totalSavings)}</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Ratio moyen</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.averageRatio.toFixed(1)}x</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Modèles compressés</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{stats.modelsCompressed}</div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-sm">Dernière optimisation</span>
                </div>
                <div className="text-sm font-semibold text-orange-600">{formatTime(stats.lastOptimization)}</div>
              </Card>
            </div>

            {/* Graphique de progression */}
            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Efficacité de compression par technique</CardTitle>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quantification</span>
                    <span>65% d'économie</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Élagage</span>
                    <span>45% d'économie</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Partage de poids</span>
                    <span>25% d'économie</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Compression gzip</span>
                    <span>80% d'économie</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            {/* Paramètres avancés */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Paramètres avancés</Label>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="threshold">Seuil de compression automatique</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Taille minimale pour déclencher la compression automatique
                  </p>
                  <div className="space-y-2">
                    <Slider
                      value={[settings.compressionThreshold / (1024 * 1024)]}
                      onValueChange={([value]) =>
                        saveSettings({ ...settings, compressionThreshold: value * 1024 * 1024 })
                      }
                      max={10}
                      min={0.1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600">{formatSize(settings.compressionThreshold)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations techniques */}
            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Informations techniques</CardTitle>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Compression gzip native:</span> Utilise l'API CompressionStream du
                    navigateur pour une compression efficace des métadonnées.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Quantification TensorFlow.js:</span> Réduit la précision des poids de
                    32 bits à 8 ou 16 bits selon le niveau choisi.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Impact sur les performances:</span> La compression peut légèrement
                    affecter la précision des prédictions, surtout au niveau maximum.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-medium">Stockage différentiel:</span> Les mises à jour de modèles utilisent
                    une compression différentielle pour minimiser les transferts.
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
