"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  WifiIcon, 
  WifiOffIcon, 
  DatabaseIcon, 
  RefreshCwIcon, 
  ExternalLinkIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from "lucide-react"
import { checkAPIHealth } from "@/app/lib/api-config"

interface APIStatusProps {
  onDataSourceChange?: (useRealData: boolean) => void
}

export function APIStatus({ onDataSourceChange }: APIStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [useRealData, setUseRealData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [apiStats, setApiStats] = useState<{
    totalResults: number
    source: string
    lastUpdate?: string
  } | null>(null)

  const checkAPIStatus = async () => {
    setLoading(true)
    try {
      const health = await checkAPIHealth()
      setIsConnected(health)
      setLastCheck(new Date())
      
      // Récupérer quelques statistiques depuis notre API locale
      const response = await fetch('/api/lottery-results?real=' + useRealData)
      const data = await response.json()
      
      if (data.success) {
        setApiStats({
          totalResults: data.total,
          source: data.source,
          lastUpdate: data.data[0]?.date
        })
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'API:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleDataSourceToggle = (checked: boolean) => {
    setUseRealData(checked)
    onDataSourceChange?.(checked)
    // Revérifier le statut avec la nouvelle source
    if (!loading) {
      setTimeout(checkAPIStatus, 100)
    }
  }

  useEffect(() => {
    checkAPIStatus()
    // Vérifier le statut toutes les 5 minutes
    const interval = setInterval(checkAPIStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [useRealData])

  const getStatusIcon = () => {
    if (isConnected === null) return <DatabaseIcon className="h-4 w-4" />
    if (loading) return <RefreshCwIcon className="h-4 w-4 animate-spin" />
    if (isConnected) return <CheckCircleIcon className="h-4 w-4 text-green-600" />
    return <AlertTriangleIcon className="h-4 w-4 text-red-600" />
  }

  const getStatusText = () => {
    if (isConnected === null) return "Vérification en cours..."
    if (loading) return "Vérification..."
    if (useRealData && isConnected) return "API externe connectée"
    if (useRealData && !isConnected) return "API externe indisponible"
    return "Mode données de test"
  }

  const getStatusColor = () => {
    if (isConnected === null || loading) return "secondary"
    if (useRealData && isConnected) return "default"
    if (useRealData && !isConnected) return "destructive"
    return "outline"
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            {getStatusIcon()}
            Statut de l'API
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkAPIStatus}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCwIcon className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://lotobonheur.ci/resultats', '_blank')}
              className="flex items-center gap-1"
            >
              <ExternalLinkIcon className="h-3 w-3" />
              Site officiel
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Statut de la connexion aux données de loterie en temps réel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
            {lastCheck && (
              <span className="text-sm text-muted-foreground">
                Dernière vérification: {lastCheck.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        {/* Sélecteur de source de données */}
        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
          <WifiOffIcon className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="data-source" className="flex-1">
            Utiliser les données réelles de l'API externe
          </Label>
          <Switch
            id="data-source"
            checked={useRealData}
            onCheckedChange={handleDataSourceToggle}
            disabled={loading}
          />
          <WifiIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Statistiques */}
        {apiStats && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <div className="text-sm font-medium">Résultats disponibles</div>
              <div className="text-2xl font-bold">{apiStats.totalResults}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Source</div>
              <div className="text-sm">
                {apiStats.source === 'api' && <span className="text-green-600">API externe</span>}
                {apiStats.source === 'fallback' && <span className="text-orange-600">Données de test</span>}
                {apiStats.source === 'error' && <span className="text-red-600">Erreur</span>}
              </div>
            </div>
            {apiStats.lastUpdate && (
              <div className="col-span-2">
                <div className="text-sm font-medium">Dernier tirage</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(apiStats.lastUpdate).toLocaleDateString('fr-FR')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message d'avertissement si l'API externe est indisponible */}
        {useRealData && isConnected === false && (
          <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <AlertTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-orange-800 dark:text-orange-200">
                API externe indisponible
              </div>
              <div className="text-orange-700 dark:text-orange-300 mt-1">
                L'application utilise automatiquement des données de test. 
                Les prédictions IA fonctionnent normalement.
              </div>
            </div>
          </div>
        )}

        {/* Message d'information pour les données de test */}
        {!useRealData && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <DatabaseIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-blue-800 dark:text-blue-200">
                Mode données de test activé
              </div>
              <div className="text-blue-700 dark:text-blue-300 mt-1">
                L'application utilise des données générées aléatoirement pour la démonstration.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
