'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  socialSharingManager, 
  type ShareableContent, 
  type SocialProfile, 
  type Achievement, 
  type ShareOptions 
} from '../lib/social-sharing-manager'
import { useScreenReaderAnnouncements } from './use-accessibility'
import type { PredictionRecord } from '../lib/prediction-history'
import type { DrawResult } from '../lib/constants'

interface UseSocialSharingReturn {
  // État
  profile: SocialProfile | null
  sharedContent: ShareableContent[]
  achievements: Achievement[]
  
  // Actions de partage
  sharePrediction: (prediction: PredictionRecord, options?: any) => Promise<ShareableContent | null>
  shareResult: (result: DrawResult, predictions: PredictionRecord[], options?: any) => Promise<ShareableContent | null>
  shareOnPlatform: (content: ShareableContent, platform: ShareOptions['platform'], options?: Partial<ShareOptions>) => Promise<boolean>
  
  // Gestion du contenu
  deleteContent: (id: string) => Promise<boolean>
  updateContentStats: (id: string, stats: any) => Promise<boolean>
  getContentById: (id: string) => ShareableContent | null
  
  // Utilitaires
  generateShareUrl: (content: ShareableContent) => string
  copyShareLink: (content: ShareableContent) => Promise<boolean>
  
  // État
  isSharing: boolean
  error: string | null
}

export function useSocialSharing(): UseSocialSharingReturn {
  const [profile, setProfile] = useState<SocialProfile | null>(null)
  const [sharedContent, setSharedContent] = useState<ShareableContent[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { announce } = useScreenReaderAnnouncements()

  // Charger les données initiales
  useEffect(() => {
    const loadData = () => {
      setProfile(socialSharingManager.getProfile())
      setSharedContent(socialSharingManager.getSharedContent())
      setAchievements(socialSharingManager.getAchievements())
    }

    loadData()

    // Actualiser périodiquement
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Partager une prédiction
  const sharePrediction = useCallback(async (
    prediction: PredictionRecord, 
    options: {
      privacy?: 'public' | 'friends' | 'private'
      customTitle?: string
      customDescription?: string
      tags?: string[]
      platform?: ShareOptions['platform']
    } = {}
  ): Promise<ShareableContent | null> => {
    setIsSharing(true)
    setError(null)
    
    try {
      const content = await socialSharingManager.createPredictionShare(prediction, options)
      
      // Partager immédiatement sur une plateforme si spécifiée
      if (options.platform) {
        await socialSharingManager.shareOnPlatform(content, options.platform)
      }
      
      // Mettre à jour l'état local
      setSharedContent(socialSharingManager.getSharedContent())
      
      announce(`Prédiction partagée avec succès pour ${prediction.drawName}`)
      return content
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du partage'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
      
    } finally {
      setIsSharing(false)
    }
  }, [announce])

  // Partager un résultat
  const shareResult = useCallback(async (
    result: DrawResult, 
    predictions: PredictionRecord[], 
    options: {
      privacy?: 'public' | 'friends' | 'private'
      highlightAccuracy?: boolean
      customMessage?: string
      platform?: ShareOptions['platform']
    } = {}
  ): Promise<ShareableContent | null> => {
    setIsSharing(true)
    setError(null)
    
    try {
      const content = await socialSharingManager.createResultShare(result, predictions, options)
      
      // Partager immédiatement sur une plateforme si spécifiée
      if (options.platform) {
        await socialSharingManager.shareOnPlatform(content, options.platform)
      }
      
      // Mettre à jour l'état local
      setSharedContent(socialSharingManager.getSharedContent())
      
      announce(`Résultat partagé avec succès pour ${result.draw_name}`)
      return content
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du partage'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return null
      
    } finally {
      setIsSharing(false)
    }
  }, [announce])

  // Partager sur une plateforme
  const shareOnPlatform = useCallback(async (
    content: ShareableContent, 
    platform: ShareOptions['platform'], 
    options: Partial<ShareOptions> = {}
  ): Promise<boolean> => {
    setIsSharing(true)
    setError(null)
    
    try {
      const success = await socialSharingManager.shareOnPlatform(content, platform, options)
      
      if (success) {
        // Mettre à jour les statistiques
        await socialSharingManager.updateContentStats(content.id, {
          shares: content.stats.shares + 1
        })
        setSharedContent(socialSharingManager.getSharedContent())
        
        announce(`Contenu partagé avec succès sur ${platform}`)
      } else {
        announce(`Erreur lors du partage sur ${platform}`, 'assertive')
      }
      
      return success
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du partage'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return false
      
    } finally {
      setIsSharing(false)
    }
  }, [announce])

  // Supprimer un contenu
  const deleteContent = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await socialSharingManager.deleteSharedContent(id)
      
      if (success) {
        setSharedContent(socialSharingManager.getSharedContent())
        announce('Contenu supprimé avec succès')
      }
      
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(errorMessage)
      announce(`Erreur: ${errorMessage}`, 'assertive')
      return false
    }
  }, [announce])

  // Mettre à jour les statistiques
  const updateContentStats = useCallback(async (id: string, stats: any): Promise<boolean> => {
    try {
      const success = await socialSharingManager.updateContentStats(id, stats)
      
      if (success) {
        setSharedContent(socialSharingManager.getSharedContent())
      }
      
      return success
    } catch (err) {
      console.error('Erreur mise à jour stats:', err)
      return false
    }
  }, [])

  // Obtenir un contenu par ID
  const getContentById = useCallback((id: string): ShareableContent | null => {
    return socialSharingManager.getContentById(id)
  }, [])

  // Générer une URL de partage
  const generateShareUrl = useCallback((content: ShareableContent): string => {
    return content.shareUrl || `${window.location.origin}/share/${content.id}`
  }, [])

  // Copier le lien de partage
  const copyShareLink = useCallback(async (content: ShareableContent): Promise<boolean> => {
    try {
      const url = generateShareUrl(content)
      await navigator.clipboard.writeText(url)
      announce('Lien copié dans le presse-papiers')
      return true
    } catch (err) {
      announce('Erreur lors de la copie du lien', 'assertive')
      return false
    }
  }, [generateShareUrl, announce])

  return {
    // État
    profile,
    sharedContent,
    achievements,
    
    // Actions
    sharePrediction,
    shareResult,
    shareOnPlatform,
    
    // Gestion
    deleteContent,
    updateContentStats,
    getContentById,
    
    // Utilitaires
    generateShareUrl,
    copyShareLink,
    
    // État
    isSharing,
    error
  }
}

