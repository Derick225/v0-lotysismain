'use client'

import { useAuth } from '../hooks/use-auth'
import { ProtectedRoute } from '../components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AppIcon } from '../components/ui/icon-provider'
import { MetricsGrid, StatusIcon } from '../components/ui/chart-icons'
import { ResponsiveNavBar, BottomNavigation } from '../components/enhanced-navigation'
import { OfflineIndicator, CacheStatusPanel } from '../components/offline-indicator'
import Link from 'next/link'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <OfflineIndicator />
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, profile, preferences } = useAuth()

  // Métriques simulées pour l'utilisateur
  const userMetrics = [
    {
      type: 'target' as const,
      value: (profile?.total_predictions || 0).toString(),
      label: 'Prédictions totales',
      trend: 'up' as const,
      trendValue: '+12'
    },
    {
      type: 'analytics' as const,
      value: (profile?.successful_predictions && profile?.total_predictions) ? 
        `${Math.round((profile.successful_predictions / profile.total_predictions) * 100)}%` : '0%',
      label: 'Taux de réussite',
      trend: 'up' as const,
      trendValue: '+2.3%'
    },
    {
      type: 'line-chart' as const,
      value: '87.5%',
      label: 'Précision IA',
      trend: 'up' as const,
      trendValue: '+1.2%'
    },
    {
      type: 'dashboard' as const,
      value: preferences?.default_lottery_type || 'National',
      label: 'Loterie préférée',
      trend: 'flat' as const,
      trendValue: '0%'
    }
  ]

  const recentActivity = [
    {
      id: 1,
      type: 'prediction',
      title: 'Nouvelle prédiction générée',
      description: 'Prédiction pour le tirage National du 15/12/2024',
      time: 'Il y a 2 heures',
      icon: 'predictions' as const,
      status: 'success'
    },
    {
      id: 2,
      type: 'result',
      title: 'Résultat de tirage disponible',
      description: 'Tirage Etoile du 14/12/2024 - 3/5 numéros corrects',
      time: 'Il y a 1 jour',
      icon: 'results' as const,
      status: 'info'
    },
    {
      id: 3,
      type: 'model',
      title: 'Modèle IA mis à jour',
      description: 'Le modèle d\'ensemble a été retrained avec de nouvelles données',
      time: 'Il y a 2 jours',
      icon: 'brain' as const,
      status: 'success'
    }
  ]

  const quickActions = [
    {
      title: 'Nouvelle prédiction',
      description: 'Générer une prédiction avec l\'IA',
      href: '/predictions',
      icon: 'predictions' as const,
      color: 'bg-blue-500'
    },
    {
      title: 'Voir les résultats',
      description: 'Consulter les derniers résultats',
      href: '/results',
      icon: 'results' as const,
      color: 'bg-green-500'
    },
    {
      title: 'Statistiques',
      description: 'Analyser les tendances',
      href: '/statistics',
      icon: 'statistics' as const,
      color: 'bg-purple-500'
    },
    {
      title: 'Mon profil',
      description: 'Gérer mon compte',
      href: '/profile',
      icon: 'profile' as const,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <ResponsiveNavBar />
      
      <main className="container mx-auto px-4 py-6 pb-20">
        {/* En-tête de bienvenue */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Bonjour, {profile?.full_name || user?.email?.split('@')[0]} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Voici un aperçu de votre activité Lotysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={profile?.status === 'active' ? 'default' : 'secondary'}>
                {profile?.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
              {profile?.role === 'admin' && (
                <Badge variant="destructive">
                  <AppIcon name="admin" size={12} className="mr-1" />
                  Admin
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Métriques utilisateur */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Vos statistiques</h2>
          <MetricsGrid 
            metrics={userMetrics}
            columns={4}
            size="md"
            variant="card"
          />
        </div>

        {/* Actions rapides */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${action.color}`}>
                        <AppIcon name={action.icon} size={24} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activité récente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="info" size={20} />
                Activité récente
              </CardTitle>
              <CardDescription>
                Vos dernières actions sur Lotysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="mt-1">
                    <AppIcon name={activity.icon} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                  <StatusIcon 
                    status={activity.status as any} 
                    showLabel={false} 
                    size="sm" 
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Statut du système */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="server" size={20} />
                Statut du système
              </CardTitle>
              <CardDescription>
                État des services Lotysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusIcon
                status="success"
                label="API Lotysis"
                description="Tous les services fonctionnent normalement"
                size="md"
              />
              <StatusIcon
                status="success"
                label="Modèles IA"
                description="Prédictions disponibles"
                size="md"
              />
              <StatusIcon
                status="info"
                label="Base de données"
                description="Synchronisation en cours"
                size="md"
              />
              <StatusIcon
                status="success"
                label="Notifications"
                description="Service actif"
                size="md"
              />
            </CardContent>
          </Card>
        </div>

        {/* Préférences rapides */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppIcon name="settings" size={20} />
              Préférences
            </CardTitle>
            <CardDescription>
              Configuration rapide de votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AppIcon name="brain" size={16} />
                  <span className="text-sm">Prédictions IA</span>
                </div>
                <Badge variant={preferences?.enable_ai_predictions ? 'default' : 'secondary'}>
                  {preferences?.enable_ai_predictions ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AppIcon name="info" size={16} />
                  <span className="text-sm">Notifications</span>
                </div>
                <Badge variant={profile?.email_notifications ? 'default' : 'secondary'}>
                  {profile?.email_notifications ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AppIcon name="settings" size={16} />
                  <span className="text-sm">Thème</span>
                </div>
                <Badge variant="outline">
                  {preferences?.theme === 'system' ? 'Système' : 
                   preferences?.theme === 'dark' ? 'Sombre' : 'Clair'}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button variant="outline" asChild>
                <Link href="/profile">
                  <AppIcon name="settings" size={16} className="mr-2" />
                  Gérer les préférences
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  )
}
