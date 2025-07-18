"use client"

import { useState, useEffect } from "react"
import monitoringService, {
  type SystemMetrics,
  type Alert,
  type AlertRule,
  type HealthCheck,
} from "@/app/services/monitoring-service"

export function useMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load initial data
    loadData()

    // Set up event listeners
    const handleMetricsUpdate = () => loadData()
    const handleAlertTriggered = () => loadData()
    const handleAlertAcknowledged = () => loadData()
    const handleAlertResolved = () => loadData()
    const handleHealthUpdate = (event: CustomEvent) => {
      setHealthChecks(event.detail)
    }

    window.addEventListener("metrics-updated", handleMetricsUpdate)
    window.addEventListener("alert-triggered", handleAlertTriggered)
    window.addEventListener("alert-acknowledged", handleAlertAcknowledged)
    window.addEventListener("alert-resolved", handleAlertResolved)
    window.addEventListener("health-updated", handleHealthUpdate as EventListener)

    return () => {
      window.removeEventListener("metrics-updated", handleMetricsUpdate)
      window.removeEventListener("alert-triggered", handleAlertTriggered)
      window.removeEventListener("alert-acknowledged", handleAlertAcknowledged)
      window.removeEventListener("alert-resolved", handleAlertResolved)
      window.removeEventListener("health-updated", handleHealthUpdate as EventListener)
    }
  }, [])

  const loadData = () => {
    try {
      setMetrics(monitoringService.getMetrics(200))
      setAlerts(monitoringService.getAlerts())
      setAlertRules(monitoringService.getAlertRules())
      setHealthChecks(monitoringService.getHealthChecks())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  // Computed values
  const latestMetrics = metrics[metrics.length - 1]
  const activeAlerts = alerts.filter((alert) => alert.status === "active")
  const systemStatus = monitoringService.getSystemStatus()

  const averageMetrics =
    metrics.length > 0
      ? {
          cpu: metrics.reduce((sum, m) => sum + m.cpu_usage, 0) / metrics.length,
          memory: metrics.reduce((sum, m) => sum + m.memory_usage, 0) / metrics.length,
          responseTime: metrics.reduce((sum, m) => sum + m.response_time, 0) / metrics.length,
          errorRate: metrics.reduce((sum, m) => sum + m.error_rate, 0) / metrics.length,
        }
      : null

  // Actions
  const acknowledgeAlert = (alertId: string, acknowledgedBy = "User") => {
    monitoringService.acknowledgeAlert(alertId, acknowledgedBy)
  }

  const resolveAlert = (alertId: string) => {
    monitoringService.resolveAlert(alertId)
  }

  const addAlertRule = (rule: Omit<AlertRule, "id" | "created_at" | "updated_at">) => {
    return monitoringService.addAlertRule(rule)
  }

  const updateAlertRule = (ruleId: string, updates: Partial<AlertRule>) => {
    return monitoringService.updateAlertRule(ruleId, updates)
  }

  const deleteAlertRule = (ruleId: string) => {
    return monitoringService.deleteAlertRule(ruleId)
  }

  const exportData = () => {
    return monitoringService.exportData()
  }

  const importData = (data: any) => {
    return monitoringService.importData(data)
  }

  const startMonitoring = () => {
    monitoringService.start()
  }

  const stopMonitoring = () => {
    monitoringService.stop()
  }

  return {
    // Data
    metrics,
    alerts,
    alertRules,
    healthChecks,
    latestMetrics,
    activeAlerts,
    systemStatus,
    averageMetrics,

    // State
    isLoading,
    error,

    // Actions
    acknowledgeAlert,
    resolveAlert,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    exportData,
    importData,
    startMonitoring,
    stopMonitoring,
    refresh: loadData,
  }
}
