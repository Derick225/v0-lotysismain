'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { DrawComponentSkeleton, StatsSkeleton, PredictionsSkeleton, LoadingFallback } from './ui/lazy-loader'
import type { DrawResult } from '../lib/constants'

// Types pour les props des composants
interface DrawDataProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

interface DrawStatsProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

interface DrawPredictionsProps {
  drawName: string
  data: DrawResult[]
}

interface CoOccurrenceProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

// Composants dynamiques avec fallbacks optimisés
export const DynamicDrawData = dynamic(
  () => import('./draw-data').then(mod => ({ default: mod.DrawData })),
  {
    loading: () => <DrawComponentSkeleton />,
    ssr: false // Désactiver SSR pour les composants lourds
  }
) as ComponentType<DrawDataProps>

export const DynamicDrawStats = dynamic(
  () => import('./enhanced-draw-stats').then(mod => ({ default: mod.EnhancedDrawStats })),
  {
    loading: () => <StatsSkeleton />,
    ssr: false
  }
) as ComponentType<DrawStatsProps>

// Version legacy pour compatibilité
export const DynamicDrawStatsLegacy = dynamic(
  () => import('./draw-stats').then(mod => ({ default: mod.DrawStats })),
  {
    loading: () => <StatsSkeleton />,
    ssr: false
  }
) as ComponentType<DrawStatsProps>

export const DynamicDrawPredictions = dynamic(
  () => import('./draw-predictions').then(mod => ({ default: mod.DrawPredictions })),
  {
    loading: () => <PredictionsSkeleton />,
    ssr: false
  }
) as ComponentType<DrawPredictionsProps>

export const DynamicCoOccurrenceAnalysis = dynamic(
  () => import('./co-occurrence-analysis').then(mod => ({ default: mod.CoOccurrenceAnalysis })),
  {
    loading: () => <StatsSkeleton />,
    ssr: false
  }
) as ComponentType<CoOccurrenceProps>

// Composants d'administration (chargés uniquement si nécessaire)
export const DynamicAdminPanel = dynamic(
  () => import('./admin-panel').then(mod => ({ default: mod.AdminPanel })),
  {
    loading: () => <LoadingFallback message="Chargement du panneau d'administration..." />,
    ssr: false
  }
)

// Composants de visualisation avancée (chargés à la demande)
export const DynamicInteractiveVisualizations = dynamic(
  () => import('./interactive-visualizations').then(mod => ({ default: mod.InteractiveVisualizations })),
  {
    loading: () => <StatsSkeleton />,
    ssr: false
  }
)

// Composants d'historique (chargés à la demande)
export const DynamicDrawHistory = dynamic(
  () => import('./draw-history').then(mod => ({ default: mod.DrawHistory })),
  {
    loading: () => <LoadingFallback message="Chargement de l'historique..." />,
    ssr: false
  }
)

// Composants de cache et synchronisation
export const DynamicCacheStatusPanel = dynamic(
  () => import('./offline-indicator').then(mod => ({ default: mod.CacheStatusPanel })),
  {
    loading: () => <LoadingFallback message="Chargement du statut cache..." />,
    ssr: false
  }
)

// Composants de TensorFlow (très lourds, chargés uniquement si nécessaire)
export const DynamicTensorFlowLoader = dynamic(
  () => import('./tensorflow-loader').then(mod => ({ default: mod.TensorFlowLoader })),
  {
    loading: () => <LoadingFallback message="Initialisation de l'IA..." />,
    ssr: false
  }
)

// Composants de graphiques avancés (Chart.js, D3.js)
export const DynamicAdvancedCharts = dynamic(
  () => import('./advanced-charts').then(mod => ({ default: mod.AdvancedCharts })),
  {
    loading: () => <StatsSkeleton />,
    ssr: false
  }
)

