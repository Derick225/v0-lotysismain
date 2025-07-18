// Types pour le système de logging
export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  context?: string
  userId?: string
  sessionId?: string
}

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  resource: string
  userId?: string
  details: any
  ipAddress?: string
  userAgent?: string
}

// Configuration du logger
const LOG_CONFIG = {
  enableConsole: process.env.NODE_ENV === "development",
  enableStorage: true,
  maxStorageEntries: 1000,
  logLevels: ["debug", "info", "warn", "error"] as LogLevel[],
  enableAudit: true,
}

// Classe principale du logger
class Logger {
  private logs: LogEntry[] = []
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.loadStoredLogs()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadStoredLogs() {
    if (!LOG_CONFIG.enableStorage || typeof window === "undefined") return

    try {
      const stored = localStorage.getItem("lotysis_logs")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-LOG_CONFIG.maxStorageEntries)
        }
      }
    } catch (error) {
      console.warn("Failed to load stored logs:", error)
    }
  }

  private saveToStorage() {
    if (!LOG_CONFIG.enableStorage || typeof window === "undefined") return

    try {
      const toStore = this.logs.slice(-LOG_CONFIG.maxStorageEntries)
      localStorage.setItem("lotysis_logs", JSON.stringify(toStore))
    } catch (error) {
      console.warn("Failed to save logs to storage:", error)
    }
  }

  private createLogEntry(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
      sessionId: this.sessionId,
    }
  }

  private writeLog(entry: LogEntry) {
    // Ajouter à la collection interne
    this.logs.push(entry)

    // Limiter la taille en mémoire
    if (this.logs.length > LOG_CONFIG.maxStorageEntries) {
      this.logs = this.logs.slice(-LOG_CONFIG.maxStorageEntries)
    }

    // Sauvegarder dans le stockage local
    if (typeof window !== "undefined") {
      this.saveToStorage()
    }

    // Afficher dans la console si activé
    if (LOG_CONFIG.enableConsole) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString()
      const contextStr = entry.context ? `[${entry.context}]` : ""
      const logMessage = `${timestamp} ${contextStr} ${entry.message}`

      switch (entry.level) {
        case "debug":
          if (process.env.NODE_ENV === 'development') {
            console.debug(logMessage, entry.data)
          }
          break
        case "info":
          console.info(logMessage, entry.data)
          break
        case "warn":
          console.warn(logMessage, entry.data)
          break
        case "error":
          console.error(logMessage, entry.data)
          break
      }
    }
  }

  // Méthodes publiques de logging
  debug(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry("debug", message, data, context)
    this.writeLog(entry)
  }

  info(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry("info", message, data, context)
    this.writeLog(entry)
  }

  warn(message: string, data?: any, context?: string) {
    const entry = this.createLogEntry("warn", message, data, context)
    this.writeLog(entry)
  }

  error(message: string, error?: any, context?: string) {
    const entry = this.createLogEntry("error", message, error, context)
    this.writeLog(entry)
  }

  // Méthodes utilitaires
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.logs

    if (level) {
      filtered = filtered.filter((log) => log.level === level)
    }

    if (limit) {
      filtered = filtered.slice(-limit)
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  clearLogs() {
    this.logs = []
    if (typeof window !== "undefined") {
      localStorage.removeItem("lotysis_logs")
    }
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  getSessionId(): string {
    return this.sessionId
  }

  // Méthodes de performance
  time(label: string) {
    if (LOG_CONFIG.enableConsole) {
      console.time(label)
    }
  }

  timeEnd(label: string) {
    if (LOG_CONFIG.enableConsole) {
      console.timeEnd(label)
    }
  }

  // Logging conditionnel
  logIf(condition: boolean, level: LogLevel, message: string, data?: any, context?: string) {
    if (condition) {
      this[level](message, data, context)
    }
  }
}

// Service d'audit pour les actions importantes
export class AuditService {
  private static audits: AuditEntry[] = []
  private static readonly MAX_AUDIT_ENTRIES = 500

  static log(action: string, resource: string, details: any, userId?: string) {
    if (!LOG_CONFIG.enableAudit) return

    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action,
      resource,
      userId,
      details,
      ipAddress: this.getClientIP(),
      userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
    }

    this.audits.push(entry)

    // Limiter la taille
    if (this.audits.length > this.MAX_AUDIT_ENTRIES) {
      this.audits = this.audits.slice(-this.MAX_AUDIT_ENTRIES)
    }

    // Sauvegarder dans le stockage local
    this.saveAudits()

    // Logger l'action
    logger.info(`Audit: ${action} on ${resource}`, details, "AuditService")
  }

  private static getClientIP(): string | undefined {
    // En production, ceci devrait être obtenu côté serveur
    return undefined
  }

  private static saveAudits() {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem("lotysis_audits", JSON.stringify(this.audits))
    } catch (error) {
      console.warn("Failed to save audit logs:", error)
    }
  }

  static loadAudits() {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem("lotysis_audits")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.audits = parsed.slice(-this.MAX_AUDIT_ENTRIES)
        }
      }
    } catch (error) {
      console.warn("Failed to load audit logs:", error)
    }
  }

  static getAudits(limit?: number): AuditEntry[] {
    const result = [...this.audits].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return limit ? result.slice(0, limit) : result
  }

  static clearAudits() {
    this.audits = []
    if (typeof window !== "undefined") {
      localStorage.removeItem("lotysis_audits")
    }
  }

  static exportAudits(): string {
    return JSON.stringify(this.audits, null, 2)
  }

  // Actions d'audit prédéfinies
  static logDataEntry(drawName: string, numbers: number[], userId?: string) {
    this.log("DATA_ENTRY", "lottery_result", { drawName, numbers }, userId)
  }

  static logPredictionGenerated(drawName: string, algorithm: string, numbers: number[], userId?: string) {
    this.log("PREDICTION_GENERATED", "prediction", { drawName, algorithm, numbers }, userId)
  }

  static logModelTrained(drawName: string, modelType: string, performance: any, userId?: string) {
    this.log("MODEL_TRAINED", "ml_model", { drawName, modelType, performance }, userId)
  }

  static logDataExport(format: string, recordCount: number, userId?: string) {
    this.log("DATA_EXPORT", "data", { format, recordCount }, userId)
  }

  static logDataImport(source: string, recordCount: number, userId?: string) {
    this.log("DATA_IMPORT", "data", { source, recordCount }, userId)
  }

  static logSystemError(error: string, context: string, userId?: string) {
    this.log("SYSTEM_ERROR", "system", { error, context }, userId)
  }
}

