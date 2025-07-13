"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Download,
  Eye,
  Heart,
  MemoryStick,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Upload,
  Users,
  Bell,
  AlertCircle,
  Minus,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { useToast } from "@/hooks/use-toast"
import monitoringService, {
  type SystemMetrics,
  type Alert,
  type AlertRule,
  type HealthCheck,
} from "@/app/services/monitoring-service"

interface MonitoringDashboardProps {
  className?: string
}

export function MonitoringDashboard({ className }: MonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState("1h")
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "resolved">("all")
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: "",
    metric: "cpu_usage",
    operator: "gt",
    threshold: 80,
    severity: "medium",
    enabled: true,
    cooldown: 5,
    channels: ["browser"],
  })

  const { toast } = useToast()

  useEffect(() => {
    // Load initial data
    loadData()

    // Set up event listeners
    const handleMetricsUpdate = (event: CustomEvent) => {
      loadData()
    }

    const handleAlertTriggered = (event: CustomEvent) => {
      const alert = event.detail as Alert
      toast({
        title: `🚨 ${alert.severity.toUpperCase()} Alert`,
        description: alert.message,
        variant: alert.severity === "critical" ? "destructive" : "default",
      })
      loadData()
    }

    const handleHealthUpdate = (event: CustomEvent) => {
      setHealthChecks(event.detail)
    }

    window.addEventListener("metrics-updated", handleMetricsUpdate as EventListener)
    window.addEventListener("alert-triggered", handleAlertTriggered as EventListener)
    window.addEventListener("health-updated", handleHealthUpdate as EventListener)

    return () => {
      window.removeEventListener("metrics-updated", handleMetricsUpdate as EventListener)
      window.removeEventListener("alert-triggered", handleAlertTriggered as EventListener)
      window.removeEventListener("health-updated", handleHealthUpdate as EventListener)
    }
  }, [toast])

  const loadData = () => {
    setMetrics(monitoringService.getMetrics(200))
    setAlerts(monitoringService.getAlerts())
    setAlertRules(monitoringService.getAlertRules())
    setHealthChecks(monitoringService.getHealthChecks())
  }

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      monitoringService.stop()
      setIsMonitoring(false)
      toast({
        title: "Monitoring arrêté",
        description: "Le service de monitoring a été arrêté.",
      })
    } else {
      monitoringService.start()
      setIsMonitoring(true)
      toast({
        title: "Monitoring démarré",
        description: "Le service de monitoring a été démarré.",
      })
    }
  }

  const handleAcknowledgeAlert = (alertId: string) => {
    monitoringService.acknowledgeAlert(alertId, "Admin User")
    loadData()
    toast({
      title: "Alerte acquittée",
      description: "L'alerte a été marquée comme acquittée.",
    })
  }

  const handleResolveAlert = (alertId: string) => {
    monitoringService.resolveAlert(alertId)
    loadData()
    toast({
      title: "Alerte résolue",
      description: "L'alerte a été marquée comme résolue.",
    })
  }

  const handleAddRule = () => {
    if (!newRule.name || !newRule.threshold) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      })
      return
    }

    monitoringService.addAlertRule(newRule as Omit<AlertRule, "id" | "created_at" | "updated_at">)
    setNewRule({
      name: "",
      metric: "cpu_usage",
      operator: "gt",
      threshold: 80,
      severity: "medium",
      enabled: true,
      cooldown: 5,
      channels: ["browser"],
    })
    loadData()
    toast({
      title: "Règle ajoutée",
      description: "La nouvelle règle d'alerte a été créée.",
    })
  }

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    monitoringService.updateAlertRule(ruleId, { enabled })
    loadData()
  }

  const handleDeleteRule = (ruleId: string) => {
    monitoringService.deleteAlertRule(ruleId)
    loadData()
    toast({
      title: "Règle supprimée",
      description: "La règle d'alerte a été supprimée.",
    })
  }

  const handleExportData = () => {
    const data = monitoringService.exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `monitoring-data-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export réussi",
      description: "Les données de monitoring ont été exportées.",
    })
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (monitoringService.importData(data)) {
          loadData()
          toast({
            title: "Import réussi",
            description: "Les données de monitoring ont été importées.",
          })
        } else {
          throw new Error("Format de données invalide")
        }
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Impossible d'importer les données.",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)
  }

  const getFilteredMetrics = () => {
    const now = Date.now()
    const timeRanges = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    }

    const range = timeRanges[selectedTimeRange as keyof typeof timeRanges] || timeRanges["1h"]
    return metrics.filter((m) => now - new Date(m.timestamp).getTime() < range)
  }

  const getFilteredAlerts = () => {
    if (alertFilter === "all") return alerts
    return alerts.filter((alert) => alert.status === alertFilter)
  }

  const getSystemStatus = () => {
    return monitoringService.getSystemStatus()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500"
      case "degraded":
        return "text-yellow-500"
      case "unhealthy":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />
      case "degraded":
        return <AlertTriangle className="h-4 w-4" />
      case "unhealthy":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "critical":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const chartData = getFilteredMetrics().map((m) => ({
    time: formatTimestamp(m.timestamp),
    cpu: m.cpu_usage,
    memory: m.memory_usage,
    responseTime: m.response_time,
    errorRate: m.error_rate,
  }))

  const latestMetrics = metrics[metrics.length - 1]
  const systemStatus = getSystemStatus()
  const activeAlerts = alerts.filter((a) => a.status === "active")

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Monitoring Dashboard</h2>
          <p className="text-muted-foreground">Surveillance système en temps réel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleMonitoring}
            className={isMonitoring ? "text-green-600" : "text-red-600"}
          >
            {isMonitoring ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isMonitoring ? "Arrêter" : "Démarrer"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="metrics">Métriques</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statut système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Statut du système
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={getStatusColor(systemStatus)}>{getStatusIcon(systemStatus)}</div>
                  <span className="font-medium capitalize">{systemStatus}</span>
                </div>
                <Badge variant={systemStatus === "healthy" ? "default" : "destructive"}>
                  {activeAlerts.length} alertes actives
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {healthChecks.map((check) => (
                  <div key={check.service} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{check.service}</span>
                      <div className={getStatusColor(check.status)}>{getStatusIcon(check.status)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Temps de réponse: {check.response_time.toFixed(0)}ms</div>
                      <div>Dernière vérification: {formatTimestamp(check.last_check)}</div>
                      {check.error_message && <div className="text-red-500 mt-1">{check.error_message}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Métriques en temps réel */}
          {latestMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU</CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.cpu_usage.toFixed(1)}%</div>
                  <Progress value={latestMetrics.cpu_usage} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mémoire</CardTitle>
                  <MemoryStick className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.memory_usage.toFixed(1)}%</div>
                  <Progress value={latestMetrics.memory_usage} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Temps de réponse</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.response_time.toFixed(0)}ms</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {latestMetrics.response_time < 1000
                      ? "Excellent"
                      : latestMetrics.response_time < 2000
                        ? "Bon"
                        : "Lent"}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{latestMetrics.active_users}</div>
                  <div className="text-xs text-muted-foreground mt-1">{latestMetrics.api_calls} appels API</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alertes récentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertes récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {activeAlerts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucune alerte active</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeAlerts.slice(0, 10).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                            <span className="font-medium">{alert.rule_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">{formatTimestamp(alert.triggered_at)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleAcknowledgeAlert(alert.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alert.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Graphiques de performance</h3>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15 min</SelectItem>
                <SelectItem value="1h">1 heure</SelectItem>
                <SelectItem value="6h">6 heures</SelectItem>
                <SelectItem value="24h">24 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CPU et Mémoire</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cpu" stroke="#8884d8" name="CPU %" />
                    <Line type="monotone" dataKey="memory" stroke="#82ca9d" name="Mémoire %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Temps de réponse</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="responseTime" stroke="#ffc658" fill="#ffc658" name="Temps (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Gestion des alertes</h3>
            <Select value={alertFilter} onValueChange={(value: any) => setAlertFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="resolved">Résolues</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historique des alertes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                {getFilteredAlerts().length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Bell className="h-12 w-12 mx-auto mb-4" />
                    <p>Aucune alerte trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredAlerts().map((alert) => (
                      <div key={alert.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                              <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                                {alert.status}
                              </Badge>
                              <span className="font-medium">{alert.rule_name}</span>
                            </div>
                            <p className="text-sm mb-2">{alert.message}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Déclenchée: {formatTimestamp(alert.triggered_at)}</div>
                              {alert.acknowledged_at && (
                                <div>
                                  Acquittée: {formatTimestamp(alert.acknowledged_at)} par {alert.acknowledged_by}
                                </div>
                              )}
                              {alert.resolved_at && <div>Résolue: {formatTimestamp(alert.resolved_at)}</div>}
                            </div>
                          </div>
                          {alert.status === "active" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleAcknowledgeAlert(alert.id)}>
                                Acquitter
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleResolveAlert(alert.id)}>
                                Résoudre
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Règles d'alerte */}
          <Card>
            <CardHeader>
              <CardTitle>Règles d'alerte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulaire d'ajout */}
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-3">Ajouter une nouvelle règle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rule-name">Nom</Label>
                    <Input
                      id="rule-name"
                      value={newRule.name || ""}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      placeholder="Nom de la règle"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-metric">Métrique</Label>
                    <Select
                      value={newRule.metric}
                      onValueChange={(value: any) => setNewRule({ ...newRule, metric: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpu_usage">CPU Usage</SelectItem>
                        <SelectItem value="memory_usage">Memory Usage</SelectItem>
                        <SelectItem value="response_time">Response Time</SelectItem>
                        <SelectItem value="error_rate">Error Rate</SelectItem>
                        <SelectItem value="active_users">Active Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-operator">Opérateur</Label>
                    <Select
                      value={newRule.operator}
                      onValueChange={(value: any) => setNewRule({ ...newRule, operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gt">Supérieur à</SelectItem>
                        <SelectItem value="gte">Supérieur ou égal</SelectItem>
                        <SelectItem value="lt">Inférieur à</SelectItem>
                        <SelectItem value="lte">Inférieur ou égal</SelectItem>
                        <SelectItem value="eq">Égal à</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-threshold">Seuil</Label>
                    <Input
                      id="rule-threshold"
                      type="number"
                      value={newRule.threshold || ""}
                      onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                      placeholder="Valeur seuil"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-severity">Sévérité</Label>
                    <Select
                      value={newRule.severity}
                      onValueChange={(value: any) => setNewRule({ ...newRule, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible</SelectItem>
                        <SelectItem value="medium">Moyenne</SelectItem>
                        <SelectItem value="high">Élevée</SelectItem>
                        <SelectItem value="critical">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-cooldown">Cooldown (min)</Label>
                    <Input
                      id="rule-cooldown"
                      type="number"
                      value={newRule.cooldown || ""}
                      onChange={(e) => setNewRule({ ...newRule, cooldown: Number(e.target.value) })}
                      placeholder="Minutes"
                    />
                  </div>
                </div>
                <Button onClick={handleAddRule} className="mt-4">
                  Ajouter la règle
                </Button>
              </div>

              {/* Liste des règles existantes */}
              <div className="space-y-2">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{rule.name}</span>
                        <Badge className={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                        {rule.enabled ? (
                          <Badge variant="default">Activée</Badge>
                        ) : (
                          <Badge variant="secondary">Désactivée</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.metric} {rule.operator} {rule.threshold} (cooldown: {rule.cooldown}min)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Import/Export */}
          <Card>
            <CardHeader>
              <CardTitle>Sauvegarde et restauration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button onClick={handleExportData} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exporter les données
                </Button>
                <div>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                    id="import-monitoring"
                  />
                  <Button asChild className="flex items-center gap-2">
                    <label htmlFor="import-monitoring" className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      Importer les données
                    </label>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
