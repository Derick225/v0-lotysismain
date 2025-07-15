'use client'

import { Suspense, lazy, ComponentType, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AppIcon } from './icon-provider'

interface LazyLoaderProps {
  children: ReactNode
  fallback?: ReactNode
  error?: ReactNode
  className?: string
}

interface SkeletonProps {
  className?: string
  variant?: 'card' | 'text' | 'circle' | 'rectangle'
  lines?: number
}

// Composant Skeleton pour les états de chargement
export function Skeleton({ className = '', variant = 'rectangle', lines = 1 }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted'
  
  const variantClasses = {
    card: 'rounded-lg h-32',
    text: 'rounded h-4',
    circle: 'rounded-full w-12 h-12',
    rectangle: 'rounded h-6'
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses.text} ${
              i === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  )
}

// Skeleton pour les composants de tirage
export function DrawComponentSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" className="w-8 h-8" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="circle" className="w-14 h-14" />
          ))}
        </div>
        <Skeleton variant="text" lines={2} />
      </CardContent>
    </Card>
  )
}

// Skeleton pour les statistiques
export function StatsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  )
}

// Skeleton pour les prédictions
export function PredictionsSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} variant="circle" className="w-12 h-12" />
              ))}
            </div>
            <Skeleton variant="text" lines={2} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Composant de fallback avec spinner
export function LoadingFallback({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <AppIcon name="refresh" className="animate-spin" size={20} />
        <span className="text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}

// Composant d'erreur
export function ErrorFallback({ 
  error, 
  retry, 
  message = 'Une erreur est survenue' 
}: { 
  error?: Error
  retry?: () => void
  message?: string 
}) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <AppIcon name="alert" className="mx-auto mb-4 text-red-500" size={32} />
        <h3 className="font-medium text-red-700 mb-2">{message}</h3>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error.message}</p>
        )}
        {retry && (
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <AppIcon name="refresh" size={16} />
            Réessayer
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// HOC pour le lazy loading avec gestion d'erreur
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode,
  errorFallback?: ReactNode
) {
  return function LazyComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <Component {...props} />
      </Suspense>
    )
  }
}

// Composant principal LazyLoader
export function LazyLoader({ 
  children, 
  fallback, 
  error, 
  className = '' 
}: LazyLoaderProps) {
  return (
    <div className={className}>
      <Suspense fallback={fallback || <LoadingFallback />}>
        {children}
      </Suspense>
    </div>
  )
}

// Hook pour le lazy loading conditionnel
export function useLazyLoad(condition: boolean, loader: () => Promise<any>) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (condition && !isLoaded && !isLoading) {
      setIsLoading(true)
      setError(null)
      
      loader()
        .then(() => {
          setIsLoaded(true)
        })
        .catch((err) => {
          setError(err instanceof Error ? err : new Error('Erreur de chargement'))
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [condition, isLoaded, isLoading, loader])

  return { isLoaded, isLoading, error }
}

// Utilitaire pour créer des composants lazy
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFn)
  
  return function WrappedLazyComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}
