"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Brain, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react"

export function ModelSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [lastSync, setLastSync] = useState<Date>(new Date())
  const [modelAccuracy, setModelAccuracy] = useState(78.5)
  const [isTraining, setIsTraining] = useState(false)

  const handleSync = async () => {
    setSyncStatus("syncing")
    setIsTraining(true)

    // Simuler la synchronisation et l'entraînement
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setSyncStatus("success")
    setLastSync(new Date())
    setModelAccuracy(Math.random() * 10 + 75) // 75-85%
    setIsTraining(false)
  }

  useEffect(() => {
    // Simuler une synchronisation automatique périodique
    const interval = setInterval(() => {
      if (syncStatus === "idle") {
        setLastSync(new Date(Date.now() - Math.random() * 3600000)) // Dernière sync dans la dernière heure
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [syncStatus])

  const getStatusColor = () => {
    switch (syncStatus) {
      case "success":
        return "text-green-600"
      case "error":
        return "text-red-600"
      case "syncing":
        return "text-blue-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Statut des Modèles IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm font-medium">Statut</div>
              <div className={`text-sm ${getStatusColor()}`}>
                {syncStatus === "idle" && "Prêt"}
                {syncStatus === "syncing" && "Synchronisation..."}
                {syncStatus === "success" && "Synchronisé"}
                {syncStatus === "error" && "Erreur"}
              </div>
            </div>
            {getStatusIcon()}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm font-medium">Précision</div>
              <div className="text-sm text-green-600">{modelAccuracy.toFixed(1)}%</div>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Optimal
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm font-medium">Dernière Sync</div>
              <div className="text-sm text-muted-foreground">
                {lastSync.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>

        {isTraining && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Entraînement en cours...</span>
              <span>Étape 3/4</span>
            </div>
            <Progress value={75} className="h-2" />
            <div className="text-xs text-muted-foreground">Optimisation des hyperparamètres du modèle LSTM</div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncStatus === "syncing"}
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            {syncStatus === "syncing" ? "Synchronisation..." : "Synchroniser"}
          </Button>

          <Button variant="outline" size="sm">
            Voir Détails
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>XGBoost: Actif</span>
            <span>Random Forest: Actif</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>RNN-LSTM: Actif</span>
            <span>Ensemble: Actif</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
