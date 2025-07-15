'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { useNotificationStatus, useRecentNotifications } from '../hooks/use-notifications'
import type { NotificationData } from '../lib/notification-manager'

interface NotificationIndicatorProps {
  variant?: 'icon' | 'badge' | 'full'
  maxNotifications?: number
  className?: string
}

export function NotificationIndicator({ 
  variant = 'icon', 
  maxNotifications = 5,
  className = '' 
}: NotificationIndicatorProps) {
  const { isEnabled, unreadCount, permission } = useNotificationStatus()
  const { notifications, markAsRead, markAllAsRead } = useRecentNotifications(maxNotifications)
  const [isOpen, setIsOpen] = useState(false)

  // Déterminer l'état de l'indicateur
  const getIndicatorState = () => {
    if (permission === 'denied') return {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: 'BellOff',
      pulse: false
    }
    
    if (!isEnabled) return {
      color: 'text-gray-500',
      bgColor: 'bg-gray-500',
      icon: 'Bell',
      pulse: false
    }
    
    if (unreadCount > 0) return {
      color: 'text-blue-600',
      bgColor: 'bg-blue-600',
      icon: 'Bell',
      pulse: true
    }
    
    return {
      color: 'text-gray-600',
      bgColor: 'bg-gray-600',
      icon: 'Bell',
      pulse: false
    }
  }

  const state = getIndicatorState()

  // Version icône simple
  if (variant === 'icon') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative h-9 w-9 p-0 ${className}`}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
          >
            <OptimizedIcon 
              name={state.icon} 
              critical 
              size={20} 
              className={`${state.color} ${state.pulse ? 'animate-pulse' : ''}`}
            />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="end">
          <NotificationPopover 
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onClose={() => setIsOpen(false)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  // Version badge
  if (variant === 'badge') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <OptimizedIcon 
          name={state.icon} 
          critical 
          size={16} 
          className={state.color}
        />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount}
          </Badge>
        )}
      </div>
    )
  }

  // Version complète
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`flex items-center gap-2 ${className}`}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
        >
          <OptimizedIcon 
            name={state.icon} 
            critical 
            size={16} 
            className={`${state.color} ${state.pulse ? 'animate-pulse' : ''}`}
          />
          <span className="hidden sm:inline">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <NotificationPopover 
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

// Contenu du popover de notifications
function NotificationPopover({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose
}: {
  notifications: NotificationData[]
  unreadCount: number
  onMarkAsRead: (id: string) => Promise<boolean>
  onMarkAllAsRead: () => Promise<void>
  onClose: () => void
}) {
  const handleMarkAsRead = async (id: string) => {
    await onMarkAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await onMarkAllAsRead()
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center">
        <OptimizedIcon name="Bell" critical size={32} className="mx-auto mb-2 text-muted-foreground" />
        <h3 className="font-medium mb-1">Aucune notification</h3>
        <p className="text-sm text-muted-foreground">
          Vous êtes à jour !
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Notifications</h3>
        {unreadCount > 0 && (
          <AccessibleButton
            onClick={handleMarkAllAsRead}
            variant="ghost"
            size="sm"
            ariaLabel={`Marquer ${unreadCount} notification(s) comme lues`}
          >
            Tout marquer comme lu
          </AccessibleButton>
        )}
      </div>

      {/* Liste des notifications */}
      <ScrollArea className="h-80">
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead(notification.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Pied de page */}
      <div className="border-t pt-3 flex justify-between">
        <AccessibleButton
          onClick={onClose}
          variant="outline"
          size="sm"
        >
          Fermer
        </AccessibleButton>
        <AccessibleButton
          onClick={() => {
            onClose()
            // Naviguer vers le centre de notifications complet
            window.location.href = '/notifications'
          }}
          variant="outline"
          size="sm"
        >
          Voir tout
        </AccessibleButton>
      </div>
    </div>
  )
}

// Élément de notification individuel
function NotificationItem({ 
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

  const formatTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins}min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    
    return time.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
        !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-background'
      }`}
      onClick={onMarkAsRead}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${getTypeColor(notification.type)}`}>
          <OptimizedIcon 
            name={getTypeIcon(notification.type)} 
            category="interface" 
            size={16} 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h4 className="font-medium text-sm truncate pr-2">
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
            {notification.body}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatTime(notification.timestamp)}
            </span>
            
            {notification.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                Urgent
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook pour l'indicateur de notifications dans la navigation
export function useNotificationIndicator() {
  const { isEnabled, unreadCount, permission } = useNotificationStatus()
  
  const shouldShowBadge = unreadCount > 0
  const shouldPulse = unreadCount > 0 && isEnabled
  const isDisabled = permission === 'denied' || !isEnabled
  
  return {
    shouldShowBadge,
    shouldPulse,
    isDisabled,
    unreadCount,
    badgeText: unreadCount > 99 ? '99+' : unreadCount.toString(),
    status: permission
  }
}

// Composant pour la barre de navigation
export function NavNotificationIndicator() {
  const { shouldShowBadge, shouldPulse, unreadCount } = useNotificationIndicator()
  
  return (
    <div className="relative">
      <NotificationIndicator variant="icon" />
      
      {shouldShowBadge && (
        <div className={`absolute -top-1 -right-1 ${shouldPulse ? 'animate-pulse' : ''}`}>
          {/* Le badge est déjà géré dans NotificationIndicator */}
        </div>
      )}
    </div>
  )
}

// Composant de notification toast (pour les notifications en temps réel)
export function NotificationToast({ 
  notification, 
  onDismiss 
}: { 
  notification: NotificationData
  onDismiss: () => void
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
      case 'draw_result': return 'border-blue-500 bg-blue-50'
      case 'prediction_accuracy': return 'border-green-500 bg-green-50'
      case 'trend_alert': return 'border-orange-500 bg-orange-50'
      case 'smart_suggestion': return 'border-purple-500 bg-purple-50'
      case 'system_update': return 'border-gray-500 bg-gray-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${getTypeColor(notification.type)}`}>
      <div className="flex items-start gap-3">
        <OptimizedIcon 
          name={getTypeIcon(notification.type)} 
          category="interface" 
          size={20} 
          className="flex-shrink-0 mt-0.5"
        />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{notification.title}</h4>
          <p className="text-sm text-muted-foreground">{notification.body}</p>
        </div>
        
        <AccessibleButton
          onClick={onDismiss}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-6 w-6 p-0"
          ariaLabel="Fermer la notification"
        >
          <OptimizedIcon name="X" critical size={14} />
        </AccessibleButton>
      </div>
    </div>
  )
}
