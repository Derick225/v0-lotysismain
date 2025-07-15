"use client"

import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { Icon, IconProps, AppIcon, AppIconProps } from './icon-provider'
import { cn } from '@/lib/utils'

// Types de tailles pour les boutons d'icônes
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Propriétés du bouton d'icône
export interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  icon?: IconProps
  appIcon?: AppIconProps
  size?: IconButtonSize
  iconSize?: number | string
  label?: string
  showLabel?: boolean
  labelPosition?: 'top' | 'bottom' | 'left' | 'right'
  responsive?: boolean
  mobileSize?: IconButtonSize
  tabletSize?: IconButtonSize
  desktopSize?: IconButtonSize
  loading?: boolean
  badge?: string | number
  badgeColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray'
  tooltip?: string
}

// Mapping des tailles
const sizeMap: Record<IconButtonSize, { button: string; icon: number; text: string }> = {
  xs: { button: 'h-6 w-6 p-1', icon: 12, text: 'text-xs' },
  sm: { button: 'h-8 w-8 p-1.5', icon: 16, text: 'text-sm' },
  md: { button: 'h-10 w-10 p-2', icon: 20, text: 'text-base' },
  lg: { button: 'h-12 w-12 p-2.5', icon: 24, text: 'text-lg' },
  xl: { button: 'h-16 w-16 p-3', icon: 32, text: 'text-xl' },
}

// Couleurs des badges
const badgeColors = {
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  yellow: 'bg-yellow-500 text-black',
  purple: 'bg-purple-500 text-white',
  gray: 'bg-gray-500 text-white',
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  appIcon,
  size = 'md',
  iconSize,
  label,
  showLabel = false,
  labelPosition = 'bottom',
  responsive = true,
  mobileSize,
  tabletSize,
  desktopSize,
  loading = false,
  badge,
  badgeColor = 'red',
  tooltip,
  className,
  children,
  disabled,
  ...props
}) => {
  // Déterminer la taille effective
  const effectiveSize = size
  const sizeConfig = sizeMap[effectiveSize]
  
  // Classes responsives
  const responsiveClasses = responsive ? [
    mobileSize && `sm:${sizeMap[mobileSize].button}`,
    tabletSize && `md:${sizeMap[tabletSize].button}`,
    desktopSize && `lg:${sizeMap[desktopSize].button}`,
  ].filter(Boolean).join(' ') : ''

  // Rendu de l'icône
  const renderIcon = () => {
    const iconProps = {
      size: iconSize || sizeConfig.icon,
      className: loading ? 'animate-spin' : '',
    }

    if (loading) {
      return <Icon name="Loader2" library="lucide" {...iconProps} />
    }

    if (appIcon) {
      return <AppIcon {...appIcon} {...iconProps} />
    }

    if (icon) {
      return <Icon {...icon} {...iconProps} />
    }

    return null
  }

  // Rendu du badge
  const renderBadge = () => {
    if (!badge) return null

    return (
      <span
        className={cn(
          'absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium flex items-center justify-center',
          badgeColors[badgeColor]
        )}
      >
        {badge}
      </span>
    )
  }

  // Rendu du label
  const renderLabel = () => {
    if (!showLabel || !label) return null

    const labelClasses = cn(
      sizeConfig.text,
      'font-medium',
      {
        'mt-1': labelPosition === 'bottom',
        'mb-1': labelPosition === 'top',
        'ml-2': labelPosition === 'right',
        'mr-2': labelPosition === 'left',
      }
    )

    return <span className={labelClasses}>{label}</span>
  }

  // Configuration du bouton
  const buttonContent = (
    <div className="relative">
      {renderIcon()}
      {renderBadge()}
    </div>
  )

  // Si on affiche le label, on utilise une disposition flex
  if (showLabel && label) {
    const flexDirection = {
      top: 'flex-col-reverse',
      bottom: 'flex-col',
      left: 'flex-row-reverse',
      right: 'flex-row',
    }[labelPosition]

    return (
      <div
        className={cn('flex items-center justify-center', flexDirection)}
        title={tooltip}
      >
        <Button
          className={cn(
            sizeConfig.button,
            responsiveClasses,
            'relative flex items-center justify-center',
            className
          )}
          disabled={disabled || loading}
          {...props}
        >
          {buttonContent}
          {children}
        </Button>
        {renderLabel()}
      </div>
    )
  }

  // Bouton simple sans label
  return (
    <Button
      className={cn(
        sizeConfig.button,
        responsiveClasses,
        'relative flex items-center justify-center',
        className
      )}
      disabled={disabled || loading}
      title={tooltip || label}
      {...props}
    >
      {buttonContent}
      {children}
    </Button>
  )
}

// Composant IconButton spécialisé pour les actions courantes
export interface QuickIconButtonProps extends Omit<IconButtonProps, 'appIcon'> {
  action: 'add' | 'edit' | 'delete' | 'save' | 'cancel' | 'search' | 'filter' | 'refresh' | 'download' | 'upload' | 'settings' | 'help' | 'close' | 'menu' | 'back' | 'forward' | 'home' | 'user' | 'logout'
}

export const QuickIconButton: React.FC<QuickIconButtonProps> = ({
  action,
  ...props
}) => {
  const actionConfig = {
    add: { name: 'add', variant: 'default' as const },
    edit: { name: 'edit', variant: 'outline' as const },
    delete: { name: 'delete', variant: 'destructive' as const },
    save: { name: 'save', variant: 'default' as const },
    cancel: { name: 'cancel', variant: 'outline' as const },
    search: { name: 'search', variant: 'outline' as const },
    filter: { name: 'filter', variant: 'outline' as const },
    refresh: { name: 'refresh', variant: 'outline' as const },
    download: { name: 'download', variant: 'outline' as const },
    upload: { name: 'upload', variant: 'outline' as const },
    settings: { name: 'settings', variant: 'ghost' as const },
    help: { name: 'help', variant: 'ghost' as const },
    close: { name: 'close', variant: 'ghost' as const },
    menu: { name: 'menu', variant: 'ghost' as const },
    back: { name: 'ArrowLeft', variant: 'ghost' as const },
    forward: { name: 'ArrowRight', variant: 'ghost' as const },
    home: { name: 'home', variant: 'ghost' as const },
    user: { name: 'user', variant: 'ghost' as const },
    logout: { name: 'LogOut', variant: 'ghost' as const },
  }[action]

  return (
    <IconButton
      appIcon={{ name: actionConfig.name as any }}
      variant={actionConfig.variant}
      {...props}
    />
  )
}

// Hook pour la gestion responsive des icônes
export const useResponsiveIconSize = () => {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  React.useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setScreenSize('mobile')
      } else if (window.innerWidth < 1024) {
        setScreenSize('tablet')
      } else {
        setScreenSize('desktop')
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const getIconSize = (base: number = 24): number => {
    switch (screenSize) {
      case 'mobile':
        return Math.max(16, base - 4)
      case 'tablet':
        return Math.max(20, base - 2)
      case 'desktop':
        return base
      default:
        return base
    }
  }

  const getButtonSize = (): IconButtonSize => {
    switch (screenSize) {
      case 'mobile':
        return 'sm'
      case 'tablet':
        return 'md'
      case 'desktop':
        return 'lg'
      default:
        return 'md'
    }
  }

  return {
    screenSize,
    getIconSize,
    getButtonSize,
  }
}

export default IconButton
