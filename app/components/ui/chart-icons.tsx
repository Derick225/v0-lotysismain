"use client"

import React from 'react'
import { AppIcon, AppIconProps } from './icon-provider'
import { cn } from '@/lib/utils'

// Types d'icônes pour les graphiques et statistiques
export type ChartIconType = 
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'area-chart'
  | 'scatter-chart'
  | 'histogram'
  | 'trend-up'
  | 'trend-down'
  | 'trend-flat'
  | 'percentage'
  | 'calculator'
  | 'target'
  | 'bullseye'
  | 'analytics'
  | 'dashboard'
  | 'report'
  | 'data'
  | 'insights'

// Configuration des icônes de graphiques
const chartIconsConfig: Record<ChartIconType, { name: keyof typeof import('./icon-provider').AppIcons; color?: string }> = {
  'line-chart': { name: 'prediction', color: 'text-blue-500' },
  'bar-chart': { name: 'statistics', color: 'text-green-500' },
  'pie-chart': { name: 'statistics', color: 'text-purple-500' },
  'area-chart': { name: 'prediction', color: 'text-indigo-500' },
  'scatter-chart': { name: 'statistics', color: 'text-pink-500' },
  'histogram': { name: 'statistics', color: 'text-orange-500' },
  'trend-up': { name: 'success', color: 'text-green-500' },
  'trend-down': { name: 'error', color: 'text-red-500' },
  'trend-flat': { name: 'info', color: 'text-gray-500' },
  'percentage': { name: 'numbers', color: 'text-blue-500' },
  'calculator': { name: 'numbers', color: 'text-gray-600' },
  'target': { name: 'jackpot', color: 'text-yellow-500' },
  'bullseye': { name: 'jackpot', color: 'text-red-500' },
  'analytics': { name: 'brain', color: 'text-purple-500' },
  'dashboard': { name: 'statistics', color: 'text-blue-600' },
  'report': { name: 'results', color: 'text-gray-600' },
  'data': { name: 'database', color: 'text-blue-500' },
  'insights': { name: 'brain', color: 'text-indigo-500' },
}

// Propriétés du composant ChartIcon
export interface ChartIconProps extends Omit<AppIconProps, 'name'> {
  type: ChartIconType
  animated?: boolean
  pulse?: boolean
  glow?: boolean
}

export const ChartIcon: React.FC<ChartIconProps> = ({
  type,
  animated = false,
  pulse = false,
  glow = false,
  className,
  ...props
}) => {
  const config = chartIconsConfig[type]
  
  return (
    <AppIcon
      name={config.name}
      className={cn(
        config.color,
        animated && 'transition-transform duration-300 hover:scale-110',
        pulse && 'animate-pulse',
        glow && 'drop-shadow-lg',
        className
      )}
      {...props}
    />
  )
}

// Composant pour afficher des métriques avec icônes
export interface MetricIconProps {
  type: ChartIconType
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card' | 'minimal'
  className?: string
}

export const MetricIcon: React.FC<MetricIconProps> = ({
  type,
  value,
  label,
  trend,
  trendValue,
  size = 'md',
  variant = 'default',
  className
}) => {
  const sizeConfig = {
    sm: { icon: 16, text: 'text-sm', value: 'text-lg' },
    md: { icon: 20, text: 'text-base', value: 'text-xl' },
    lg: { icon: 24, text: 'text-lg', value: 'text-2xl' }
  }[size]

  const trendIcon = trend ? {
    up: 'trend-up',
    down: 'trend-down',
    flat: 'trend-flat'
  }[trend] as ChartIconType : undefined

  const content = (
    <div className="flex items-center gap-3">
      <ChartIcon 
        type={type} 
        size={sizeConfig.icon}
        animated={variant !== 'minimal'}
      />
      <div className="flex-1">
        <div className={cn('font-bold', sizeConfig.value)}>
          {value}
        </div>
        <div className={cn('text-muted-foreground', sizeConfig.text)}>
          {label}
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-1">
            <ChartIcon 
              type={trendIcon!} 
              size={12}
            />
            <span className={cn('text-xs', {
              'text-green-600': trend === 'up',
              'text-red-600': trend === 'down',
              'text-gray-600': trend === 'flat'
            })}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (variant === 'card') {
    return (
      <div className={cn(
        'p-4 rounded-lg border bg-card text-card-foreground shadow-sm',
        className
      )}>
        {content}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ChartIcon type={type} size={sizeConfig.icon} />
        <span className={cn('font-medium', sizeConfig.text)}>
          {value}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('p-3', className)}>
      {content}
    </div>
  )
}

// Composant pour grille de métriques
export interface MetricsGridProps {
  metrics: Array<Omit<MetricIconProps, 'size' | 'variant'>>
  columns?: 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'card' | 'minimal'
  className?: string
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  columns = 3,
  size = 'md',
  variant = 'card',
  className
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }[columns]

  return (
    <div className={cn(
      'grid gap-4',
      gridCols,
      className
    )}>
      {metrics.map((metric, index) => (
        <MetricIcon
          key={index}
          {...metric}
          size={size}
          variant={variant}
        />
      ))}
    </div>
  )
}

// Composant pour indicateur de statut avec icône
export interface StatusIconProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading'
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  label,
  description,
  size = 'md',
  showLabel = true,
  className
}) => {
  const statusConfig = {
    success: { 
      icon: 'success' as ChartIconType, 
      color: 'text-green-500', 
      bg: 'bg-green-50', 
      border: 'border-green-200',
      defaultLabel: 'Succès'
    },
    warning: { 
      icon: 'trend-flat' as ChartIconType, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-50', 
      border: 'border-yellow-200',
      defaultLabel: 'Attention'
    },
    error: { 
      icon: 'trend-down' as ChartIconType, 
      color: 'text-red-500', 
      bg: 'bg-red-50', 
      border: 'border-red-200',
      defaultLabel: 'Erreur'
    },
    info: { 
      icon: 'insights' as ChartIconType, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50', 
      border: 'border-blue-200',
      defaultLabel: 'Information'
    },
    loading: { 
      icon: 'analytics' as ChartIconType, 
      color: 'text-gray-500', 
      bg: 'bg-gray-50', 
      border: 'border-gray-200',
      defaultLabel: 'Chargement'
    }
  }[status]

  const sizeConfig = {
    sm: { icon: 16, text: 'text-sm', padding: 'p-2' },
    md: { icon: 20, text: 'text-base', padding: 'p-3' },
    lg: { icon: 24, text: 'text-lg', padding: 'p-4' }
  }[size]

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-lg border',
      statusConfig.bg,
      statusConfig.border,
      sizeConfig.padding,
      className
    )}>
      <ChartIcon
        type={statusConfig.icon}
        size={sizeConfig.icon}
        className={statusConfig.color}
        pulse={status === 'loading'}
        animated={status !== 'loading'}
      />
      {showLabel && (
        <div>
          <div className={cn('font-medium', sizeConfig.text)}>
            {label || statusConfig.defaultLabel}
          </div>
          {description && (
            <div className={cn('text-muted-foreground', 
              size === 'sm' ? 'text-xs' : 'text-sm'
            )}>
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ChartIcon
