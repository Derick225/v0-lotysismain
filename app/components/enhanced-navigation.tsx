"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AppIcon, AppIconProps } from './ui/icon-provider'
import { IconButton, QuickIconButton, useResponsiveIconSize } from './ui/icon-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types pour les éléments de navigation
interface NavigationItem {
  id: string
  label: string
  href: string
  icon: keyof typeof import('./ui/icon-provider').AppIcons
  badge?: string | number
  badgeColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray'
  description?: string
  isNew?: boolean
  isActive?: boolean
  children?: NavigationItem[]
}

// Configuration de la navigation
const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    href: '/',
    icon: 'home',
    description: 'Page d\'accueil de Lotysis'
  },
  {
    id: 'results',
    label: 'Résultats',
    href: '/results',
    icon: 'results',
    description: 'Derniers résultats de loterie'
  },
  {
    id: 'statistics',
    label: 'Statistiques',
    href: '/statistics',
    icon: 'statistics',
    description: 'Analyses statistiques détaillées'
  },
  {
    id: 'predictions',
    label: 'Prédictions',
    href: '/predictions',
    icon: 'predictions',
    badge: 'IA',
    badgeColor: 'blue',
    isNew: true,
    description: 'Prédictions basées sur l\'IA'
  },
  {
    id: 'profile',
    label: 'Profil',
    href: '/profile',
    icon: 'profile',
    description: 'Votre profil utilisateur'
  },
]

// Propriétés du composant de navigation
interface EnhancedNavigationProps {
  variant?: 'horizontal' | 'vertical' | 'mobile'
  showLabels?: boolean
  showBadges?: boolean
  showDescriptions?: boolean
  compact?: boolean
  className?: string
}

export const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({
  variant = 'horizontal',
  showLabels = true,
  showBadges = true,
  showDescriptions = false,
  compact = false,
  className
}) => {
  const pathname = usePathname()
  const { screenSize, getIconSize, getButtonSize } = useResponsiveIconSize()
  const [isOpen, setIsOpen] = useState(false)

  // Déterminer l'élément actif
  const getActiveItem = (item: NavigationItem): boolean => {
    if (item.href === '/' && pathname === '/') return true
    if (item.href !== '/' && pathname.startsWith(item.href)) return true
    return false
  }

  // Rendu d'un élément de navigation
  const renderNavigationItem = (item: NavigationItem, isMobile = false) => {
    const isActive = getActiveItem(item)
    const iconSize = getIconSize(compact ? 20 : 24)
    
    const content = (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-primary text-primary-foreground',
        compact && 'p-2 gap-2'
      )}>
        <div className="relative">
          <AppIcon 
            name={item.icon} 
            size={iconSize}
            className={cn(
              'transition-transform duration-200',
              isActive && 'scale-110'
            )}
          />
          {showBadges && item.badge && (
            <Badge 
              variant="secondary"
              className={cn(
                'absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center',
                item.badgeColor === 'red' && 'bg-red-500 text-white',
                item.badgeColor === 'blue' && 'bg-blue-500 text-white',
                item.badgeColor === 'green' && 'bg-green-500 text-white',
                item.badgeColor === 'yellow' && 'bg-yellow-500 text-black',
                item.badgeColor === 'purple' && 'bg-purple-500 text-white',
                item.badgeColor === 'gray' && 'bg-gray-500 text-white'
              )}
            >
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </div>
        
        {showLabels && (
          <div className="flex-1 min-w-0">
            <div className={cn(
              'font-medium truncate',
              compact ? 'text-sm' : 'text-base'
            )}>
              {item.label}
            </div>
            {showDescriptions && item.description && (
              <div className="text-xs text-muted-foreground truncate">
                {item.description}
              </div>
            )}
          </div>
        )}
      </div>
    )

    if (isMobile) {
      return (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => setIsOpen(false)}
          className="block"
        >
          {content}
        </Link>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        className="block"
      >
        {content}
      </Link>
    )
  }

  // Navigation horizontale (desktop)
  if (variant === 'horizontal') {
    return (
      <nav className={cn('flex items-center space-x-1', className)}>
        {navigationItems.map((item) => (
          <div key={item.id} className="relative">
            {renderNavigationItem(item)}
          </div>
        ))}
      </nav>
    )
  }

  // Navigation verticale (sidebar)
  if (variant === 'vertical') {
    return (
      <nav className={cn('flex flex-col space-y-1', className)}>
        {navigationItems.map((item) => (
          <div key={item.id}>
            {renderNavigationItem(item)}
          </div>
        ))}
      </nav>
    )
  }

  // Navigation mobile (drawer)
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <IconButton
          appIcon={{ name: 'menu' }}
          variant="ghost"
          size="md"
          className={className}
        />
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AppIcon name="home" size={24} />
            Lotysis
          </SheetTitle>
          <SheetDescription>
            Navigation de l'application
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {navigationItems.map((item) => renderNavigationItem(item, true))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Composant de barre de navigation responsive
export const ResponsiveNavBar: React.FC = () => {
  const { screenSize } = useResponsiveIconSize()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      scrolled && 'shadow-sm'
    )}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <AppIcon name="home" size={32} className="text-primary" />
          <span className="font-bold text-xl hidden sm:block">Lotysis</span>
        </Link>

        {/* Navigation desktop */}
        {screenSize === 'desktop' && (
          <EnhancedNavigation 
            variant="horizontal" 
            compact={true}
            showLabels={true}
            showDescriptions={false}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <IconButton
            appIcon={{ name: 'info' }}
            variant="ghost"
            size="sm"
            badge="3"
            badgeColor="red"
          />

          {/* Paramètres */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                appIcon={{ name: 'settings' }}
                variant="ghost"
                size="sm"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Paramètres</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <AppIcon name="user" size={16} className="mr-2" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AppIcon name="settings" size={16} className="mr-2" />
                Préférences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <AppIcon name="help" size={16} className="mr-2" />
                Aide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu mobile */}
          {(screenSize === 'mobile' || screenSize === 'tablet') && (
            <EnhancedNavigation variant="mobile" />
          )}
        </div>
      </div>
    </header>
  )
}

// Composant de navigation en bas pour mobile
export const BottomNavigation: React.FC = () => {
  const pathname = usePathname()
  const { screenSize } = useResponsiveIconSize()

  // Afficher seulement sur mobile
  if (screenSize !== 'mobile') return null

  const mainItems = navigationItems.slice(0, 5) // Prendre les 5 premiers éléments

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around py-2">
        {mainItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'text-primary'
              )}
            >
              <div className="relative">
                <AppIcon 
                  name={item.icon} 
                  size={20}
                  className={cn(
                    'transition-transform duration-200',
                    isActive && 'scale-110'
                  )}
                />
                {item.badge && (
                  <Badge 
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-3 w-3 p-0 text-xs flex items-center justify-center bg-red-500 text-white"
                  >
                    {typeof item.badge === 'string' && item.badge.length > 2 ? '!' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default EnhancedNavigation
