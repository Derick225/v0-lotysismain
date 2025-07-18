"use client"

interface AlertChannel {
  id: string
  name: string
  type: "email" | "sms" | "webhook" | "slack" | "teams" | "discord"
  enabled: boolean
  config: Record<string, any>
  testStatus?: "success" | "failed" | "pending"
  lastUsed?: string
}

interface AlertTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  channel_types: string[]
}

interface EscalationRule {
  id: string
  name: string
  conditions: {
    severity: string[]
    duration: number // minutes
    no_acknowledgment: boolean
  }
  actions: {
    channel_ids: string[]
    escalate_to: string[]
    auto_resolve: boolean
  }
  enabled: boolean
}

interface AlertAuditLog {
  id: string
  timestamp: string
  action: "sent" | "failed" | "escalated" | "resolved" | "acknowledged"
  alert_id: string
  channel_id?: string
  user_id?: string
  details: Record<string, any>
}

class AlertService {
  private channels: AlertChannel[] = []
  private templates: AlertTemplate[] = []
  private escalationRules: EscalationRule[] = []
  private auditLog: AlertAuditLog[] = []

  constructor() {
    this.loadDefaultChannels()
    this.loadDefaultTemplates()
    this.loadStoredData()
  }

  private loadDefaultChannels() {
    this.channels = [
      {
        id: "browser",
        name: "Notifications navigateur",
        type: "webhook",
        enabled: true,
        config: {},
      },
      {
        id: "email-admin",
        name: "Email administrateur",
        type: "email",
        enabled: false,
        config: {
          smtp_host: "smtp.gmail.com",
          smtp_port: 587,
          smtp_user: "",
          smtp_password: "",
          from_email: "alerts@lotysis.com",
          to_emails: ["admin@lotysis.com"],
        },
      },
      {
        id: "sms-admin",
        name: "SMS administrateur",
        type: "sms",
        enabled: false,
        config: {
          provider: "twilio",
          account_sid: "",
          auth_token: "",
          from_number: "",
          to_numbers: ["+33123456789"],
        },
      },
      {
        id: "webhook-generic",
        name: "Webhook générique",
        type: "webhook",
        enabled: false,
        config: {
          url: "https://hooks.slack.com/services/...",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      },
      {
        id: "slack-alerts",
        name: "Canal Slack #alerts",
        type: "slack",
        enabled: false,
        config: {
          webhook_url: "",
          channel: "#alerts",
          username: "Lotysis Monitor",
          icon_emoji: ":warning:",
        },
      },
    ]
  }

  private loadDefaultTemplates() {
    this.templates = [
      {
        id: "alert-triggered",
        name: "Alerte déclenchée",
        subject: "🚨 Alerte {{severity}} - {{rule_name}}",
        body: `Une alerte a été déclenchée sur le système Lotysis.

**Détails de l'alerte:**
- Règle: {{rule_name}}
- Sévérité: {{severity}}
- Métrique: {{metric}} {{operator}} {{threshold}}
- Valeur actuelle: {{metric_value}}
- Heure: {{triggered_at}}

**Message:** {{message}}

Veuillez vérifier le système et prendre les mesures nécessaires.

---
Système de monitoring Lotysis`,
        variables: [
          "severity",
          "rule_name",
          "metric",
          "operator",
          "threshold",
          "metric_value",
          "triggered_at",
          "message",
        ],
        channel_types: ["email", "sms", "webhook", "slack", "teams"],
      },
      {
        id: "alert-escalated",
        name: "Alerte escaladée",
        subject: "🔥 ESCALADE - Alerte {{severity}} non résolue",
        body: `Une alerte critique n'a pas été résolue et a été escaladée.

**Détails de l'alerte:**
- Règle: {{rule_name}}
- Sévérité: {{severity}}
- Durée: {{duration}} minutes
- Statut: Non acquittée

**Action requise immédiatement.**

---
Système de monitoring Lotysis`,
        variables: ["severity", "rule_name", "duration"],
        channel_types: ["email", "sms", "webhook", "slack", "teams"],
      },
      {
        id: "system-health",
        name: "Rapport de santé système",
        subject: "📊 Rapport de santé - Système {{status}}",
        body: `Rapport de santé du système Lotysis:

**Statut global:** {{status}}
**Services:**
{{#services}}
- {{name}}: {{status}} ({{response_time}}ms)
{{/services}}

**Métriques actuelles:**
- CPU: {{cpu_usage}}%
- Mémoire: {{memory_usage}}%
- Temps de réponse: {{response_time}}ms

---
Généré automatiquement`,
        variables: ["status", "services", "cpu_usage", "memory_usage", "response_time"],
        channel_types: ["email", "webhook"],
      },
    ]
  }

  private loadStoredData() {
    try {
      const storedChannels = localStorage.getItem("lotysis_alert_channels")
      if (storedChannels) {
        this.channels = JSON.parse(storedChannels)
      }

      const storedTemplates = localStorage.getItem("lotysis_alert_templates")
      if (storedTemplates) {
        this.templates = JSON.parse(storedTemplates)
      }

      const storedRules = localStorage.getItem("lotysis_escalation_rules")
      if (storedRules) {
        this.escalationRules = JSON.parse(storedRules)
      }

      const storedAudit = localStorage.getItem("lotysis_alert_audit")
      if (storedAudit) {
        this.auditLog = JSON.parse(storedAudit).slice(-1000) // Keep last 1000 entries
      }
    } catch (error) {
      console.error("Error loading alert service data:", error)
    }
  }

  private saveData() {
    try {
      localStorage.setItem("lotysis_alert_channels", JSON.stringify(this.channels))
      localStorage.setItem("lotysis_alert_templates", JSON.stringify(this.templates))
      localStorage.setItem("lotysis_escalation_rules", JSON.stringify(this.escalationRules))
      localStorage.setItem("lotysis_alert_audit", JSON.stringify(this.auditLog.slice(-1000)))
    } catch (error) {
      console.error("Error saving alert service data:", error)
    }
  }

  private addAuditLog(entry: Omit<AlertAuditLog, "id" | "timestamp">) {
    const logEntry: AlertAuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    this.auditLog.unshift(logEntry)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(0, 1000)
    }

    this.saveData()
  }

