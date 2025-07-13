"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { DrawResult } from "../lib/constants"
import { enhancedApiService } from "../lib/enhanced-api-service"
import logger from "../lib/logger"

interface UseEnhancedDrawDataOptions {
  drawName?: string
  month?: string
  year?: string
  autoRefresh?: boolean
  refreshInterval?: number
  useCache?: boolean
}

interface UseEnhancedDrawDataReturn {
  drawResults: DrawResult[]
  loading: boolean
  error: string | null
  isOnline: boolean
  cacheStats: any
  lastSync: Date | null
  refreshData: (forceRefresh?: boolean) => Promise<void>
  syncSpecificDraw: (drawName: string) => Promise<void>
  syncAllDraws: () => Promise<void>
  clearCache: () => Promise<void>
  exportData: () => Promise<string>
  importData: (data: string) => Promise<void>
  getDrawData: (drawName: string) => DrawResult[]
  getRecentResults: (limit?: number) => DrawResult[]
  isStale: boolean
  retryCount: number
}

const STALE_THRESHOLD = 10 * 60 * 1000 // 10 minutes
const MAX_RETRY_COUNT = 3
const RETRY_DELAY = 2000 // 2 seconds

export function useEnhancedDrawData(options: UseEnhancedDrawDataOptions = {}): UseEnhancedDrawDataReturn {
  const {
    drawName,
    month,
    year,
    autoRefresh = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    useCache = true
  } = options

  // State management
  const [drawResults, setDrawResults] = useState<DrawResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Refs for cleanup and control
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // Computed values
  const isStale = lastSync ? (Date.now() - lastSync.getTime()) > STALE_THRESHOLD : true

  // Network status detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    
    setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Main data fetching function
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)
      
      logger.info("Fetching enhanced lottery results", { 
        drawName, month, year, forceRefresh, useCache 
      })

      const results = await enhancedApiService.fetchLotteryResults({
        drawName,
        month,
        year,
        forceRefresh,
        useCache
      })

      setDrawResults(results)
      setLastSync(new Date())
      setRetryCount(0)
      
      logger.info(`Loaded ${results.length} enhanced results`)

      // Update cache stats
      const stats = await enhancedApiService.getCacheStats()
      setCacheStats(stats)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch lottery results"
      logger.error("Error fetching enhanced draw data", err)
      
      setError(errorMessage)
      
      // Implement retry logic for network errors
      if (retryCount < MAX_RETRY_COUNT && isOnline) {
        setRetryCount(prev => prev + 1)
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(forceRefresh)
        }, RETRY_DELAY * (retryCount + 1))
      }
    } finally {
      setLoading(false)
    }
  }, [drawName, month, year, useCache, retryCount, isOnline])

  // Refresh data function
  const refreshData = useCallback(async (forceRefresh = false) => {
    await fetchData(forceRefresh)
  }, [fetchData])

  // Sync specific draw
  const syncSpecificDraw = useCallback(async (targetDrawName: string) => {
    try {
      setLoading(true)
      setError(null)

      const results = await enhancedApiService.fetchLotteryResults({
        drawName: targetDrawName,
        forceRefresh: true,
        useCache: false
      })

      // Update results if it matches current filter
      if (!drawName || drawName === targetDrawName) {
        setDrawResults(prev => {
          const filtered = prev.filter(r => r.draw_name !== targetDrawName)
          return [...results, ...filtered].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        })
      }

      setLastSync(new Date())
      logger.info(`Synced ${results.length} results for ${targetDrawName}`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync draw"
      setError(errorMessage)
      logger.error(`Error syncing draw ${targetDrawName}`, err)
    } finally {
      setLoading(false)
    }
  }, [drawName])

  // Sync all draws
  const syncAllDraws = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/enhanced-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' })
      })

      const data = await response.json()
      
      if (data.success) {
        await fetchData(true) // Refresh current data
        logger.info('All draws synced successfully')
      } else {
        throw new Error(data.message || 'Sync failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync all draws"
      setError(errorMessage)
      logger.error('Error syncing all draws', err)
    } finally {
      setLoading(false)
    }
  }, [fetchData])

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const response = await fetch('/api/enhanced-results?confirm=true', {
        method: 'DELETE'
      })

      const data = await response.json()
      
      if (data.success) {
        setDrawResults([])
        setCacheStats(null)
        setLastSync(null)
        logger.info('Cache cleared successfully')
      } else {
        throw new Error(data.message || 'Failed to clear cache')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to clear cache"
      setError(errorMessage)
      logger.error('Error clearing cache', err)
    }
  }, [])

  // Export data
  const exportData = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/enhanced-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' })
      })

      const data = await response.json()
      
      if (data.success) {
        logger.info('Data exported successfully')
        return data.data
      } else {
        throw new Error(data.message || 'Export failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export data"
      setError(errorMessage)
      logger.error('Error exporting data', err)
      throw err
    }
  }, [])

  // Import data
  const importData = useCallback(async (data: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/enhanced-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', options: { data } })
      })

      const result = await response.json()
      
      if (result.success) {
        await fetchData(true) // Refresh to show imported data
        logger.info('Data imported successfully')
      } else {
        throw new Error(result.message || 'Import failed')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to import data"
      setError(errorMessage)
      logger.error('Error importing data', err)
    } finally {
      setLoading(false)
    }
  }, [fetchData])

  // Filter functions
  const getDrawData = useCallback(
    (targetDrawName: string): DrawResult[] => {
      return drawResults.filter((result) => result.draw_name === targetDrawName)
    },
    [drawResults],
  )

  const getRecentResults = useCallback(
    (limit = 10): DrawResult[] => {
      return drawResults
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit)
    },
    [drawResults],
  )

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !isOnline) return

    const setupAutoRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        if (isStale && !loading) {
          logger.info("Auto-refreshing stale data")
          fetchData()
        }
        setupAutoRefresh() // Schedule next refresh
      }, refreshInterval)
    }

    setupAutoRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [autoRefresh, isOnline, isStale, loading, refreshInterval, fetchData])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    drawResults,
    loading,
    error,
    isOnline,
    cacheStats,
    lastSync,
    refreshData,
    syncSpecificDraw,
    syncAllDraws,
    clearCache,
    exportData,
    importData,
    getDrawData,
    getRecentResults,
    isStale,
    retryCount,
  }
}
