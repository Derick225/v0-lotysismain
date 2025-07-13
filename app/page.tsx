"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, BarChart3, Brain, History, Settings, RefreshCw, Zap } from "lucide-react"
import { DRAW_SCHEDULE } from "./lib/constants"
import { useDrawData } from "./hooks/use-draw-data"
import { DrawData } from "./components/draw-data"
import { DrawStats } from "./components/draw-stats"
import { DrawPredictions } from "./components/draw-predictions"
import { DrawHistory } from "./components/draw-history"
import { AdminPanel } from "./components/admin-panel"
import { InstallPWA } from "./components/install-pwa"
import { TensorFlowLoader } from "./components/tensorflow-loader"
import { ModelSyncStatus } from "./components/model-sync-status"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [selectedDay, setSelectedDay] = useState<string>("Lundi")
  const [selectedTime, setSelectedTime] = useState<string>("10:00")
  const [selectedDraw, setSelectedDraw] = useState<string>("Reveil")
  const [activeTab, setActiveTab] = useState("data")
  const [showAdmin, setShowAdmin] = useState(false)
  const [aiLoaded, setAiLoaded] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const { drawResults, loading, error, refreshData } = useDrawData()
  const { toast } = useToast()

  // Fonction pour obtenir la couleur d'un numéro selon les spécifications
  const getNumberColor = (num: number): string => {
    if (num >= 1 && num <= 9) return "bg-white text-black border-2 border-gray-300"
    if (num >= 10 && num <= 19) return "bg-blue-800 text-white"
    if (num >= 20 && num <= 29) return "bg-green-800 text-white"
    if (num >= 30 && num <= 39) return "bg-indigo-800 text-white"
    if (num >= 40 && num <= 49) return "bg-yellow-600 text-white"
    if (num >= 50 && num <= 59) return "bg-pink-600 text-white"
    if (num >= 60 && num <= 69) return "bg-orange-600 text-white"
    if (num >= 70 && num <= 79) return "bg-gray-600 text-white"
    if (num >= 80 && num <= 90) return "bg-red-600 text-white"
    return "bg-gray-400 text-white"
  }

  // Mettre à jour le tirage sélectionné quand le jour ou l'heure change
  useEffect(() => {
    const drawName = DRAW_SCHEDULE[selectedDay as keyof typeof DRAW_SCHEDULE]?.[selectedTime]
    if (drawName) {
      setSelectedDraw(drawName)
    }
  }, [selectedDay, selectedTime])

  // Filtrer les données pour le tirage sélectionné
  const filteredData = drawResults.filter((result) => result.draw_name === selectedDraw)

  const handleRefresh = () => {
    refreshData()
    toast({
      title: "Données actualisées",
      description: "Les derniers résultats ont été récupérés.",
    })
  }

  const handleAILoaded = () => {
    setAiLoaded(true)
    toast({
      title: "IA Chargée",
      description: "Les modèles de prédiction sont maintenant disponibles.",
    })
  }

  const handleAIError = (error: string) => {
    setAiError(error)
    toast({
      title: "Erreur IA",
      description: error,
      variant: "destructive",
    })
  }

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Administration Lotysis</h1>
            <Button variant="outline" onClick={() => setShowAdmin(false)}>
              Retour à l'Application
            </Button>
          </div>
          <AdminPanel />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Lotysis</h1>
            <p className="text-muted-foreground">Analyseur de Loterie Intelligent</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdmin(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </div>
        </div>

        {/* Chargement de l'IA */}
        {!aiLoaded && !aiError && (
          <div className="mb-6">
            <TensorFlowLoader onLoaded={handleAILoaded} onError={handleAIError} />
          </div>
        )}

        {/* Statut des modèles IA */}
        {aiLoaded && (
          <div className="mb-6">
            <ModelSyncStatus />
          </div>
        )}

        {/* Sélection du tirage */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sélection du Tirage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Jour</label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(DRAW_SCHEDULE).map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Heure</label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(DRAW_SCHEDULE[selectedDay as keyof typeof DRAW_SCHEDULE] || {}).map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tirage</label>
                <div className="flex items-center h-10 px-3 py-2 border border-input bg-background rounded-md">
                  <Badge variant="secondary" className="font-medium">
                    {selectedDraw}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contenu principal avec onglets */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Données</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Statistiques</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Prédictions</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <DrawData drawName={selectedDraw} data={filteredData} getNumberColor={getNumberColor} />
          </TabsContent>

          <TabsContent value="stats">
            <DrawStats drawName={selectedDraw} data={filteredData} getNumberColor={getNumberColor} />
          </TabsContent>

          <TabsContent value="predictions">
            {aiLoaded ? (
              <DrawPredictions drawName={selectedDraw} data={filteredData} getNumberColor={getNumberColor} />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {aiError ? "Erreur lors du chargement de l'IA" : "Chargement des modèles d'IA..."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <DrawHistory drawName={selectedDraw} data={filteredData} getNumberColor={getNumberColor} />
          </TabsContent>
        </Tabs>

        {/* Composant d'installation PWA */}
        <InstallPWA />
      </div>
    </div>
  )
}