  async sendAlert(alert: any, channelIds: string[] = []) {
    const enabledChannels = this.channels.filter(
      (c) => c.enabled && (channelIds.length === 0 || channelIds.includes(c.id)),
    )

    const results = await Promise.allSettled(enabledChannels.map((channel) => this.sendToChannel(alert, channel)))

    // Log results
    results.forEach((result, index) => {
      const channel = enabledChannels[index]
      if (result.status === "fulfilled") {
        this.addAuditLog({
          action: "sent",
          alert_id: alert.id,
          channel_id: channel.id,
          details: { channel_name: channel.name },
        })
      } else {
        this.addAuditLog({
          action: "failed",
          alert_id: alert.id,
          channel_id: channel.id,
          details: {
            channel_name: channel.name,
            error: result.reason?.message || "Unknown error",
          },
        })
      }
    })

    return results
  }

  private async sendToChannel(alert: any, channel: AlertChannel) {
    const template = this.templates.find((t) => t.id === "alert-triggered")
    if (!template) throw new Error("Template not found")

    const message = this.renderTemplate(template, alert)

    switch (channel.type) {
      case "email":
        return this.sendEmail(channel, message)
      case "sms":
        return this.sendSMS(channel, message)
      case "webhook":
        return this.sendWebhook(channel, message, alert)
      case "slack":
        return this.sendSlack(channel, message, alert)
      case "teams":
        return this.sendTeams(channel, message, alert)
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`)
    }
  }

  private renderTemplate(template: AlertTemplate, data: any): { subject: string; body: string } {
    let subject = template.subject
    let body = template.body

    // Simple template variable replacement
    Object.keys(data).forEach((key) => {
      const value = data[key]
      const regex = new RegExp(`{{${key}}}`, "g")
      subject = subject.replace(regex, String(value))
      body = body.replace(regex, String(value))
    })

    // Format timestamp
    if (data.triggered_at) {
      const formattedTime = new Date(data.triggered_at).toLocaleString("fr-FR")
      subject = subject.replace(/{{triggered_at}}/g, formattedTime)
      body = body.replace(/{{triggered_at}}/g, formattedTime)
    }

    return { subject, body }
  }

  private async sendEmail(channel: AlertChannel, message: { subject: string; body: string }) {
    // Placeholder for email sending
    console.log("📧 Sending email:", {
      channel: channel.name,
      to: channel.config.to_emails,
      subject: message.subject,
      body: message.body,
    })

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update last used
    channel.lastUsed = new Date().toISOString()
    this.saveData()

    return { success: true, channel: channel.id }
  }

  private async sendSMS(channel: AlertChannel, message: { subject: string; body: string }) {
    // Placeholder for SMS sending
    console.log("📱 Sending SMS:", {
      channel: channel.name,
      to: channel.config.to_numbers,
      message: `${message.subject}\n\n${message.body}`,
    })

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    channel.lastUsed = new Date().toISOString()
    this.saveData()

    return { success: true, channel: channel.id }
  }

  private async sendWebhook(channel: AlertChannel, message: { subject: string; body: string }, alert: any) {
    const payload = {
      alert_id: alert.id,
      severity: alert.severity,
      rule_name: alert.rule_name,
      message: alert.message,
      triggered_at: alert.triggered_at,
      subject: message.subject,
      body: message.body,
      timestamp: new Date().toISOString(),
    }

    console.log("🔗 Sending webhook:", {
      channel: channel.name,
      url: channel.config.url,
      payload,
    })

    // Simulate webhook call
    await new Promise((resolve) => setTimeout(resolve, 800))

    channel.lastUsed = new Date().toISOString()
    this.saveData()

    return { success: true, channel: channel.id }
  }

  private async sendSlack(channel: AlertChannel, message: { subject: string; body: string }, alert: any) {
    const slackMessage = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.icon_emoji,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          title: message.subject,
          text: message.body,
          fields: [
            {
              title: "Sévérité",
              value: alert.severity,
              short: true,
            },
            {
              title: "Métrique",
              value: `${alert.metric_value} (seuil: ${alert.threshold})`,
              short: true,
            },
          ],
          ts: Math.floor(new Date(alert.triggered_at).getTime() / 1000),
        },
      ],
    }

    console.log("💬 Sending Slack message:", {
      channel: channel.name,
      webhook_url: channel.config.webhook_url,
      message: slackMessage,
    })

    await new Promise((resolve) => setTimeout(resolve, 1200))

    channel.lastUsed = new Date().toISOString()
    this.saveData()

    return { success: true, channel: channel.id }
  }

  private async sendTeams(channel: AlertChannel, message: { subject: string; body: string }, alert: any) {
    const teamsMessage = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: this.getSeverityColor(alert.severity),
      summary: message.subject,
      sections: [
        {
          activityTitle: message.subject,
          activitySubtitle: "Système de monitoring Lotysis",
          text: message.body,
          facts: [
            {
              name: "Sévérité",
              value: alert.severity,
            },
            {
              name: "Règle",
              value: alert.rule_name,
            },
            {
              name: "Valeur",
              value: `${alert.metric_value} (seuil: ${alert.threshold})`,
            },
          ],
        },
      ],
    }

    console.log("🔔 Sending Teams message:", {
      channel: channel.name,
      webhook_url: channel.config.webhook_url,
      message: teamsMessage,
    })

    await new Promise((resolve) => setTimeout(resolve, 1000))

    channel.lastUsed = new Date().toISOString()
    this.saveData()

    return { success: true, channel: channel.id }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case "critical":
        return "#FF0000"
      case "high":
        return "#FF8C00"
      case "medium":
        return "#FFD700"
      case "low":
        return "#0080FF"
      default:
        return "#808080"
    }
  }

  async testChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
    const channel = this.channels.find((c) => c.id === channelId)
    if (!channel) {
      return { success: false, error: "Channel not found" }
    }

    try {
      const testAlert = {
        id: "test_alert",
        severity: "medium",
        rule_name: "Test Alert",
        message: "Ceci est un test de notification",
        metric_value: 75,
        threshold: 80,
        triggered_at: new Date().toISOString(),
      }

      await this.sendToChannel(testAlert, channel)

      channel.testStatus = "success"
      this.saveData()

      return { success: true }
    } catch (error) {
      channel.testStatus = "failed"
      this.saveData()

      return {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
      }
    }
  }

  // Public API methods
  getChannels(): AlertChannel[] {
    return this.channels
  }

  getTemplates(): AlertTemplate[] {
    return this.templates
  }

  getEscalationRules(): EscalationRule[] {
    return this.escalationRules
  }

  getAuditLog(limit = 100): AlertAuditLog[] {
    return this.auditLog.slice(0, limit)
  }

  addChannel(channel: Omit<AlertChannel, "id">): AlertChannel {
    const newChannel: AlertChannel = {
      ...channel,
      id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    this.channels.push(newChannel)
    this.saveData()
    return newChannel
  }

  updateChannel(channelId: string, updates: Partial<AlertChannel>): AlertChannel | null {
    const channelIndex = this.channels.findIndex((c) => c.id === channelId)
    if (channelIndex === -1) return null

    this.channels[channelIndex] = { ...this.channels[channelIndex], ...updates }
    this.saveData()
    return this.channels[channelIndex]
  }

  deleteChannel(channelId: string): boolean {
    const channelIndex = this.channels.findIndex((c) => c.id === channelId)
    if (channelIndex === -1) return false

    this.channels.splice(channelIndex, 1)
    this.saveData()
    return true
  }

  addTemplate(template: Omit<AlertTemplate, "id">): AlertTemplate {
    const newTemplate: AlertTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    this.templates.push(newTemplate)
    this.saveData()
    return newTemplate
  }

  updateTemplate(templateId: string, updates: Partial<AlertTemplate>): AlertTemplate | null {
    const templateIndex = this.templates.findIndex((t) => t.id === templateId)
    if (templateIndex === -1) return null

    this.templates[templateIndex] = { ...this.templates[templateIndex], ...updates }
    this.saveData()
    return this.templates[templateIndex]
  }

  deleteTemplate(templateId: string): boolean {
    const templateIndex = this.templates.findIndex((t) => t.id === templateId)
    if (templateIndex === -1) return false

    this.templates.splice(templateIndex, 1)
    this.saveData()
    return true
  }

  addEscalationRule(rule: Omit<EscalationRule, "id">): EscalationRule {
    const newRule: EscalationRule = {
      ...rule,
      id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }

    this.escalationRules.push(newRule)
    this.saveData()
    return newRule
  }

  updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): EscalationRule | null {
    const ruleIndex = this.escalationRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex === -1) return null

    this.escalationRules[ruleIndex] = { ...this.escalationRules[ruleIndex], ...updates }
    this.saveData()
    return this.escalationRules[ruleIndex]
  }

  deleteEscalationRule(ruleId: string): boolean {
    const ruleIndex = this.escalationRules.findIndex((r) => r.id === ruleId)
    if (ruleIndex === -1) return false

    this.escalationRules.splice(ruleIndex, 1)
    this.saveData()
    return true
  }

  exportConfiguration() {
    return {
      channels: this.channels,
      templates: this.templates,
      escalationRules: this.escalationRules,
      auditLog: this.auditLog,
      exportedAt: new Date().toISOString(),
    }
  }

  importConfiguration(data: any): boolean {
    try {
      if (data.channels) this.channels = data.channels
      if (data.templates) this.templates = data.templates
      if (data.escalationRules) this.escalationRules = data.escalationRules
      if (data.auditLog) this.auditLog = data.auditLog

      this.saveData()
      return true
    } catch (error) {
      console.error("Error importing alert configuration:", error)
      return false
    }
  }
}

// Singleton instance
export const alertService = new AlertService()

export default alertService
