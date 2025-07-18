"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download, Upload, Database, Shield, Clock, CheckCircle, HardDrive } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BackupService } from "../lib/backup-service"

export function BackupRestorePanel() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [restoreOptions, setRestoreOptions] = useState({
    restoreLotteryResults: true,
    restoreMLModels: true,
    restorePredictions: true,
    restoreSettings: true,
    overwriteExisting: false,
  })

  const { toast } = useToast()

  const createFullBackup = async () => {
    setIsCreatingBackup(true)
    setBackupProgress(0)

    try {
      // Simulation du progrès
      const progressInterval = setInterval(() => {
        setBackupProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const backupData = await BackupService.createFullBackup("admin")

      clearInterval(progressInterval)
      setBackupProgress(100)

      await BackupService.downloadBackup(backupData)
      setLastBackup(new Date().toISOString())

      toast({
        title: "Sauvegarde créée",
        description: `Sauvegarde complète téléchargée (${backupData.metadata.total_records} enregistrements)`,
      })
    } catch (error) {
      toast({
        title: "Erreur de sauvegarde",
        description: `Impossible de créer la sauvegarde: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingBackup(false)
      setBackupProgress(0)
    }
  }

  const createIncrementalBackup = async () => {
    if (!lastBackup) {
      toast({
        title: "Erreur",
        description: "Aucune sauvegarde complète trouvée. Créez d'abord une sauvegarde complète.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingBackup(true)

    try {
      const lastBackupDate = new Date(lastBackup)
      const backupData = await BackupService.createIncrementalBackup(lastBackupDate, "admin")

      if (backupData.metadata.total_records === 0) {
        toast({
          title: "Aucune nouvelle donnée",
          description: "Aucune nouvelle donnée depuis la dernière sauvegarde",
        })
      } else {
        await BackupService.downloadBackup(
          backupData,
          `lotysis-incremental-${new Date().toISOString().split("T")[0]}.json`,
        )

        toast({
          title: "Sauvegarde incrémentale créée",
          description: `${backupData.metadata.total_records} nouveaux enregistrements sauvegardés`,
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: `Impossible de créer la sauvegarde incrémentale: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    setRestoreProgress(0)

    try {
      const fileContent = await file.text()
      const validation = BackupService.validateBackupFile(fileContent)

      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Simulation du progrès
      const progressInterval = setInterval(() => {
        setRestoreProgress((prev) => Math.min(prev + 15, 90))
      }, 300)

      const result = await BackupService.restoreFromBackup(validation.data!, restoreOptions, "admin")

      clearInterval(progressInterval)
      setRestoreProgress(100)

      if (result.success) {
        toast({
          title: "Restauration réussie",
          description: `Données restaurées: ${result.details.lottery_results} tirages, ${result.details.ml_models} modèles, ${result.details.ml_predictions} prédictions`,
        })
      } else {
        toast({
          title: "Restauration partielle",
          description: `Certaines erreurs sont survenues: ${result.details.errors.join(", ")}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur de restauration",
        description: `Impossible de restaurer: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
      setRestoreProgress(0)
      // Reset file input
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* Sauvegarde */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sauvegarde des données
          </CardTitle>
          <CardDescription>Créer une sauvegarde complète ou incrémentale de toutes les données</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreatingBackup && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Création de la sauvegarde...</span>
                <span>{backupProgress}%</span>
              </div>
              <Progress value={backupProgress} className="w-full" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={createFullBackup}
              disabled={isCreatingBackup}
              className="flex items-center gap-2 h-auto p-4 flex-col"
            >
              <Download className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Sauvegarde complète</div>
                <div className="text-xs opacity-80">Toutes les données</div>
              </div>
            </Button>

            <Button
              onClick={createIncrementalBackup}
              disabled={isCreatingBackup || !lastBackup}
              variant="outline"
              className="flex items-center gap-2 h-auto p-4 flex-col bg-transparent"
            >
              <Clock className="h-6 w-6" />
              <div className="text-center">
                <div className="font-semibold">Sauvegarde incrémentale</div>
                <div className="text-xs opacity-80">Nouveaux changements</div>
              </div>
            </Button>
          </div>

          {lastBackup && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Dernière sauvegarde complète: {new Date(lastBackup).toLocaleString("fr-FR")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Restauration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restauration des données
          </CardTitle>
          <CardDescription>Restaurer les données depuis un fichier de sauvegarde</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Options de restauration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options de restauration:</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restore-lottery"
                  checked={restoreOptions.restoreLotteryResults}
                  onCheckedChange={(checked) =>
                    setRestoreOptions((prev) => ({ ...prev, restoreLotteryResults: !!checked }))
                  }
                />
                <Label htmlFor="restore-lottery" className="text-sm">
                  Résultats de loterie
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restore-models"
                  checked={restoreOptions.restoreMLModels}
                  onCheckedChange={(checked) => setRestoreOptions((prev) => ({ ...prev, restoreMLModels: !!checked }))}
                />
                <Label htmlFor="restore-models" className="text-sm">
                  Modèles ML
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restore-predictions"
                  checked={restoreOptions.restorePredictions}
                  onCheckedChange={(checked) =>
                    setRestoreOptions((prev) => ({ ...prev, restorePredictions: !!checked }))
                  }
                />
                <Label htmlFor="restore-predictions" className="text-sm">
                  Prédictions
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="restore-settings"
                  checked={restoreOptions.restoreSettings}
                  onCheckedChange={(checked) => setRestoreOptions((prev) => ({ ...prev, restoreSettings: !!checked }))}
                />
                <Label htmlFor="restore-settings" className="text-sm">
                  Paramètres
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="overwrite"
                checked={restoreOptions.overwriteExisting}
                onCheckedChange={(checked) => setRestoreOptions((prev) => ({ ...prev, overwriteExisting: !!checked }))}
              />
              <Label htmlFor="overwrite" className="text-sm">
                Écraser les données existantes
              </Label>
            </div>
          </div>

          {isRestoring && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Restauration en cours...</span>
                <span>{restoreProgress}%</span>
              </div>
              <Progress value={restoreProgress} className="w-full" />
            </div>
          )}

          {/* Upload de fichier */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Sélectionner un fichier de sauvegarde:</Label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              disabled={isRestoring}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention:</strong> La restauration peut écraser les données existantes. Assurez-vous d'avoir une
              sauvegarde récente avant de procéder.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Informations sur les sauvegardes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Informations sur les sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">JSON</div>
              <div className="text-sm text-blue-800">Format de sauvegarde</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Compressé</div>
              <div className="text-sm text-green-800">Optimisé pour l'espace</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">Sécurisé</div>
              <div className="text-sm text-purple-800">Validation intégrée</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div>
              <strong>Sauvegarde complète:</strong> Inclut toutes les données (résultats, modèles, prédictions,
              paramètres)
            </div>
            <div>
              <strong>Sauvegarde incrémentale:</strong> Inclut seulement les nouvelles données depuis la dernière
              sauvegarde
            </div>
            <div>
              <strong>Format:</strong> Fichier JSON compressé avec métadonnées et validation
            </div>
            <div>
              <strong>Compatibilité:</strong> Compatible avec toutes les versions de l'application
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