// Instance globale du logger
const logger = new Logger()

// Initialiser les audits
if (typeof window !== "undefined") {
  AuditService.loadAudits()
}

// Fonctions utilitaires pour le logging structuré
export const loggers = {
  api: {
    request: (method: string, url: string, data?: any) => logger.info(`API Request: ${method} ${url}`, data, "API"),
    response: (method: string, url: string, status: number, data?: any) =>
      logger.info(`API Response: ${method} ${url} - ${status}`, data, "API"),
    error: (method: string, url: string, error: any) => logger.error(`API Error: ${method} ${url}`, error, "API"),
  },

  ui: {
    interaction: (component: string, action: string, data?: any) =>
      logger.debug(`UI: ${component} - ${action}`, data, "UI"),
    error: (component: string, error: any) => logger.error(`UI Error: ${component}`, error, "UI"),
  },

  data: {
    loaded: (source: string, count: number) =>
      logger.info(`Data loaded from ${source}: ${count} records`, undefined, "DATA"),
    saved: (destination: string, count: number) =>
      logger.info(`Data saved to ${destination}: ${count} records`, undefined, "DATA"),
    error: (operation: string, error: any) => logger.error(`Data error: ${operation}`, error, "DATA"),
  },

  ml: {
    training: (model: string, dataset: string) =>
      logger.info(`ML Training started: ${model} on ${dataset}`, undefined, "ML"),
    trained: (model: string, performance: any) => logger.info(`ML Training completed: ${model}`, performance, "ML"),
    prediction: (model: string, input: any, output: any) =>
      logger.debug(`ML Prediction: ${model}`, { input, output }, "ML"),
    error: (operation: string, error: any) => logger.error(`ML Error: ${operation}`, error, "ML"),
  },
}

// Export par défaut
export default logger

// Exports nommés
export { Logger, LOG_CONFIG }

// Fonction pour configurer le logger
export function configureLogger(config: Partial<typeof LOG_CONFIG>) {
  Object.assign(LOG_CONFIG, config)
}

// Hook pour React (si nécessaire)
export function useLogger() {
  return {
    logger,
    loggers,
    AuditService,
    getLogs: (level?: LogLevel, limit?: number) => logger.getLogs(level, limit),
    clearLogs: () => logger.clearLogs(),
    exportLogs: () => logger.exportLogs(),
  }
}
