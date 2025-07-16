"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ServerIcon,
  ActivityIcon,
  CpuIcon,
  HardDriveIcon,
  MemoryStickIcon,
  NetworkIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BarChart3Icon,
  TrendingUpIcon,
  TrendingDownIcon
} from "lucide-react"
import { checkAPIHealth } from "@/app/lib/api-config"

interface SystemMonitoringProps {
  className?: string
}

export function SystemMonitoring({ className }: SystemMonitoringProps) {
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  
  const [healthStatus, setHealthStatus] = useState<{
    status: "healthy" | "degraded" | "unhealthy";
    database: boolean;
    api: boolean;
    externalServices: boolean;
    timestamp: string;
    details?: any;
  }>({
    status: "healthy",
    database: true,
    api: true,
    externalServices: true,
    timestamp: new Date().toISOString()
  })
  
  const [performanceMetrics, setPerformanceMetrics] = useState({
    responseTime: 120,
    uptime: 15,
    errorRate: "0.8%",
    requestsPerMinute: 45,
    cpuUsage: 25,
    memoryUsage: 68,
    diskUsage: 45,
    activeConnections: 8,
    cacheHitRate: 92
  })

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: "warning" | "error" | "info";
    message: string;
    timestamp: string;
  }>>([])

  useEffect(() => {
    checkSystemHealth()
    loadPerformanceMetrics()
    loadAlerts()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      checkSystemHealth(false)
      loadPerformanceMetrics()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  const checkSystemHealth = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const health = await checkAPIHealth()
      setLastCheck(new Date())
      setHealthStatus(health)
    } catch (error) {
      console.error('Erreur lors de la vérification du système:', error)
      setHealthStatus(prev => ({
        ...prev,
        status: "unhealthy",
        api: false
      }))
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const loadPerformanceMetrics = async () => {
    try {
      // Récupérer les métriques en temps réel
      const response = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPerformanceMetrics(prev => ({
          ...prev,
          requestsPerMinute: data.metrics.api_requests_per_minute || prev.requestsPerMinute,
          cpuUsage: data.metrics.cpu_usage || prev.cpuUsage,
          memoryUsage: data.metrics.memory_usage || prev.memoryUsage,
          diskUsage: data.metrics.disk_usage || prev.diskUsage,
          activeConnections: data.metrics.active_users || prev.activeConnections,
          cacheHitRate: data.metrics.cache_hit_rate || prev.cacheHitRate
        }))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des métriques:', error)
    }
  }

  const loadAlerts = () => {
    // Simuler des alertes système
    const mockAlerts = []
    
    if (performanceMetrics.cpuUsage > 80) {
      mockAlerts.push({
        id: "cpu-high",
        type: "warning" as const,
        message: "Utilisation CPU élevée détectée",
        timestamp: new Date().toISOString()
      })
    }
    
    if (performanceMetrics.memoryUsage > 85) {
      mockAlerts.push({
        id: "memory-high",
        type: "error" as const,
        message: "Mémoire critique - nettoyage recommandé",
        timestamp: new Date().toISOString()
      })
    }
    
    if (performanceMetrics.diskUsage > 90) {
      mockAlerts.push({
        id: "disk-full",
        type: "error" as const,
        message: "Espace disque critique",
        timestamp: new Date().toISOString()
      })
    }
    
    setAlerts(mockAlerts)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "degraded":
        return "bg-yellow-500"
      case "unhealthy":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (isHealthy: boolean) => {
    if (isHealthy) {
      return <CheckCircleIcon className="h-4 w-4 text-green-500" />
    }
    return <XCircleIcon className="h-4 w-4 text-red-500" />
  }

  const getMetricTrend = (value: number, threshold: number) => {
    if (value > threshold) {
      return <TrendingUpIcon className="h-3 w-3 text-red-500" />
    }
    return <TrendingDownIcon className="h-3 w-3 text-green-500" />
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <ServerIcon className="h-5 w-5" />
            Monitoring Système
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                checkSystemHealth()
                loadPerformanceMetrics()
                loadAlerts()
              }}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCwIcon className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <div className="flex items-center gap-1">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                size="sm"
              />
              <Label htmlFor="auto-refresh" className="text-xs">Auto</Label>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Surveillance en temps réel de l'état du système et des performances
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="status">État</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="metrics">Métriques</TabsTrigger>
            <TabsTrigger value="alerts">Alertes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            {/* État du système */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg ${getStatusColor(healthStatus.status)} bg-opacity-10 border border-opacity-20 ${getStatusColor(healthStatus.status)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Système</span>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(healthStatus.status)}`}></div>
                </div>
                <div className="mt-2 text-lg font-bold">
                  {healthStatus.status === "healthy" ? "Opérationnel" : 
                   healthStatus.status === "degraded" ? "Dégradé" : "Problème"}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${healthStatus.database ? "bg-green-500" : "bg-red-500"} bg-opacity-10 border border-opacity-20 ${healthStatus.database ? "border-green-500" : "border-red-500"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Base de données</span>
                  {getStatusIcon(healthStatus.database)}
                </div>
                <div className="mt-2 text-lg font-bold">
                  {healthStatus.database ? "En ligne" : "Hors ligne"}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${healthStatus.api ? "bg-green-500" : "bg-red-500"} bg-opacity-10 border border-opacity-20 ${healthStatus.api ? "border-green-500" : "border-red-500"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API</span>
                  {getStatusIcon(healthStatus.api)}
                </div>
                <div className="mt-2 text-lg font-bold">
                  {healthStatus.api ? "En ligne" : "Hors ligne"}
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${healthStatus.externalServices ? "bg-green-500" : "bg-red-500"} bg-opacity-10 border border-opacity-20 ${healthStatus.externalServices ? "border-green-500" : "border-red-500"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Services externes</span>
                  {getStatusIcon(healthStatus.externalServices)}
                </div>
                <div className="mt-2 text-lg font-bold">
                  {healthStatus.externalServices ? "En ligne" : "Hors ligne"}
                </div>
              </div>
            </div>
            
            {/* Dernière vérification */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-2">
              <span>
                Dernière vérification: {lastCheck ? lastCheck.toLocaleString() : 'Jamais'}
              </span>
              <span>
                Uptime: {performanceMetrics.uptime} jours
              </span>
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            {/* Métriques de performance */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <CpuIcon className="h-3 w-3" /> CPU
                    {getMetricTrend(performanceMetrics.cpuUsage, 70)}
                  </span>
                  <span className="text-sm">{performanceMetrics.cpuUsage}%</span>
                </div>
                <Progress value={performanceMetrics.cpuUsage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <MemoryStickIcon className="h-3 w-3" /> Mémoire
                    {getMetricTrend(performanceMetrics.memoryUsage, 80)}
                  </span>
                  <span className="text-sm">{performanceMetrics.memoryUsage}%</span>
                </div>
                <Progress value={performanceMetrics.memoryUsage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <HardDriveIcon className="h-3 w-3" /> Disque
                    {getMetricTrend(performanceMetrics.diskUsage, 85)}
                  </span>
                  <span className="text-sm">{performanceMetrics.diskUsage}%</span>
                </div>
                <Progress value={performanceMetrics.diskUsage} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <NetworkIcon className="h-3 w-3" /> Cache
                  </span>
                  <span className="text-sm">{performanceMetrics.cacheHitRate}%</span>
                </div>
                <Progress value={performanceMetrics.cacheHitRate} className="h-2" />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            {/* Statistiques détaillées */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 border rounded text-center">
                <div className="text-xs text-gray-500">Temps de réponse</div>
                <div className="text-lg font-semibold">{performanceMetrics.responseTime} ms</div>
              </div>
              
              <div className="p-3 border rounded text-center">
                <div className="text-xs text-gray-500">Requêtes/min</div>
                <div className="text-lg font-semibold">{performanceMetrics.requestsPerMinute}</div>
              </div>
              
              <div className="p-3 border rounded text-center">
                <div className="text-xs text-gray-500">Taux d'erreur</div>
                <div className="text-lg font-semibold">{performanceMetrics.errorRate}</div>
              </div>
              
              <div className="p-3 border rounded text-center">
                <div className="text-xs text-gray-500">Connexions actives</div>
                <div className="text-lg font-semibold">{performanceMetrics.activeConnections}</div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            {/* Alertes système */}
            {alerts.length === 0 ? (
              <div className="p-4 text-center border rounded bg-green-50">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-700">Aucune alerte active</p>
                <p className="text-sm text-green-600">Tous les systèmes fonctionnent normalement</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 border rounded flex items-center gap-3 ${
                      alert.type === 'error' ? 'bg-red-50 border-red-200' :
                      alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    {alert.type === 'error' && <XCircleIcon className="h-4 w-4 text-red-500" />}
                    {alert.type === 'warning' && <AlertTriangleIcon className="h-4 w-4 text-yellow-500" />}
                    {alert.type === 'info' && <CheckCircleIcon className="h-4 w-4 text-blue-500" />}
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