// Hook pour précharger des modules à la demande
export function usePreloadModules() {
  const preloadModule = async (moduleName: string) => {
    try {
      switch (moduleName) {
        case 'predictions':
          await import('./draw-predictions')
          break
        case 'stats':
          await import('./draw-stats')
          break
        case 'cooccurrence':
          await import('./co-occurrence-analysis')
          break
        case 'admin':
          await import('./admin-panel')
          break
        case 'visualizations':
          await import('./interactive-visualizations')
          break
        case 'history':
          await import('./draw-history')
          break
        case 'tensorflow':
          await import('./tensorflow-loader')
          break
        case 'charts':
          await import('./advanced-charts')
          break
        default:
          console.warn(`Module '${moduleName}' non reconnu pour le préchargement`)
      }
    } catch (error) {
      console.error(`Erreur préchargement module '${moduleName}':`, error)
    }
  }

  const preloadMultiple = async (moduleNames: string[]) => {
    await Promise.all(moduleNames.map(preloadModule))
  }

  return {
    preloadModule,
    preloadMultiple
  }
}

// Configuration des modules par route pour optimiser le chargement
export const MODULE_ROUTES = {
  '/dashboard': ['stats', 'predictions'],
  '/admin': ['admin', 'history'],
  '/analytics': ['visualizations', 'charts', 'cooccurrence'],
  '/predictions': ['predictions', 'tensorflow'],
  '/history': ['history', 'charts']
} as const

// Hook pour précharger automatiquement selon la route
export function useRouteBasedPreloading(currentRoute: string) {
  const { preloadMultiple } = usePreloadModules()

  const preloadForRoute = async (route: string) => {
    const modules = MODULE_ROUTES[route as keyof typeof MODULE_ROUTES]
    if (modules) {
      await preloadMultiple([...modules])
    }
  }

  return { preloadForRoute }
}

// Composant wrapper pour le chargement conditionnel
interface ConditionalModuleProps {
  condition: boolean
  module: 'predictions' | 'stats' | 'cooccurrence' | 'admin' | 'visualizations' | 'history'
  fallback?: React.ReactNode
  children?: React.ReactNode
}

export function ConditionalModule({ 
  condition, 
  module, 
  fallback,
  children 
}: ConditionalModuleProps) {
  if (!condition) {
    return <>{fallback || null}</>
  }

  switch (module) {
    case 'predictions':
      return <>{children}</>
    case 'stats':
      return <>{children}</>
    case 'cooccurrence':
      return <>{children}</>
    case 'admin':
      return <>{children}</>
    case 'visualizations':
      return <>{children}</>
    case 'history':
      return <>{children}</>
    default:
      return <>{fallback || null}</>
  }
}

// Utilitaire pour mesurer les performances de chargement
export function measureModuleLoadTime(moduleName: string) {
  const startTime = performance.now()
  
  return {
    end: () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      console.log(`Module '${moduleName}' chargé en ${loadTime.toFixed(2)}ms`)
      return loadTime
    }
  }
}

// Configuration des priorités de chargement
export const LOADING_PRIORITIES = {
  critical: ['draw-data', 'navigation'],
  high: ['draw-stats', 'user-interface'],
  medium: ['draw-predictions', 'co-occurrence'],
  low: ['admin-panel', 'advanced-charts', 'tensorflow']
} as const

// Hook pour gérer les priorités de chargement
export function useLoadingPriorities() {
  const loadByPriority = async (priority: keyof typeof LOADING_PRIORITIES) => {
    const modules = LOADING_PRIORITIES[priority]
    const { preloadMultiple } = usePreloadModules()
    
    try {
      await preloadMultiple(modules)
      console.log(`Modules de priorité '${priority}' chargés`)
    } catch (error) {
      console.error(`Erreur chargement priorité '${priority}':`, error)
    }
  }

  const loadAllByPriority = async () => {
    // Charger par ordre de priorité
    await loadByPriority('critical')
    await loadByPriority('high')
    
    // Charger les priorités moyennes et basses en arrière-plan
    setTimeout(() => loadByPriority('medium'), 1000)
    setTimeout(() => loadByPriority('low'), 3000)
  }

  return {
    loadByPriority,
    loadAllByPriority
  }
}
