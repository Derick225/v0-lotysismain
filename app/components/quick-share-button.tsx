'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { useQuickShare, useSharingPlatforms } from '../hooks/use-social-sharing'
import type { PredictionRecord } from '../lib/prediction-history'
import type { DrawResult } from '../lib/constants'

interface QuickShareButtonProps {
  prediction?: PredictionRecord
  result?: DrawResult
  predictions?: PredictionRecord[]
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  showLabel?: boolean
  className?: string
}

export function QuickShareButton({ 
  prediction, 
  result, 
  predictions = [],
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className = '' 
}: QuickShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { quickSharePrediction, quickShareResult, isSharing } = useQuickShare()
  const { availablePlatforms, socialPlatforms, messagingPlatforms } = useSharingPlatforms()

  const canShare = prediction || (result && predictions.length > 0)

  const handleQuickShare = async (platformId: string) => {
    let success = false
    
    if (prediction) {
      success = await quickSharePrediction(prediction, platformId)
    } else if (result) {
      success = await quickShareResult(result, predictions, platformId)
    }

    if (success) {
      setIsOpen(false)
    }
  }

  if (!canShare) {
    return null
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isSharing}
          className={className}
          aria-label="Partager"
        >
          <OptimizedIcon 
            name={isSharing ? "Loader2" : "Share2"} 
            critical 
            size={16} 
            className={`${showLabel ? 'mr-2' : ''} ${isSharing ? 'animate-spin' : ''}`}
          />
          {showLabel && (isSharing ? 'Partage...' : 'Partager')}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <QuickSharePopover
          platforms={availablePlatforms}
          socialPlatforms={socialPlatforms}
          messagingPlatforms={messagingPlatforms}
          onShare={handleQuickShare}
          isSharing={isSharing}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

// Contenu du popover de partage rapide
function QuickSharePopover({
  platforms,
  socialPlatforms,
  messagingPlatforms,
  onShare,
  isSharing,
  onClose
}: {
  platforms: any[]
  socialPlatforms: any[]
  messagingPlatforms: any[]
  onShare: (platformId: string) => Promise<void>
  isSharing: boolean
  onClose: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-3">Réseaux sociaux</h3>
        <div className="grid grid-cols-3 gap-2">
          {socialPlatforms.map((platform) => (
            <PlatformButton
              key={platform.id}
              platform={platform}
              onShare={onShare}
              isSharing={isSharing}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Messagerie</h3>
        <div className="grid grid-cols-3 gap-2">
          {messagingPlatforms.map((platform) => (
            <PlatformButton
              key={platform.id}
              platform={platform}
              onShare={onShare}
              isSharing={isSharing}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">Autres</h3>
        <div className="grid grid-cols-2 gap-2">
          {platforms.filter(p => ['copy', 'email'].includes(p.id)).map((platform) => (
            <PlatformButton
              key={platform.id}
              platform={platform}
              onShare={onShare}
              isSharing={isSharing}
              fullWidth
            />
          ))}
        </div>
      </div>

      <div className="border-t pt-3">
        <AccessibleButton
          onClick={onClose}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Fermer
        </AccessibleButton>
      </div>
    </div>
  )
}

// Bouton de plateforme individuel
function PlatformButton({
  platform,
  onShare,
  isSharing,
  fullWidth = false
}: {
  platform: any
  onShare: (platformId: string) => Promise<void>
  isSharing: boolean
  fullWidth?: boolean
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onShare(platform.id)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AccessibleButton
      onClick={handleClick}
      disabled={isSharing || isLoading}
      variant="outline"
      className={`flex ${fullWidth ? 'flex-row justify-start' : 'flex-col'} items-center gap-2 h-${fullWidth ? '10' : '16'} text-xs`}
      style={{ borderColor: platform.color + '40' }}
      ariaLabel={`Partager sur ${platform.name}`}
    >
      {isLoading ? (
        <OptimizedIcon name="Loader2" critical size={16} className="animate-spin" />
      ) : (
        <span className={fullWidth ? 'text-base' : 'text-lg'}>{platform.icon}</span>
      )}
      <span className={fullWidth ? 'text-sm' : 'text-xs'}>{platform.name}</span>
    </AccessibleButton>
  )
}

// Bouton de partage minimal (juste l'icône)
export function MinimalShareButton({ 
  prediction, 
  result, 
  predictions = [],
  className = '' 
}: Omit<QuickShareButtonProps, 'showLabel' | 'variant' | 'size'>) {
  return (
    <QuickShareButton
      prediction={prediction}
      result={result}
      predictions={predictions}
      variant="ghost"
      size="sm"
      showLabel={false}
      className={`h-8 w-8 p-0 ${className}`}
    />
  )
}

// Bouton de partage avec compteur
export function ShareButtonWithCount({ 
  prediction, 
  result, 
  predictions = [],
  shareCount = 0,
  className = '' 
}: QuickShareButtonProps & { shareCount?: number }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <QuickShareButton
        prediction={prediction}
        result={result}
        predictions={predictions}
        showLabel={false}
        size="sm"
      />
      {shareCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {shareCount}
        </span>
      )}
    </div>
  )
}

// Hook pour le partage natif (Web Share API)
export function useNativeShare() {
  const canShare = 'share' in navigator

  const nativeShare = async (data: {
    title: string
    text: string
    url: string
  }): Promise<boolean> => {
    if (!canShare) return false

    try {
      await navigator.share(data)
      return true
    } catch (error) {
      // L'utilisateur a annulé ou erreur
      console.log('Partage natif annulé ou erreur:', error)
      return false
    }
  }

  return {
    canShare,
    nativeShare
  }
}

// Bouton de partage natif (si supporté)
export function NativeShareButton({ 
  prediction, 
  result, 
  predictions = [],
  className = '' 
}: QuickShareButtonProps) {
  const { canShare, nativeShare } = useNativeShare()
  const [isSharing, setIsSharing] = useState(false)

  if (!canShare) {
    return (
      <QuickShareButton
        prediction={prediction}
        result={result}
        predictions={predictions}
        className={className}
      />
    )
  }

  const handleNativeShare = async () => {
    setIsSharing(true)
    
    try {
      let title = ''
      let text = ''
      let url = window.location.href

      if (prediction) {
        title = `Prédiction ${prediction.drawName}`
        text = `Ma prédiction pour ${prediction.drawName}: ${prediction.predictions.join('-')} (Confiance: ${prediction.confidence}%)`
      } else if (result) {
        title = `Résultats ${result.draw_name}`
        text = `Résultats ${result.draw_name}: ${result.gagnants.join('-')}`
      }

      const success = await nativeShare({ title, text, url })
      
      if (!success) {
        // Fallback vers le partage personnalisé
        // Ici on pourrait ouvrir le popover de partage
      }
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Button
      onClick={handleNativeShare}
      disabled={isSharing}
      variant="outline"
      className={className}
    >
      <OptimizedIcon 
        name={isSharing ? "Loader2" : "Share2"} 
        critical 
        size={16} 
        className={`mr-2 ${isSharing ? 'animate-spin' : ''}`}
      />
      {isSharing ? 'Partage...' : 'Partager'}
    </Button>
  )
}

// Composant de partage contextuel (s'adapte au contenu)
export function ContextualShareButton({ 
  prediction, 
  result, 
  predictions = [],
  context = 'default',
  className = '' 
}: QuickShareButtonProps & { context?: 'prediction' | 'result' | 'achievement' | 'default' }) {
  const getContextualProps = () => {
    switch (context) {
      case 'prediction':
        return {
          variant: 'default' as const,
          size: 'default' as const,
          showLabel: true
        }
      case 'result':
        return {
          variant: 'outline' as const,
          size: 'sm' as const,
          showLabel: true
        }
      case 'achievement':
        return {
          variant: 'default' as const,
          size: 'lg' as const,
          showLabel: true
        }
      default:
        return {
          variant: 'outline' as const,
          size: 'default' as const,
          showLabel: true
        }
    }
  }

  const props = getContextualProps()

  return (
    <QuickShareButton
      prediction={prediction}
      result={result}
      predictions={predictions}
      {...props}
      className={className}
    />
  )
}
