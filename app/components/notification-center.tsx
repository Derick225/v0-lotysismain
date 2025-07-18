'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { 
  useNotifications, 
  useNotificationSettings, 
  useRecentNotifications, 
  useNotificationStats 
} from '../hooks/use-notifications'
import type { NotificationData } from '../lib/notification-manager'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    permission,
    isEnabled,
    hasPermission,
    requestPermission,
    cleanup
  } = useNotifications()

  const [activeTab, setActiveTab] = useState('notifications')

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { color: 'text-green-600', icon: 'CheckCircle', label: 'Autorisées' }
      case 'denied':
        return { color: 'text-red-600', icon: 'XCircle', label: 'Refusées' }
      default:
        return { color: 'text-yellow-600', icon: 'AlertCircle', label: 'En attente' }
    }
  }

  const permissionStatus = getPermissionStatus()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <OptimizedIcon name="Bell" critical size={20} />
              Centre de Notifications
            </CardTitle>
            <div className="flex items-center gap-2">
              <OptimizedIcon 
                name={permissionStatus.icon} 
                critical 
                size={16} 
                className={permissionStatus.color}
              />
              <Badge variant={hasPermission ? "default" : "destructive"}>
                {permissionStatus.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasPermission && (
            <Alert className="mb-4">
              <OptimizedIcon name="Info" critical size={16} />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Activez les notifications pour recevoir des alertes en temps réel.</span>
                  <AccessibleButton
                    onClick={requestPermission}
                    size="sm"
                    ariaLabel="Activer les notifications"
                  >
                    Activer
                  </AccessibleButton>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4">
              <NotificationsList />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <NotificationSettingsView />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <NotificationStatsView />
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <NotificationTestView />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Liste des notifications
function NotificationsList() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRecentNotifications(20)

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <OptimizedIcon name="Bell" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
          <p className="text-muted-foreground">
            Vous recevrez ici vos notifications de résultats, prédictions et tendances.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Notifications récentes ({notifications.length})
        </h3>
        {unreadCount > 0 && (
          <AccessibleButton
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            ariaLabel={`Marquer ${unreadCount} notification(s) comme lues`}
          >
            Tout marquer comme lu ({unreadCount})
          </AccessibleButton>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={() => markAsRead(notification.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Carte de notification individuelle
function NotificationCard({ 
  notification, 
  onMarkAsRead 
}: { 
  notification: NotificationData
  onMarkAsRead: () => void
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'draw_result': return 'Dice1'
      case 'prediction_accuracy': return 'Target'
      case 'trend_alert': return 'TrendingUp'
      case 'smart_suggestion': return 'Lightbulb'
      case 'system_update': return 'Settings'
      default: return 'Bell'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'draw_result': return 'text-blue-600'
      case 'prediction_accuracy': return 'text-green-600'
      case 'trend_alert': return 'text-orange-600'
      case 'smart_suggestion': return 'text-purple-600'
      case 'system_update': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Haute</Badge>
      case 'normal':
        return <Badge variant="secondary">Normale</Badge>
      case 'low':
        return <Badge variant="outline">Basse</Badge>
      default:
        return null
    }
  }

  return (
    <Card className={`${!notification.read ? 'border-primary bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${getTypeColor(notification.type)}`}>
            <OptimizedIcon 
              name={getTypeIcon(notification.type)} 
              category="interface" 
              size={20} 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getPriorityBadge(notification.priority)}
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {notification.body}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {new Date(notification.timestamp).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {notification.tags.length > 0 && (
                  <div className="flex gap-1">
                    {notification.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {!notification.read && (
                <AccessibleButton
                  onClick={onMarkAsRead}
                  variant="ghost"
                  size="sm"
                  ariaLabel="Marquer comme lu"
                >
                  <OptimizedIcon name="Check" critical size={14} />
                </AccessibleButton>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Vue des paramètres de notifications
function NotificationSettingsView() {
  const { 
    settings, 
    toggleCategory, 
    setQuietHours, 
    setMaxPerDay, 
    setMinConfidence 
  } = useNotificationSettings()

  return (
    <div className="space-y-6">
      {/* Catégories de notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Filter" category="interface" size={20} />
            Catégories de Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(settings.categories).map(([category, enabled]) => (
            <div key={category} className="flex items-center justify-between">
              <div>
                <label className="font-medium capitalize">
                  {category.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </label>
                <p className="text-sm text-muted-foreground">
                  {getCategoryDescription(category)}
                </p>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => toggleCategory(category as any)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Heures silencieuses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Moon" category="interface" size={20} />
            Heures Silencieuses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-medium">Activer les heures silencieuses</label>
            <Switch
              checked={settings.timing.quietHours.enabled}
              onCheckedChange={(enabled) => 
                setQuietHours(
                  settings.timing.quietHours.start,
                  settings.timing.quietHours.end,
                  enabled
                )
              }
            />
          </div>
          
          {settings.timing.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Début</label>
                <input
                  type="time"
                  value={settings.timing.quietHours.start}
                  onChange={(e) => 
                    setQuietHours(
                      e.target.value,
                      settings.timing.quietHours.end,
                      true
                    )
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fin</label>
                <input
                  type="time"
                  value={settings.timing.quietHours.end}
                  onChange={(e) => 
                    setQuietHours(
                      settings.timing.quietHours.start,
                      e.target.value,
                      true
                    )
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Sliders" category="interface" size={20} />
            Filtres et Limites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="font-medium mb-3 block">
              Maximum par jour: {settings.filters.maxPerDay}
            </label>
            <Slider
              value={[settings.filters.maxPerDay]}
              onValueChange={([value]) => setMaxPerDay(value)}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          <div>
            <label className="font-medium mb-3 block">
              Confiance minimum: {settings.filters.minConfidence}%
            </label>
            <Slider
              value={[settings.filters.minConfidence]}
              onValueChange={([value]) => setMinConfidence(value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Vue des statistiques
function NotificationStatsView() {
  const stats = useNotificationStats()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.read}</div>
            <div className="text-sm text-muted-foreground">Lues</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.clicked}</div>
            <div className="text-sm text-muted-foreground">Cliquées</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.engagementRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Engagement</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Répartition par Catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.byCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Vue de test des notifications
function NotificationTestView() {
  const { notifySystemUpdate } = useNotifications()

  const sendTestNotification = async (type: string) => {
    switch (type) {
      case 'info':
        await notifySystemUpdate('Test Info', 'Ceci est une notification de test de niveau info.', 'normal')
        break
      case 'warning':
        await notifySystemUpdate('Test Attention', 'Ceci est une notification de test d\'attention.', 'high')
        break
      case 'success':
        await notifySystemUpdate('Test Succès', 'Ceci est une notification de test de succès.', 'low')
        break
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Test des Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Utilisez ces boutons pour tester les différents types de notifications.
          </p>
          
          <div className="grid gap-3 md:grid-cols-3">
            <AccessibleButton
              onClick={() => sendTestNotification('info')}
              variant="outline"
              className="w-full"
            >
              <OptimizedIcon name="Info" critical size={16} className="mr-2" />
              Test Info
            </AccessibleButton>
            
            <AccessibleButton
              onClick={() => sendTestNotification('warning')}
              variant="outline"
              className="w-full"
            >
              <OptimizedIcon name="AlertTriangle" size={16} className="mr-2" />
              Test Attention
            </AccessibleButton>
            
            <AccessibleButton
              onClick={() => sendTestNotification('success')}
              variant="outline"
              className="w-full"
            >
              <OptimizedIcon name="CheckCircle" critical size={16} className="mr-2" />
              Test Succès
            </AccessibleButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Fonction utilitaire pour les descriptions de catégories
function getCategoryDescription(category: string): string {
  switch (category) {
    case 'drawResults':
      return 'Notifications des résultats de tirages'
    case 'predictionAccuracy':
      return 'Notifications de précision des prédictions'
    case 'trendAlerts':
      return 'Alertes de nouvelles tendances détectées'
    case 'systemUpdates':
      return 'Mises à jour et informations système'
    case 'smartSuggestions':
      return 'Suggestions intelligentes basées sur l\'IA'
    default:
      return 'Notifications de cette catégorie'
  }
}
