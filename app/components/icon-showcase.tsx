"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AppIcon, Icon } from './ui/icon-provider'
import { IconButton, QuickIconButton } from './ui/icon-button'
import { ChartIcon, MetricIcon, MetricsGrid, StatusIcon } from './ui/chart-icons'

export const IconShowcase: React.FC = () => {
  // Exemples de métriques
  const sampleMetrics = [
    {
      type: 'line-chart' as const,
      value: '87.5%',
      label: 'Précision IA',
      trend: 'up' as const,
      trendValue: '+2.3%'
    },
    {
      type: 'bar-chart' as const,
      value: '1,234',
      label: 'Prédictions',
      trend: 'up' as const,
      trendValue: '+156'
    },
    {
      type: 'target' as const,
      value: '42',
      label: 'Numéros gagnants',
      trend: 'flat' as const,
      trendValue: '0%'
    },
    {
      type: 'analytics' as const,
      value: '99.2%',
      label: 'Disponibilité',
      trend: 'up' as const,
      trendValue: '+0.1%'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Système d'Icônes Lotysis</h1>
        <p className="text-muted-foreground">
          Démonstration du système d'icônes responsive et adaptatif
        </p>
      </div>

      <Tabs defaultValue="app-icons" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="app-icons">Icônes App</TabsTrigger>
          <TabsTrigger value="icon-buttons">Boutons</TabsTrigger>
          <TabsTrigger value="chart-icons">Graphiques</TabsTrigger>
          <TabsTrigger value="metrics">Métriques</TabsTrigger>
          <TabsTrigger value="status">Statuts</TabsTrigger>
        </TabsList>

        {/* Icônes de l'application */}
        <TabsContent value="app-icons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="home" size={24} />
                Icônes de l'Application
              </CardTitle>
              <CardDescription>
                Icônes principales utilisées dans l'interface Lotysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { name: 'home', label: 'Accueil' },
                  { name: 'results', label: 'Résultats' },
                  { name: 'statistics', label: 'Statistiques' },
                  { name: 'predictions', label: 'Prédictions' },
                  { name: 'profile', label: 'Profil' },
                  { name: 'admin', label: 'Admin' },
                  { name: 'settings', label: 'Paramètres' },
                  { name: 'help', label: 'Aide' },
                  { name: 'brain', label: 'IA' },
                  { name: 'ticket', label: 'Ticket' },
                  { name: 'jackpot', label: 'Jackpot' },
                  { name: 'calendar', label: 'Calendrier' }
                ].map(({ name, label }) => (
                  <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <AppIcon name={name as any} size={32} />
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Boutons d'icônes */}
        <TabsContent value="icon-buttons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AppIcon name="settings" size={24} />
                Boutons d'Icônes
              </CardTitle>
              <CardDescription>
                Boutons interactifs avec icônes et badges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tailles */}
              <div>
                <h3 className="font-semibold mb-3">Tailles</h3>
                <div className="flex items-center gap-4">
                  <IconButton appIcon={{ name: 'add' }} size="xs" />
                  <IconButton appIcon={{ name: 'add' }} size="sm" />
                  <IconButton appIcon={{ name: 'add' }} size="md" />
                  <IconButton appIcon={{ name: 'add' }} size="lg" />
                  <IconButton appIcon={{ name: 'add' }} size="xl" />
                </div>
              </div>

              {/* Variantes */}
              <div>
                <h3 className="font-semibold mb-3">Variantes</h3>
                <div className="flex items-center gap-4">
                  <IconButton appIcon={{ name: 'save' }} variant="default" />
                  <IconButton appIcon={{ name: 'edit' }} variant="outline" />
                  <IconButton appIcon={{ name: 'delete' }} variant="destructive" />
                  <IconButton appIcon={{ name: 'settings' }} variant="ghost" />
                  <IconButton appIcon={{ name: 'help' }} variant="secondary" />
                </div>
              </div>

              {/* Avec badges */}
              <div>
                <h3 className="font-semibold mb-3">Avec Badges</h3>
                <div className="flex items-center gap-4">
                  <IconButton appIcon={{ name: 'info' }} badge="3" badgeColor="red" />
                  <IconButton appIcon={{ name: 'mail' }} badge="12" badgeColor="blue" />
                  <IconButton appIcon={{ name: 'success' }} badge="!" badgeColor="green" />
                  <IconButton appIcon={{ name: 'warning' }} badge="99+" badgeColor="yellow" />
                </div>
              </div>

              {/* Actions rapides */}
              <div>
                <h3 className="font-semibold mb-3">Actions Rapides</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <QuickIconButton action="add" />
                  <QuickIconButton action="edit" />
                  <QuickIconButton action="delete" />
                  <QuickIconButton action="save" />
                  <QuickIconButton action="cancel" />
                  <QuickIconButton action="search" />
                  <QuickIconButton action="filter" />
                  <QuickIconButton action="refresh" />
                  <QuickIconButton action="download" />
                  <QuickIconButton action="upload" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Icônes de graphiques */}
        <TabsContent value="chart-icons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartIcon type="analytics" size={24} />
                Icônes de Graphiques
              </CardTitle>
              <CardDescription>
                Icônes spécialisées pour les graphiques et analyses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { type: 'line-chart', label: 'Ligne' },
                  { type: 'bar-chart', label: 'Barres' },
                  { type: 'pie-chart', label: 'Secteurs' },
                  { type: 'area-chart', label: 'Aires' },
                  { type: 'scatter-chart', label: 'Nuage' },
                  { type: 'histogram', label: 'Histogramme' },
                  { type: 'trend-up', label: 'Hausse' },
                  { type: 'trend-down', label: 'Baisse' },
                  { type: 'trend-flat', label: 'Stable' },
                  { type: 'analytics', label: 'Analytics' },
                  { type: 'dashboard', label: 'Dashboard' },
                  { type: 'insights', label: 'Insights' }
                ].map(({ type, label }) => (
                  <div key={type} className="flex flex-col items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <ChartIcon type={type as any} size={32} animated />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métriques */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartIcon type="dashboard" size={24} />
                Métriques avec Icônes
              </CardTitle>
              <CardDescription>
                Affichage de métriques avec icônes et tendances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MetricsGrid 
                metrics={sampleMetrics}
                columns={2}
                size="md"
                variant="card"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variantes de Métriques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Format Minimal</h3>
                <div className="flex gap-4">
                  <MetricIcon
                    type="line-chart"
                    value="87.5%"
                    label="Précision"
                    variant="minimal"
                  />
                  <MetricIcon
                    type="bar-chart"
                    value="1,234"
                    label="Prédictions"
                    variant="minimal"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Format Standard</h3>
                <MetricIcon
                  type="analytics"
                  value="99.2%"
                  label="Disponibilité du système"
                  trend="up"
                  trendValue="+0.1%"
                  variant="default"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indicateurs de statut */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartIcon type="insights" size={24} />
                Indicateurs de Statut
              </CardTitle>
              <CardDescription>
                Indicateurs visuels pour les différents états du système
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <StatusIcon
                  status="success"
                  label="Système opérationnel"
                  description="Tous les services fonctionnent normalement"
                />
                <StatusIcon
                  status="warning"
                  label="Maintenance programmée"
                  description="Maintenance prévue dans 2 heures"
                />
                <StatusIcon
                  status="error"
                  label="Erreur de connexion"
                  description="Impossible de se connecter à la base de données"
                />
                <StatusIcon
                  status="info"
                  label="Nouvelle version disponible"
                  description="Version 2.1.0 disponible au téléchargement"
                />
                <StatusIcon
                  status="loading"
                  label="Synchronisation en cours"
                  description="Mise à jour des données..."
                />
              </div>

              <div>
                <h3 className="font-semibold mb-3">Tailles</h3>
                <div className="space-y-2">
                  <StatusIcon status="success" label="Petit" size="sm" />
                  <StatusIcon status="warning" label="Moyen" size="md" />
                  <StatusIcon status="error" label="Grand" size="lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default IconShowcase
