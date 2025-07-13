"use client"
import { supabase } from "@/app/lib/supabase"

export interface SystemMetrics {
  timestamp: string
  cpu_usage: number
  memory_usage: number
  response_time: number
  error_rate: number
  active_users: number
  db_connections: number
  api_calls: number
}

export interface AlertRule {
  id: string
  name: string
  metric: keyof SystemMetrics
  operator: "gt" | "lt" | "eq" | "gte" | "lte"
  threshold: number
  severity: "low" | "medium" | "high" | "critical"
  enabled: boolean
  cooldown: number // minutes
  channels: string[]
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  rule_id: string
  rule_name: string
  message: string
  severity: "low" | "medium" | "high" | "critical"
  status: "active" | "resolved" | "acknowledged"
  triggered_at: string
  resolved_at?: string
  acknowledged_at?: string
  acknowledged_by?: string
  metric_value: number
  threshold: number
  metadata?: Record<string, any>
}

export interface HealthCheck {
  service: string
  status: "healthy" | "degraded" | "unhealthy"
  response_time: number
  last_check: string
  error_message?: string
  details?: Record<string, any>
}

class MonitoringService {
  private metrics: SystemMetrics[] = []
  private alerts: Alert[] = []
  private alertRules: AlertRule[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()
  private isRunning = false
  private intervalId?: NodeJS.Timeout
  private lastAlertTimes: Map<string, number> = new Map()

  constructor() {
    this.loadDefaultRules()
    this.loadStoredData()
  }

  private loadDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: "cpu-high",
        name: "CPU Usage High",
        metric: "cpu_usage",
        operator: "gt",
        threshold: 80,
        severity: "high",
        enabled: true,
        cooldown: 5,
        channels: ["browser", "email"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "memory-high",
        name: "Memory Usage High",
        metric: "memory_usage",
        operator: "gt",
        threshold: 85,
        severity: "high",
        enabled: true,
        cooldown: 5,
        channels: ["browser", "email"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "response-time-slow",
        name: "Response Time Slow",
        metric: "response_time",
        operator: "gt",
        threshold: 2000,
        severity: "medium",
        enabled: true,
        cooldown: 3,
        channels: ["browser"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "error-rate-high",
        name: "Error Rate High",
        metric: "error_rate",
        operator: "gt",
        threshold: 5,
        severity: "critical",
        enabled: true,
        cooldown: 1,
        channels: ["browser", "email", "sms"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    this.alertRules = defaultRules
  }

  private loadStoredData() {
    try {
      const storedMetrics = localStorage.getItem("lotysis_metrics")
      if (storedMetrics) {
        this.metrics = JSON.parse(storedMetrics).slice(-1000) // Keep last 1000 entries
      }

      const storedAlerts = localStorage.getItem("lotysis_alerts")
      if (storedAlerts) {
        this.alerts = JSON.parse(storedAlerts).slice(-500) // Keep last 500 alerts
      }

      const storedRules = localStorage.getItem("lotysis_alert_rules")
      if (storedRules) {
        this.alertRules = JSON.parse(storedRules)
      }
    } catch (error) {
      console.error("Error loading stored monitoring data:", error)
    }
  }

  private saveData() {
    try {
      localStorage.setItem("lotysis_metrics", JSON.stringify(this.metrics.slice(-1000)))
      localStorage.setItem("lotysis_alerts", JSON.stringify(this.alerts.slice(-500)))
      localStorage.setItem("lotysis_alert_rules", JSON.stringify(this.alertRules))
    } catch (error) {
      console.error("Error saving monitoring data:", error)
    }
  }

  async start() {
    if (this.isRunning) return

    this.isRunning = true
    console.log("🔍 Monitoring service started")

    // Collect initial metrics
    await this.collectMetrics()

    // Set up periodic collection
    this.intervalId = setInterval(async () => {
      await this.collectMetrics()
      await this.checkHealth()
      this.checkAlerts()
      this.saveData()
    }, 30000) // Every 30 seconds

    // Initial health check
    await this.checkHealth()
  }

  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    console.log("🔍 Monitoring service stopped")
  }

  private async collectMetrics() {
    try {
      const startTime = performance.now()

      // Simulate system metrics collection
      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        cpu_usage: this.simulateCPUUsage(),
        memory_usage: this.simulateMemoryUsage(),
        response_time: 0, // Will be set below
        error_rate: this.calculateErrorRate(),
        active_users: this.getActiveUsers(),
        db_connections: await this.getDBConnections(),
        api_calls: this.getAPICallCount(),
      }

      // Measure response time with a test API call
      try {
        const testStart = performance.now()
        const response = await fetch("/api/health")
        const testEnd = performance.now()
        metrics.response_time = testEnd - testStart
      } catch (error) {
        metrics.response_time = 5000 // High value to indicate error
        metrics.error_rate += 10
      }

      this.metrics.push(metrics)

      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000)
      }

      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent("metrics-updated", { detail: metrics }))
    } catch (error) {
      console.error("Error collecting metrics:", error)
    }
  }

  private simulateCPUUsage(): number {
    // Simulate CPU usage with some randomness and trends
    const baseUsage = 20 + Math.random() * 30
    const spike = Math.random() < 0.1 ? Math.random() * 40 : 0
    return Math.min(100, baseUsage + spike)
  }

  private simulateMemoryUsage(): number {
    // Simulate memory usage with gradual increase over time
    const baseUsage = 40 + ((Date.now() % 3600000) / 3600000) * 20 // Increases over an hour
    const variation = Math.random() * 10 - 5
    return Math.min(100, Math.max(0, baseUsage + variation))
  }

  private calculateErrorRate(): number {
    // Calculate error rate from recent metrics
    const recentMetrics = this.metrics.slice(-10)
    if (recentMetrics.length === 0) return 0

    const errors = recentMetrics.filter((m) => m.response_time > 3000).length
    return (errors / recentMetrics.length) * 100
  }

  private getActiveUsers(): number {
    // Simulate active users
    return Math.floor(Math.random() * 50) + 10
  }

  private async getDBConnections(): Promise<number> {
    try {
      // Test database connection
      const { data, error } = await supabase.from("lottery_results").select("count").limit(1)
      return error ? 0 : Math.floor(Math.random() * 10) + 5
    } catch (error) {
      return 0
    }
  }

  private getAPICallCount(): number {
    // Simulate API call count
    return Math.floor(Math.random() * 100) + 50
  }

  private async checkHealth() {
    const services = [
      { name: "database", check: this.checkDatabaseHealth },
      { name: "api", check: this.checkAPIHealth },
      { name: "external-api", check: this.checkExternalAPIHealth },
    ]

    for (const service of services) {
      try {
        const startTime = performance.now()
        const result = await service.check()
        const endTime = performance.now()

        const healthCheck: HealthCheck = {
          service: service.name,
          status: result.status,
          response_time: endTime - startTime,
          last_check: new Date().toISOString(),
          error_message: result.error,
          details: result.details,
        }

        this.healthChecks.set(service.name, healthCheck)
      } catch (error) {
        this.healthChecks.set(service.name, {
          service: service.name,
          status: "unhealthy",
          response_time: 0,
          last_check: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Dispatch health update event
    window.dispatchEvent(
      new CustomEvent("health-updated", {
        detail: Array.from(this.healthChecks.values()),
      }),
    )
  }

  private async checkDatabaseHealth(): Promise<{ status: HealthCheck["status"]; error?: string; details?: any }> {
    try {
      const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

      if (error) {
        return { status: "unhealthy", error: error.message }
      }

      return {
        status: "healthy",
        details: {
          connection: "active",
          query_time: "<100ms",
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Database connection failed",
      }
    }
  }

  private async checkAPIHealth(): Promise<{ status: HealthCheck["status"]; error?: string; details?: any }> {
    try {
      const response = await fetch("/api/health")

      if (!response.ok) {
        return { status: "degraded", error: `HTTP ${response.status}` }
      }

      const data = await response.json()
      return {
        status: "healthy",
        details: data,
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "API health check failed",
      }
    }
  }

  private async checkExternalAPIHealth(): Promise<{ status: HealthCheck["status"]; error?: string; details?: any }> {
    try {
      const response = await fetch("/api/external-results?test=true")

      if (!response.ok) {
        return { status: "degraded", error: `External API HTTP ${response.status}` }
      }

      return {
        status: "healthy",
        details: {
          endpoint: "responsive",
          last_sync: "recent",
        },
      }
    } catch (error) {
      return {
        status: "degraded",
        error: error instanceof Error ? error.message : "External API check failed",
      }
    }
  }

  private checkAlerts() {
    if (this.metrics.length === 0) return

    const latestMetrics = this.metrics[this.metrics.length - 1]

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue

      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0
      const cooldownMs = rule.cooldown * 60 * 1000
      if (Date.now() - lastAlertTime < cooldownMs) continue

      const metricValue = latestMetrics[rule.metric]
      const threshold = rule.threshold
      let shouldAlert = false

      switch (rule.operator) {
        case "gt":
          shouldAlert = metricValue > threshold
          break
        case "gte":
          shouldAlert = metricValue >= threshold
          break
        case "lt":
          shouldAlert = metricValue < threshold
          break
        case "lte":
          shouldAlert = metricValue <= threshold
          break
        case "eq":
          shouldAlert = metricValue === threshold
          break
      }

      if (shouldAlert) {
        this.triggerAlert(rule, metricValue)
        this.lastAlertTimes.set(rule.id, Date.now())
      }
    }
  }

  private triggerAlert(rule: AlertRule, metricValue: number) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule_id: rule.id,
      rule_name: rule.name,
      message: `${rule.name}: ${rule.metric} is ${metricValue} (threshold: ${rule.threshold})`,
      severity: rule.severity,
      status: "active",
      triggered_at: new Date().toISOString(),
      metric_value: metricValue,
      threshold: rule.threshold,
      metadata: {
        metric: rule.metric,
        operator: rule.operator,
        channels: rule.channels,
      },
    }

    this.alerts.unshift(alert) // Add to beginning

    // Keep only last 500 alerts
    if (this.alerts.length > 500) {
      this.alerts = this.alerts.slice(0, 500)
    }

    console.warn(`🚨 Alert triggered: ${alert.message}`)

    // Dispatch alert event
    window.dispatchEvent(new CustomEvent("alert-triggered", { detail: alert }))

    // Send notifications through configured channels
    this.sendNotifications(alert, rule.channels)
  }

  private async sendNotifications(alert: Alert, channels: string[]) {
    for (const channel of channels) {
      try {
        switch (channel) {
          case "browser":
            this.sendBrowserNotification(alert)
            break
          case "email":
            await this.sendEmailNotification(alert)
            break
          case "sms":
            await this.sendSMSNotification(alert)
            break
          case "webhook":
            await this.sendWebhookNotification(alert)
            break
        }
      } catch (error) {
        console.error(`Failed to send notification via ${channel}:`, error)
      }
    }
  }

  private sendBrowserNotification(alert: Alert) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Lotysis Alert - ${alert.severity.toUpperCase()}`, {
        body: alert.message,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: alert.rule_id,
        requireInteraction: alert.severity === "critical",
      })
    }
  }

  private async sendEmailNotification(alert: Alert) {
    // Placeholder for email notification
    console.log("📧 Email notification would be sent:", alert.message)
  }

  private async sendSMSNotification(alert: Alert) {
    // Placeholder for SMS notification
    console.log("📱 SMS notification would be sent:", alert.message)
  }

  private async sendWebhookNotification(alert: Alert) {
    // Placeholder for webhook notification
    console.log("🔗 Webhook notification would be sent:", alert.message)
  }

  // Public API methods
  getMetrics(limit = 100): SystemMetrics[] {
    return this.metrics.slice(-limit)
  }

  getAlerts(status?: Alert["status"]): Alert[] {
    if (status) {
      return this.alerts.filter((alert) => alert.status === status)
    }
    return this.alerts
  }

  getAlertRules(): AlertRule[] {
    return this.alertRules
  }

  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    const alert = this.alerts.find((a) => a.id === alertId)
    if (alert && alert.status === "active") {
      alert.status = "acknowledged"
      alert.acknowledged_at = new Date().toISOString()
      alert.acknowledged_by = acknowledgedBy
      this.saveData()

      window.dispatchEvent(new CustomEvent("alert-acknowledged", { detail: alert }))
    }
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find((a) => a.id === alertId)
    if (alert && alert.status !== "resolved") {
      alert.status = "resolved"
      alert.resolved_at = new Date().toISOString()
      this.saveData()

      window.dispatchEvent(new CustomEvent("alert-resolved", { detail: alert }))
    }
  }

  addAlertRule(rule: Omit<AlertRule, "id" | "created_at" | "updated_at">) {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    this.alertRules.push(newRule)
    this.saveData()
    return newRule
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>) {
    const ruleIndex = this.alertRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex !== -1) {
      this.alertRules[ruleIndex] = {
        ...this.alertRules[ruleIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      }
      this.saveData()
      return this.alertRules[ruleIndex]
    }
    return null
  }

  deleteAlertRule(ruleId: string) {
    const ruleIndex = this.alertRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex !== -1) {
      this.alertRules.splice(ruleIndex, 1)
      this.saveData()
      return true
    }
    return false
  }

  exportData() {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      alertRules: this.alertRules,
      healthChecks: Array.from(this.healthChecks.values()),
      exportedAt: new Date().toISOString(),
    }
  }

  importData(data: any) {
    try {
      if (data.metrics) this.metrics = data.metrics
      if (data.alerts) this.alerts = data.alerts
      if (data.alertRules) this.alertRules = data.alertRules

      this.saveData()
      return true
    } catch (error) {
      console.error("Error importing monitoring data:", error)
      return false
    }
  }

  getSystemStatus(): "healthy" | "degraded" | "unhealthy" {
    const healthChecks = Array.from(this.healthChecks.values())
    const activeAlerts = this.alerts.filter((a) => a.status === "active")

    if (healthChecks.some((h) => h.status === "unhealthy") || activeAlerts.some((a) => a.severity === "critical")) {
      return "unhealthy"
    }

    if (healthChecks.some((h) => h.status === "degraded") || activeAlerts.some((a) => a.severity === "high")) {
      return "degraded"
    }

    return "healthy"
  }
}

// Singleton instance
export const monitoringService = new MonitoringService()

// Auto-start in browser environment
if (typeof window !== "undefined") {
  monitoringService.start()
}

export default monitoringService
