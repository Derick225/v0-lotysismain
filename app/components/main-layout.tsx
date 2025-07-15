"use client"

import React from 'react'
import { ResponsiveNavBar, BottomNavigation } from './enhanced-navigation'
import { StatusBar } from './global-status-indicator'
import { InstallPWA } from './install-pwa'
import { TensorFlowLoader } from './tensorflow-loader'
import { ModelSyncStatus } from './model-sync-status'
import { SyncStatusPanel } from './sync-status-panel'
import { useResponsiveIconSize } from './ui/icon-button'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  showStatusBar?: boolean
  showInstallPWA?: boolean
  showModelSync?: boolean
  className?: string
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showStatusBar = true,
  showInstallPWA = true,
  showModelSync = true,
  className
}) => {
  const { screenSize } = useResponsiveIconSize()

  return (
    <div className="min-h-screen bg-background">
      {/* Barre de navigation principale */}
      <ResponsiveNavBar />
      
      {/* Barre de statut */}
      {showStatusBar && <StatusBar />}
      
      {/* Contenu principal */}
      <main className={cn(
        'container mx-auto px-4 py-6',
        // Ajouter un padding bottom sur mobile pour la navigation en bas
        screenSize === 'mobile' && 'pb-20',
        className
      )}>
        {children}
      </main>
      
      {/* Composants système */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
        {/* Loader TensorFlow */}
        <TensorFlowLoader />
        
        {/* Statut de synchronisation des modèles */}
        {showModelSync && <ModelSyncStatus />}
        
        {/* Installation PWA */}
        {showInstallPWA && <InstallPWA />}
      </div>
      
      {/* Panneau de synchronisation (caché par défaut) */}
      <SyncStatusPanel />
      
      {/* Navigation en bas pour mobile */}
      <BottomNavigation />
    </div>
  )
}

export default MainLayout
