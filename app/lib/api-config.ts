interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

interface APIStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: string;
  uptime: number;
}

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  database: boolean;
  api: boolean;
  externalServices: boolean;
  timestamp: string;
  details?: any;
}

class APIConfigService {
  private config: APIConfig;
  private stats: APIStats;
  private startTime: number;

  constructor() {
    this.config = {
      baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
      timeout: 30000, // 30 secondes
      retryAttempts: 3,
      retryDelay: 1000, // 1 seconde
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: 0,
    };

    this.startTime = Date.now();
  }

  getConfig(): APIConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<APIConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async makeRequest<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Mettre à jour les statistiques de succès
      this.updateStats(startTime, true)

      return data
    } catch (error) {
      // Retry logic
      if (retryCount < this.config.retryAttempts) {
        await this.delay(this.config.retryDelay * (retryCount + 1))
        return this.makeRequest<T>(endpoint, options, retryCount + 1)
      }

      // Mettre à jour les statistiques d'échec
      this.updateStats(startTime, false)

      throw error
    }
  }

  private updateStats(startTime: number, success: boolean): void {
    const responseTime = Date.now() - startTime

    if (success) {
      this.stats.successfulRequests++
    } else {
      this.stats.failedRequests++
    }

    // Calculer le temps de réponse moyen
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime
    this.stats.averageResponseTime = totalResponseTime / this.stats.totalRequests

    this.stats.lastRequestTime = new Date().toISOString()
    this.stats.uptime = Date.now() - this.startTime
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getStats(): APIStats {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
    }
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      uptime: 0,
    }
    this.startTime = Date.now()
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: "healthy",
      database: false,
      api: false,
      externalServices: false,
      timestamp: new Date().toISOString(),
    }

    try {
      // Test de l'API interne
      const apiResponse = await this.makeRequest("/health", { method: "GET" })
      result.api = true
    } catch (error) {
      result.api = false
      console.error("API health check failed:", error)
    }

    try {
      // Test de la base de données
      const dbResponse = await this.makeRequest("/lottery-results?limit=1", { method: "GET" })
      result.database = true
    } catch (error) {
      result.database = false
      console.error("Database health check failed:", error)
    }

    try {
      // Test des services externes (API de loterie)
      const externalResponse = await this.makeRequest("/external-results/health", { method: "GET" })
      result.externalServices = true
    } catch (error) {
      result.externalServices = false
      console.error("External services health check failed:", error)
    }

    // Déterminer le statut global
    if (result.api && result.database && result.externalServices) {
      result.status = "healthy"
    } else if (result.api && result.database) {
      result.status = "degraded"
    } else {
      result.status = "unhealthy"
    }

    return result
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.baseURL) {
      errors.push("Base URL is required")
    }

    if (this.config.timeout <= 0) {
      errors.push("Timeout must be positive")
    }

    if (this.config.retryAttempts < 0) {
      errors.push("Retry attempts cannot be negative")
    }

    if (this.config.retryDelay <= 0) {
      errors.push("Retry delay must be positive")
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Instance singleton
const apiConfigService = new APIConfigService()

// Fonctions exportées pour la compatibilité
export async function checkAPIHealth(): Promise<HealthCheckResult> {
  return apiConfigService.healthCheck()
}

export function getAPIStats(): APIStats {
  return apiConfigService.getStats()
}

export function validateAPIConfig(): { valid: boolean; errors: string[] } {
  return apiConfigService.validateConfig()
}

export function makeAPIRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiConfigService.makeRequest<T>(endpoint, options)
}

export function updateAPIConfig(config: Partial<APIConfig>): void {
  apiConfigService.updateConfig(config)
}

export function resetAPIStats(): void {
  apiConfigService.resetStats()
}

export default apiConfigService
export { APIConfigService }
export type { APIConfig, APIStats, HealthCheckResult }
