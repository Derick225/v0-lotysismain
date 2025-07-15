'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number | null // First Contentful Paint
  lcp: number | null // Largest Contentful Paint
  fid: number | null // First Input Delay
  cls: number | null // Cumulative Layout Shift
  ttfb: number | null // Time to First Byte
  
  // Custom metrics
  componentLoadTime: number | null
  bundleSize: number | null
  memoryUsage: number | null
  
  // Network
  connectionType: string | null
  effectiveType: string | null
  
  // Timestamps
  domContentLoaded: number | null
  loadComplete: number | null
  
  // Scores
  performanceScore: number | null
}

interface ComponentPerformance {
  name: string
  mountTime: number
  renderTime: number
  updateCount: number
  lastUpdate: number
}

export function usePerformanceMonitor(componentName?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    componentLoadTime: null,
    bundleSize: null,
    memoryUsage: null,
    connectionType: null,
    effectiveType: null,
    domContentLoaded: null,
    loadComplete: null,
    performanceScore: null
  })

  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([])
  const mountTimeRef = useRef<number>(Date.now())
  const renderCountRef = useRef<number>(0)

  // Mesurer les Core Web Vitals
  const measureWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return

    // Observer pour LCP
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }))
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          })
          setMetrics(prev => ({ ...prev, cls: clsValue }))
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // Navigation Timing
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            setMetrics(prev => ({
              ...prev,
              ttfb: entry.responseStart - entry.requestStart,
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart
            }))
          })
        })
        navigationObserver.observe({ entryTypes: ['navigation'] })

        // Paint Timing
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
            }
          })
        })
        paintObserver.observe({ entryTypes: ['paint'] })

      } catch (error) {
        console.warn('Erreur initialisation PerformanceObserver:', error)
      }
    }

    // Mesures alternatives pour les navigateurs non compatibles
    if ('performance' in window && 'timing' in window.performance) {
      const timing = window.performance.timing
      const navigation = window.performance.navigation

      setMetrics(prev => ({
        ...prev,
        ttfb: timing.responseStart - timing.requestStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        loadComplete: timing.loadEventEnd - timing.loadEventStart
      }))
    }
  }, [])

  // Mesurer l'utilisation mémoire
  const measureMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined') return

    // @ts-ignore - API expérimentale
    if ('memory' in performance) {
      // @ts-ignore
      const memory = performance.memory
      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      }))
    }
  }, [])

  // Mesurer la connexion réseau
  const measureNetworkInfo = useCallback(() => {
    if (typeof window === 'undefined') return

    // @ts-ignore - API expérimentale
    if ('connection' in navigator) {
      // @ts-ignore
      const connection = navigator.connection
      setMetrics(prev => ({
        ...prev,
        connectionType: connection.type || null,
        effectiveType: connection.effectiveType || null
      }))
    }
  }, [])

  // Calculer le score de performance
  const calculatePerformanceScore = useCallback((metrics: PerformanceMetrics) => {
    let score = 100

    // Pénalités basées sur les Core Web Vitals
    if (metrics.fcp && metrics.fcp > 1800) score -= 20
    else if (metrics.fcp && metrics.fcp > 1000) score -= 10

    if (metrics.lcp && metrics.lcp > 2500) score -= 25
    else if (metrics.lcp && metrics.lcp > 1500) score -= 15

    if (metrics.fid && metrics.fid > 100) score -= 20
    else if (metrics.fid && metrics.fid > 50) score -= 10

    if (metrics.cls && metrics.cls > 0.25) score -= 25
    else if (metrics.cls && metrics.cls > 0.1) score -= 15

    if (metrics.ttfb && metrics.ttfb > 800) score -= 15
    else if (metrics.ttfb && metrics.ttfb > 400) score -= 10

    return Math.max(0, score)
  }, [])

  // Mesurer les performances d'un composant
  const measureComponentPerformance = useCallback((name: string) => {
    const startTime = performance.now()
    renderCountRef.current++

    return {
      end: () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        const mountTime = endTime - mountTimeRef.current

        setComponentMetrics(prev => {
          const existing = prev.find(c => c.name === name)
          if (existing) {
            return prev.map(c => 
              c.name === name 
                ? { 
                    ...c, 
                    renderTime, 
                    updateCount: c.updateCount + 1,
                    lastUpdate: Date.now()
                  }
                : c
            )
          } else {
            return [...prev, {
              name,
              mountTime,
              renderTime,
              updateCount: 1,
              lastUpdate: Date.now()
            }]
          }
        })

        return { mountTime, renderTime }
      }
    }
  }, [])

  // Obtenir les métriques de bundle
  const getBundleMetrics = useCallback(() => {
    if (typeof window === 'undefined') return

    // Estimer la taille du bundle via les ressources chargées
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const jsResources = resources.filter(r => r.name.includes('.js'))
      const totalSize = jsResources.reduce((sum, resource) => {
        return sum + (resource.transferSize || 0)
      }, 0)

      setMetrics(prev => ({
        ...prev,
        bundleSize: totalSize / 1024 // KB
      }))
    }
  }, [])

  // Initialisation
  useEffect(() => {
    measureWebVitals()
    measureMemoryUsage()
    measureNetworkInfo()
    getBundleMetrics()

    // Mesures périodiques
    const interval = setInterval(() => {
      measureMemoryUsage()
      measureNetworkInfo()
    }, 30000) // Toutes les 30 secondes

    return () => clearInterval(interval)
  }, [measureWebVitals, measureMemoryUsage, measureNetworkInfo, getBundleMetrics])

  // Calculer le score quand les métriques changent
  useEffect(() => {
    const score = calculatePerformanceScore(metrics)
    setMetrics(prev => ({ ...prev, performanceScore: score }))
  }, [metrics.fcp, metrics.lcp, metrics.fid, metrics.cls, metrics.ttfb, calculatePerformanceScore])

  // Mesurer les performances du composant actuel
  useEffect(() => {
    if (componentName) {
      const measurement = measureComponentPerformance(componentName)
      return () => {
        measurement.end()
      }
    }
  }, [componentName, measureComponentPerformance])

  // Fonctions utilitaires
  const getPerformanceGrade = useCallback((score: number | null) => {
    if (!score) return 'N/A'
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }, [])

  const getMetricStatus = useCallback((metric: keyof PerformanceMetrics, value: number | null) => {
    if (!value) return 'unknown'

    switch (metric) {
      case 'fcp':
        return value <= 1000 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
      case 'lcp':
        return value <= 1500 ? 'good' : value <= 2500 ? 'needs-improvement' : 'poor'
      case 'fid':
        return value <= 50 ? 'good' : value <= 100 ? 'needs-improvement' : 'poor'
      case 'cls':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
      case 'ttfb':
        return value <= 400 ? 'good' : value <= 800 ? 'needs-improvement' : 'poor'
      default:
        return 'unknown'
    }
  }, [])

  const exportMetrics = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics,
      componentMetrics,
      renderCount: renderCountRef.current
    }
  }, [metrics, componentMetrics])

  return {
    metrics,
    componentMetrics,
    measureComponentPerformance,
    getPerformanceGrade,
    getMetricStatus,
    exportMetrics,
    renderCount: renderCountRef.current
  }
}

// Hook simplifié pour les composants
export function useComponentPerformance(componentName: string) {
  const { measureComponentPerformance } = usePerformanceMonitor()
  
  useEffect(() => {
    const measurement = measureComponentPerformance(componentName)
    return () => {
      measurement.end()
    }
  }, [componentName, measureComponentPerformance])
}

// Hook pour les métriques en temps réel
export function useRealTimeMetrics() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const { metrics, getPerformanceGrade, getMetricStatus } = usePerformanceMonitor()

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getPerformanceGrade,
    getMetricStatus,
    score: metrics.performanceScore,
    grade: getPerformanceGrade(metrics.performanceScore)
  }
}