// Hook simplifié pour le partage rapide
export function useQuickShare() {
  const { sharePrediction, shareResult, shareOnPlatform, isSharing } = useSocialSharing()
  
  const quickSharePrediction = useCallback(async (
    prediction: PredictionRecord, 
    platform: ShareOptions['platform']
  ) => {
    const content = await sharePrediction(prediction, { platform })
    return !!content
  }, [sharePrediction])
  
  const quickShareResult = useCallback(async (
    result: DrawResult, 
    predictions: PredictionRecord[], 
    platform: ShareOptions['platform']
  ) => {
    const content = await shareResult(result, predictions, { platform })
    return !!content
  }, [shareResult])
  
  return {
    quickSharePrediction,
    quickShareResult,
    shareOnPlatform,
    isSharing
  }
}

// Hook pour les statistiques de partage
export function useSharingStats() {
  const { sharedContent, profile } = useSocialSharing()
  
  const stats = {
    totalShares: sharedContent.length,
    totalViews: sharedContent.reduce((sum, content) => sum + content.stats.views, 0),
    totalLikes: sharedContent.reduce((sum, content) => sum + content.stats.likes, 0),
    totalComments: sharedContent.reduce((sum, content) => sum + content.stats.comments, 0),
    averageEngagement: sharedContent.length > 0 ? 
      sharedContent.reduce((sum, content) => 
        sum + (content.stats.likes + content.stats.comments) / Math.max(content.stats.views, 1), 0
      ) / sharedContent.length * 100 : 0,
    mostPopular: sharedContent.reduce((best, current) => 
      (current.stats.views + current.stats.likes) > (best.stats?.views + best.stats?.likes || 0) ? current : best, 
      {} as ShareableContent
    ),
    recentShares: sharedContent
      .filter(content => {
        const dayAgo = new Date()
        dayAgo.setDate(dayAgo.getDate() - 1)
        return new Date(content.metadata.timestamp) > dayAgo
      })
      .length
  }
  
  return {
    ...stats,
    profile,
    hasContent: sharedContent.length > 0
  }
}

// Hook pour les achievements
export function useAchievements() {
  const { achievements } = useSocialSharing()
  
  const unlockedAchievements = achievements.filter(a => a.unlockedAt)
  const lockedAchievements = achievements.filter(a => !a.unlockedAt)
  
  const achievementsByRarity = {
    legendary: achievements.filter(a => a.rarity === 'legendary'),
    epic: achievements.filter(a => a.rarity === 'epic'),
    rare: achievements.filter(a => a.rarity === 'rare'),
    common: achievements.filter(a => a.rarity === 'common')
  }
  
  const completionRate = achievements.length > 0 ? 
    (unlockedAchievements.length / achievements.length) * 100 : 0
  
  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    achievementsByRarity,
    completionRate,
    totalAchievements: achievements.length,
    unlockedCount: unlockedAchievements.length
  }
}

// Hook pour les plateformes de partage disponibles
export function useSharingPlatforms() {
  const platforms = [
    {
      id: 'twitter' as const,
      name: 'Twitter',
      icon: '🐦',
      color: '#1DA1F2',
      available: true
    },
    {
      id: 'facebook' as const,
      name: 'Facebook',
      icon: '📘',
      color: '#4267B2',
      available: true
    },
    {
      id: 'linkedin' as const,
      name: 'LinkedIn',
      icon: '💼',
      color: '#0077B5',
      available: true
    },
    {
      id: 'whatsapp' as const,
      name: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      available: true
    },
    {
      id: 'telegram' as const,
      name: 'Telegram',
      icon: '✈️',
      color: '#0088CC',
      available: true
    },
    {
      id: 'copy' as const,
      name: 'Copier le lien',
      icon: '📋',
      color: '#6B7280',
      available: !!navigator.clipboard
    },
    {
      id: 'email' as const,
      name: 'Email',
      icon: '📧',
      color: '#EA4335',
      available: true
    }
  ]
  
  const availablePlatforms = platforms.filter(p => p.available)
  const socialPlatforms = platforms.filter(p => 
    ['twitter', 'facebook', 'linkedin'].includes(p.id)
  )
  const messagingPlatforms = platforms.filter(p => 
    ['whatsapp', 'telegram', 'email'].includes(p.id)
  )
  
  return {
    platforms,
    availablePlatforms,
    socialPlatforms,
    messagingPlatforms
  }
}
