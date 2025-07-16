"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Download, FileText, HardDrive, RefreshCw, Trash2, TrendingDown, Zap } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { CompressionSettingsPanel } from "./compression-settings-panel"
import { ModelStorageService } from "../services/model-storage-service"

/* ------------------------------------------------------------------------ */
/* Types                                                                    */
/* ------------------------------------------------------------------------ */
interface ModelMetadata {
  drawName: string
  version: string
  size: number
  originalSize?: number
  compressionRatio?: number
  createdAt: number
  lastUsed: number
  performance?: {
    accuracy: number
    loss: number
    trainingTime: number
  }
  compression?: {
    method: string
    level: string
    savings: number
  }
}

interface StorageStats {
  totalModels: number
  totalSize: number
  totalOriginalSize: number
  totalSavings: number
  averageCompressionRatio: number
}

/* ------------------------------------------------------------------------ */
/* Component                                                                */
/* ------------------------------------------------------------------------ */
export function ModelManagementPanel() {
  const { toast } = useToast()
  const storage = ModelStorageService.getInstance()

  const [models, setModels] = useState<ModelMetadata[]>([])
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  /* ------------------------- Helpers ------------------------------------ */
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const getCompressionBadge = (ratio?: number) => {
    if (!ratio) return null
    if (ratio >= 5) return <Badge className="bg-green-100 text-green-800">Excellent ({ratio.toFixed(1)}x)</Badge>
    if (ratio >= 3) return <Badge className="bg-blue-100 text-blue-800">Bon ({ratio.toFixed(1)}x)</Badge>
    if (ratio >= 2) return <Badge className="bg-yellow-100 text-yellow-800">Modéré ({ratio.toFixed(1)}x)</Badge>
    return <Badge variant="outline">Faible ({ratio.toFixed(1)}x)</Badge>
  }

  /* ------------------------- Data loading ------------------------------- */
  const loadData = async () => {
    setLoading(true)
    try {
      await storage.initialize()
      const [allModels, storageStats] = await Promise.all([storage.getAllModelMetadata(), storage.getStorageStats()])
      setModels(allModels)
      setStats(storageStats)
    } catch (e) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les données des modèles.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------- CRUD actions ------------------------------- */
  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const drawName = await storage.importModels(file)
      toast({
        title: "Import réussi",
        description: `Modèle ${drawName} importé.`,
      })
      await loadData()
    } catch (err) {
      console.error(err)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Import impossible.",
      })
    }
    e.target.value = ""
  }

  const handleExport = async (drawName: string) => {
    try {
      const blob = await storage.exportModels(drawName)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `model-${drawName}-${Date.now()}.lzma`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        title: "Export réussi",
        description: `Modèle ${drawName} exporté.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Export impossible.",
      })
    }
  }

  const handleDelete = async (drawName: string) => {
    try {
      await storage.deleteModels(drawName)
      toast({
        title: "Suppression réussie",
        description: `Modèle ${drawName} supprimé.`,
      })
      await loadData()
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Suppression impossible.",
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    try {
      for (const d of selected) await storage.deleteModels(d)
      toast({
        title: "Suppression réussie",
        description: `${selected.size} modèle(s) supprimé(s).`,
      })
      setSelected(new Set())
      await loadData()
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Suppression en lot impossible.",
      })
    }
  }

  /* --------------------------------------------------------------------- */
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Gestion des Modèles ML Compressés
          </span>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
        <CardDescription>Sauvegarde, compression et gestion des modèles TensorFlow.js</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          {/* ---------------------------------------------------------------- */}
          {/* Tab selectors                                                   */}
          {/* ---------------------------------------------------------------- */}
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="models">Modèles</TabsTrigger>
            <TabsTrigger value="import-export">Import / Export</TabsTrigger>
            <TabsTrigger value="compression">Compression</TabsTrigger>
          </TabsList>

          {/* ---------------------------------------------------------------- */}
          {/* Overview                                                        */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="overview" className="space-y-4">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Modèles stockés</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.totalModels}</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Espace utilisé</span>
                  </div>
                  <div className="text-2xl font-bold">{formatSize(stats.totalSize)}</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Économies</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{formatSize(stats.totalSavings)}</div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Ratio moyen</span>
                  </div>
                  <div className="text-2xl font-bold">{stats.averageCompressionRatio.toFixed(1)}x</div>
                </Card>
              </div>
            )}

            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Actions de maintenance</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer sélection ({selected.size})
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* Models list                                                     */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="models" className="space-y-4">
            {models.length === 0 ? (
              <Card className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun modèle sauvegardé</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {models.map((m) => (
                  <Card key={m.drawName} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(m.drawName)}
                          onChange={() => {
                            const set = new Set(selected)
                            set.has(m.drawName) ? set.delete(m.drawName) : set.add(m.drawName)
                            setSelected(set)
                          }}
                        />
                        <div>
                          <h3 className="font-semibold">{m.drawName}</h3>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            <span>v{m.version}</span>
                            <span>{formatSize(m.size)}</span>
                            {m.originalSize && (
                              <span className="text-green-600">−{formatSize(m.originalSize - m.size)}</span>
                            )}
                            <span>Créé : {formatDate(m.createdAt)}</span>
                            <span>Utilisé : {formatDate(m.lastUsed)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getCompressionBadge(m.compressionRatio)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(m.drawName)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(m.drawName)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          Suppr.
                        </Button>
                      </div>
                    </div>

                    {(m.performance || m.compression) && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {m.performance && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-sm mb-1">Performance</h4>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="font-medium">Précision:</span>
                                <Progress value={m.performance.accuracy * 100} className="h-1 mt-1" />
                              </div>
                              <div>
                                <span className="font-medium">Perte:</span> {m.performance.loss.toFixed(4)}
                              </div>
                              <div>
                                <span className="font-medium">Temps:</span> {m.performance.trainingTime} ms
                              </div>
                            </div>
                          </div>
                        )}

                        {m.compression && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <h4 className="font-medium text-sm mb-1">Compression</h4>
                            <div className="space-y-1 text-xs">
                              <div>
                                <span className="font-medium">Méthode:</span> {m.compression.method}
                              </div>
                              <div>
                                <span className="font-medium">Niveau:</span> {m.compression.level}
                              </div>
                              <div>
                                <span className="font-medium">Économie:</span>{" "}
                                <span className="text-green-600">{formatSize(m.compression.savings)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* Import / Export                                                 */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="import-export" className="space-y-4">
            <Card className="p-4">
              <CardTitle className="text-lg mb-4">Import</CardTitle>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="model-import">Fichier modèle (.lzma, .json)</Label>
                  <Input id="model-import" type="file" accept=".lzma,.json" onChange={handleImport} className="mt-1" />
                </div>
                <p className="text-sm text-gray-600">Les fichiers compressés seront automatiquement décompressés.</p>
              </div>
            </Card>
          </TabsContent>

          {/* ---------------------------------------------------------------- */}
          {/* Compression settings                                            */}
          {/* ---------------------------------------------------------------- */}
          <TabsContent value="compression">
            <CompressionSettingsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
