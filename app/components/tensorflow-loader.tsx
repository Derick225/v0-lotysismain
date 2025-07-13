"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Brain, CheckCircle, AlertCircle } from "lucide-react"

interface TensorFlowLoaderProps {
  onLoaded: () => void
  onError: (error: string) => void
}

export function TensorFlowLoader({ onLoaded, onError }: TensorFlowLoaderProps) {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("Initialisation...")
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTensorFlow = async () => {
      try {
        setLoadingStage("Chargement de TensorFlow.js...")
        setLoadingProgress(20)

        // Simuler le chargement de TensorFlow.js
        await new Promise((resolve) => setTimeout(resolve, 1000))

        setLoadingStage("Initialisation des modèles...")
        setLoadingProgress(50)

        await new Promise((resolve) => setTimeout(resolve, 1500))

        setLoadingStage("Configuration des algorithmes ML...")
        setLoadingProgress(80)

        await new Promise((resolve) => setTimeout(resolve, 1000))

        setLoadingStage("Finalisation...")
        setLoadingProgress(100)

        await new Promise((resolve) => setTimeout(resolve, 500))

        setIsLoaded(true)
        onLoaded()
      } catch (err) {
        const errorMessage = "Erreur lors du chargement de TensorFlow.js"
        setError(errorMessage)
        onError(errorMessage)
      }
    }

    loadTensorFlow()
  }, [onLoaded, onError])

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Erreur de Chargement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoaded) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            IA Prête
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 text-sm">
            Les modèles d'intelligence artificielle sont chargés et prêts pour les prédictions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Chargement de l'IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{loadingStage}</span>
            <span>{loadingProgress}%</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
        </div>
        <p className="text-sm text-muted-foreground">
          Préparation des algorithmes de prédiction (XGBoost, Random Forest, RNN-LSTM)...
        </p>
      </CardContent>
    </Card>
  )
}
