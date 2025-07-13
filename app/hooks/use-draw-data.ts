"use client"

import { useState, useEffect, useCallback } from "react"
import type { DrawResult } from "../lib/constants"
import { LotteryResultService } from "@/lib/supabase"
import { enhancedApiService } from "../lib/enhanced-api-service"
import logger from "../lib/logger"

interface UseDrawDataReturn {
  drawResults: DrawResult[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
  getDrawData: (drawName: string) => DrawResult[]
  getRecentResults: (limit?: number) => DrawResult[]
  isStale: boolean
  isOnline: boolean
  cacheStats: any
  lastSync: Date | null
}

export function useDrawData(): UseDrawDataReturn {
  const [drawResults, setDrawResults] = useState<DrawResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  const [isOnline, setIsOnline] = useState(true)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Consider data stale after 5 minutes
  const STALE_TIME = 5 * 60 * 1000
  const isStale = Date.now() - lastFetch > STALE_TIME

  // Détecter le statut de connexion
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.info("Fetching lottery results with enhanced service", undefined, "useDrawData")

      // Utiliser le service API amélioré avec cache intelligent
      const results = await enhancedApiService.fetchLotteryResults({
        useCache: true,
        forceRefresh: false
      })

      if (results.length > 0) {
        logger.info(`Loaded ${results.length} results from enhanced service`, undefined, "useDrawData")
        setDrawResults(results)
        setLastFetch(Date.now())
        setLastSync(new Date())

        // Mettre à jour les statistiques du cache
        const stats = await enhancedApiService.getCacheStats()
        setCacheStats(stats)
        return
      }

      // Fallback vers l'ancienne API si le service amélioré échoue
      const response = await fetch("/api/lottery-results?limit=500")
      const apiData = await response.json()

      if (apiData.success && apiData.data.length > 0) {
        logger.info(`Loaded ${apiData.data.length} results from fallback API`, undefined, "useDrawData")
        setDrawResults(apiData.data)
        setLastFetch(Date.now())
        return
      }

      // Dernier recours : Supabase service
      const supabaseResults = await LotteryResultService.getAll(500)
      if (supabaseResults.length > 0) {
        logger.info(`Loaded ${supabaseResults.length} results from Supabase`, undefined, "useDrawData")
        setDrawResults(supabaseResults)
        setLastFetch(Date.now())
        return
      }

      // If no data from either source, try external API
      const externalResponse = await fetch("/api/external-results")
      const externalData = await externalResponse.json()

      if (externalData.success && externalData.data.length > 0) {
        logger.info(`Loaded ${externalData.data.length} results from external API`, undefined, "useDrawData")
        // Transform external data to match our format
        const transformedData = externalData.data.map((item: any) => ({
          id: Date.now() + Math.random(),
          draw_name: item.draw_name,
          date: item.date,
          gagnants: item.gagnants,
          machine: item.machine,
          created_at: new Date().toISOString(),
        }))
        setDrawResults(transformedData)
        setLastFetch(Date.now())
        return
      }

      // If all sources fail, use mock data
      logger.warn("No data from any source, using mock data", undefined, "useDrawData")
      setDrawResults(generateMockData())
      setLastFetch(Date.now())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch lottery results"
      logger.error("Error fetching draw data", err, "useDrawData")
      setError(errorMessage)

      // Use mock data as fallback
      setDrawResults(generateMockData())
      setLastFetch(Date.now())
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  const getDrawData = useCallback(
    (drawName: string): DrawResult[] => {
      return drawResults.filter((result) => result.draw_name === drawName)
    },
    [drawResults],
  )

  const getRecentResults = useCallback(
    (limit = 10): DrawResult[] => {
      return drawResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit)
    },
    [drawResults],
  )

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 10 minutes if data is stale
  useEffect(() => {
    if (!isStale) return

    const interval = setInterval(() => {
      if (isStale && !loading) {
        logger.info("Auto-refreshing stale data", undefined, "useDrawData")
        fetchData()
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [isStale, loading, fetchData])

  return {
    drawResults,
    loading,
    error,
    refreshData,
    getDrawData,
    getRecentResults,
    isStale,
    isOnline,
    cacheStats,
    lastSync,
  }
}

// Generate mock data for development/fallback
function generateMockData(): DrawResult[] {
  const drawNames = [
    "National",
    "Etoile",
    "Fortune",
    "Reveil",
    "Akwaba",
    "La Matinale",
    "Emergence",
    "Sika",
    "Premiere Heure",
    "Baraka",
  ]

  const mockData: DrawResult[] = []
  const today = new Date()

  for (let i = 0; i < 50; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    const drawName = drawNames[Math.floor(Math.random() * drawNames.length)]
    const gagnants = generateUniqueNumbers(5, 1, 90)
    const machine = Math.random() > 0.3 ? generateUniqueNumbers(5, 1, 90) : undefined

    mockData.push({
      id: 1000 + i,
      draw_name: drawName,
      date: date.toISOString().split("T")[0],
      gagnants,
      machine,
      created_at: date.toISOString(),
    })
  }

  return mockData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function generateUniqueNumbers(count: number, min: number, max: number): number[] {
  const numbers = new Set<number>()
  while (numbers.size < count) {
    numbers.add(Math.floor(Math.random() * (max - min + 1)) + min)
  }
  return Array.from(numbers).sort((a, b) => a - b)
}
