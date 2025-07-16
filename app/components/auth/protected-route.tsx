'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../hooks/use-auth'
import { AppIcon } from '../ui/icon-provider'
import { Card, CardContent } from '@/components/ui/card'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  fallback,
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Rediriger vers la page de connexion avec l'URL de retour
        const currentPath = window.location.pathname + window.location.search
        router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`)
        return
      }

      if (requireAdmin && !isAdmin) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, profile, loading, isAdmin, requireAdmin, router, redirectTo])

  // Affichage pendant le chargement
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <AppIcon name="refresh" className="animate-spin" size={32} />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Chargement...</h3>
              <p className="text-muted-foreground">
                Vérification de votre authentification
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérification de l'authentification
  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <AppIcon name="lock" size={32} className="text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Accès restreint</h3>
              <p className="text-muted-foreground">
                Vous devez être connecté pour accéder à cette page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérification des droits admin
  if (requireAdmin && !isAdmin) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <AppIcon name="shield" size={32} className="text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Accès administrateur requis</h3>
              <p className="text-muted-foreground">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Afficher le contenu protégé
  return <>{children}</>
}

// Composant pour les routes admin uniquement
export function AdminRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}

// HOC pour protéger les pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAdmin?: boolean } = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requireAdmin={options.requireAdmin}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// HOC pour les pages admin
export function withAdminAuth<P extends object>(Component: React.ComponentType<P>) {
  return withAuth(Component, { requireAdmin: true })
}

export default ProtectedRoute
