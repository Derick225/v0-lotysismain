'use client'

/**
 * Gestionnaire de partage social et collaboration pour Lotysis
 * Gère le partage de prédictions, résultats et collaboration communautaire
 */

import { indexedDBCache } from './indexeddb-cache'
import { cloudSyncManager } from './cloud-sync-manager'
import type { PredictionRecord } from './prediction-history'
import type { DrawResult } from './constants'

export interface ShareableContent {
  id: string
  type: 'prediction' | 'result' | 'trend' | 'achievement' | 'strategy'
  title: string
  description: string
  data: any
  metadata: {
    drawName?: string
    accuracy?: number
    confidence?: number
    timestamp: string
    author: string
    tags: string[]
  }
  privacy: 'public' | 'friends' | 'private'
  shareUrl?: string
  imageUrl?: string
  stats: {
    views: number
    likes: number
    shares: number
    comments: number
  }
}

export interface SocialProfile {
  id: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
  stats: {
    totalPredictions: number
    averageAccuracy: number
    bestStreak: number
    followers: number
    following: number
    reputation: number
  }
  preferences: {
    shareByDefault: boolean
    allowComments: boolean
    showStats: boolean
    publicProfile: boolean
  }
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  type: 'accuracy' | 'streak' | 'social' | 'milestone'
  title: string
  description: string
  icon: string
  unlockedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  progress?: {
    current: number
    target: number
  }
}

export interface CommunityPost {
  id: string
  author: SocialProfile
  content: ShareableContent
  timestamp: string
  engagement: {
    likes: string[] // User IDs
    comments: Comment[]
    shares: string[] // User IDs
  }
  visibility: 'public' | 'followers' | 'friends'
  featured: boolean
}

export interface Comment {
  id: string
  author: SocialProfile
  content: string
  timestamp: string
  likes: string[]
  replies: Comment[]
}

export interface ShareOptions {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'whatsapp' | 'telegram' | 'copy' | 'email'
  includeImage: boolean
  customMessage?: string
  hashtags?: string[]
}

class SocialSharingManager {
  private profile: SocialProfile | null = null
  private sharedContent: ShareableContent[] = []
  private communityPosts: CommunityPost[] = []
  private achievements: Achievement[] = []

  constructor() {
    this.initialize()
  }

  /**
   * Initialiser le gestionnaire de partage social
   */
  private async initialize() {
    try {
      await this.loadProfile()
      await this.loadSharedContent()
      await this.loadCommunityPosts()
      await this.loadAchievements()
      
      console.log('✅ Gestionnaire de partage social initialisé')
    } catch (error) {
      console.error('❌ Erreur initialisation partage social:', error)
    }
  }

  /**
   * Créer un contenu partageable à partir d'une prédiction
   */
  async createPredictionShare(prediction: PredictionRecord, options: {
    privacy?: 'public' | 'friends' | 'private'
    customTitle?: string
    customDescription?: string
    tags?: string[]
  } = {}): Promise<ShareableContent> {
    const shareId = this.generateShareId()
    
    const content: ShareableContent = {
      id: shareId,
      type: 'prediction',
      title: options.customTitle || `Prédiction ${prediction.drawName}`,
      description: options.customDescription || this.generatePredictionDescription(prediction),
      data: {
        prediction,
        numbers: prediction.predictions,
        confidence: prediction.confidence,
        algorithm: prediction.algorithm
      },
      metadata: {
        drawName: prediction.drawName,
        confidence: prediction.confidence,
        timestamp: new Date().toISOString(),
        author: this.profile?.username || 'Anonyme',
        tags: options.tags || [prediction.drawName, prediction.algorithm]
      },
      privacy: options.privacy || 'public',
      imageUrl: await this.generatePredictionImage(prediction),
      stats: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      }
    }

    // Générer l'URL de partage
    content.shareUrl = this.generateShareUrl(content)

    // Sauvegarder
    this.sharedContent.push(content)
    await this.saveSharedContent()

    return content
  }

  /**
   * Créer un contenu partageable à partir d'un résultat
   */
  async createResultShare(result: DrawResult, predictions: PredictionRecord[], options: {
    privacy?: 'public' | 'friends' | 'private'
    highlightAccuracy?: boolean
    customMessage?: string
  } = {}): Promise<ShareableContent> {
    const shareId = this.generateShareId()
    
    // Calculer les correspondances
    const matches = predictions.map(pred => ({
      prediction: pred,
      matches: pred.predictions.filter(num => result.gagnants.includes(num)).length
    }))
    
    const bestMatch = matches.reduce((best, current) => 
      current.matches > best.matches ? current : best, { matches: 0 }
    )

    const content: ShareableContent = {
      id: shareId,
      type: 'result',
      title: `Résultats ${result.draw_name}`,
      description: options.customMessage || this.generateResultDescription(result, bestMatch),
      data: {
        result,
        predictions,
        bestMatch: bestMatch.matches,
        accuracy: bestMatch.matches > 0 ? (bestMatch.matches / result.gagnants.length) * 100 : 0
      },
      metadata: {
        drawName: result.draw_name,
        accuracy: bestMatch.matches > 0 ? (bestMatch.matches / result.gagnants.length) * 100 : 0,
        timestamp: new Date().toISOString(),
        author: this.profile?.username || 'Anonyme',
        tags: [result.draw_name, 'résultats']
      },
      privacy: options.privacy || 'public',
      imageUrl: await this.generateResultImage(result, bestMatch),
      stats: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      }
    }

    content.shareUrl = this.generateShareUrl(content)

    this.sharedContent.push(content)
    await this.saveSharedContent()

    return content
  }

  /**
   * Partager sur une plateforme sociale
   */
  async shareOnPlatform(content: ShareableContent, platform: ShareOptions['platform'], options: Partial<ShareOptions> = {}): Promise<boolean> {
    try {
      const shareUrl = content.shareUrl || window.location.origin
      const text = this.formatShareText(content, options)
      
      switch (platform) {
        case 'twitter':
          return this.shareOnTwitter(text, shareUrl, options.hashtags)
          
        case 'facebook':
          return this.shareOnFacebook(shareUrl, text)
          
        case 'linkedin':
          return this.shareOnLinkedIn(shareUrl, text)
          
        case 'whatsapp':
          return this.shareOnWhatsApp(text, shareUrl)
          
        case 'telegram':
          return this.shareOnTelegram(text, shareUrl)
          
        case 'copy':
          return this.copyToClipboard(text, shareUrl)
          
        case 'email':
          return this.shareByEmail(content.title, text, shareUrl)
          
        default:
          throw new Error(`Plateforme non supportée: ${platform}`)
      }
    } catch (error) {
      console.error('Erreur partage:', error)
      return false
    }
  }

  /**
   * Partager sur Twitter
   */
  private shareOnTwitter(text: string, url: string, hashtags?: string[]): boolean {
    const hashtagsStr = hashtags ? hashtags.map(tag => `#${tag}`).join(' ') : '#Lotysis #Prédictions'
    const tweetText = `${text} ${hashtagsStr}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`
    
    window.open(twitterUrl, '_blank', 'width=600,height=400')
    return true
  }

  /**
   * Partager sur Facebook
   */
  private shareOnFacebook(url: string, text: string): boolean {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
    
    window.open(facebookUrl, '_blank', 'width=600,height=400')
    return true
  }

  /**
   * Partager sur LinkedIn
   */
  private shareOnLinkedIn(url: string, text: string): boolean {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
    
    window.open(linkedinUrl, '_blank', 'width=600,height=400')
    return true
  }

  /**
   * Partager sur WhatsApp
   */
  private shareOnWhatsApp(text: string, url: string): boolean {
    const message = `${text}\n\n${url}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    
    window.open(whatsappUrl, '_blank')
    return true
  }

  /**
   * Partager sur Telegram
   */
  private shareOnTelegram(text: string, url: string): boolean {
    const message = `${text}\n\n${url}`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    
    window.open(telegramUrl, '_blank')
    return true
  }

  /**
   * Copier dans le presse-papiers
   */
  private async copyToClipboard(text: string, url: string): Promise<boolean> {
    try {
      const content = `${text}\n\n${url}`
      await navigator.clipboard.writeText(content)
      return true
    } catch (error) {
      console.error('Erreur copie presse-papiers:', error)
      return false
    }
  }

  /**
   * Partager par email
   */
  private shareByEmail(subject: string, body: string, url: string): boolean {
    const emailBody = `${body}\n\nVoir plus: ${url}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`
    
    window.location.href = mailtoUrl
    return true
  }

  /**
   * Générer une image pour une prédiction
   */
  private async generatePredictionImage(prediction: PredictionRecord): Promise<string> {
    // Créer un canvas pour générer l'image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ''
    
    canvas.width = 800
    canvas.height = 400
    
    // Fond dégradé
    const gradient = ctx.createLinearGradient(0, 0, 800, 400)
    gradient.addColorStop(0, '#667eea')
    gradient.addColorStop(1, '#764ba2')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 400)
    
    // Titre
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Prédiction ${prediction.drawName}`, 400, 80)
    
    // Numéros prédits
    ctx.font = 'bold 48px Arial'
    const numbersText = prediction.predictions.join(' - ')
    ctx.fillText(numbersText, 400, 180)
    
    // Confiance
    ctx.font = '24px Arial'
    ctx.fillText(`Confiance: ${prediction.confidence}%`, 400, 240)
    
    // Algorithme
    ctx.font = '18px Arial'
    ctx.fillText(`Algorithme: ${prediction.algorithm}`, 400, 280)
    
    // Logo/Watermark
    ctx.font = '16px Arial'
    ctx.fillText('Généré par Lotysis', 400, 360)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Générer une image pour un résultat
   */
  private async generateResultImage(result: DrawResult, bestMatch: any): Promise<string> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ''
    
    canvas.width = 800
    canvas.height = 400
    
    // Fond selon la performance
    const gradient = ctx.createLinearGradient(0, 0, 800, 400)
    if (bestMatch.matches >= 3) {
      gradient.addColorStop(0, '#48bb78')
      gradient.addColorStop(1, '#38a169')
    } else if (bestMatch.matches >= 1) {
      gradient.addColorStop(0, '#ed8936')
      gradient.addColorStop(1, '#dd6b20')
    } else {
      gradient.addColorStop(0, '#4299e1')
      gradient.addColorStop(1, '#3182ce')
    }
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 400)
    
    // Titre
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`Résultats ${result.draw_name}`, 400, 80)
    
    // Numéros gagnants
    ctx.font = 'bold 48px Arial'
    const numbersText = result.gagnants.join(' - ')
    ctx.fillText(numbersText, 400, 180)
    
    // Performance
    if (bestMatch.matches > 0) {
      ctx.font = '24px Arial'
      ctx.fillText(`🎯 ${bestMatch.matches} numéro(s) prédit(s) !`, 400, 240)
    }
    
    // Date
    ctx.font = '18px Arial'
    ctx.fillText(new Date(result.date).toLocaleDateString('fr-FR'), 400, 280)
    
    // Logo/Watermark
    ctx.font = '16px Arial'
    ctx.fillText('Analysé par Lotysis', 400, 360)
    
    return canvas.toDataURL('image/png')
  }

  /**
   * Formater le texte de partage
   */
  private formatShareText(content: ShareableContent, options: Partial<ShareOptions> = {}): string {
    if (options.customMessage) {
      return options.customMessage
    }
    
    switch (content.type) {
      case 'prediction':
        return `🎲 Ma prédiction pour ${content.metadata.drawName}: ${content.data.numbers.join('-')} (Confiance: ${content.metadata.confidence}%)`
        
      case 'result':
        const accuracy = content.metadata.accuracy || 0
        if (accuracy > 0) {
          return `🎯 Résultats ${content.metadata.drawName}: ${content.data.result.gagnants.join('-')} - J'ai prédit ${content.data.bestMatch} numéro(s) !`
        } else {
          return `📊 Résultats ${content.metadata.drawName}: ${content.data.result.gagnants.join('-')}`
        }
        
      default:
        return content.description
    }
  }

  /**
   * Générer une description pour une prédiction
   */
  private generatePredictionDescription(prediction: PredictionRecord): string {
    return `Prédiction générée avec l'algorithme ${prediction.algorithm} pour le tirage ${prediction.drawName}. Confiance: ${prediction.confidence}%. Numéros: ${prediction.predictions.join(', ')}.`
  }

  /**
   * Générer une description pour un résultat
   */
  private generateResultDescription(result: DrawResult, bestMatch: any): string {
    if (bestMatch.matches > 0) {
      return `Résultats du tirage ${result.draw_name}: ${result.gagnants.join(', ')}. J'ai prédit ${bestMatch.matches} numéro(s) correct(s) !`
    } else {
      return `Résultats du tirage ${result.draw_name}: ${result.gagnants.join(', ')}.`
    }
  }

  /**
   * Générer une URL de partage
   */
  private generateShareUrl(content: ShareableContent): string {
    const baseUrl = window.location.origin
    return `${baseUrl}/share/${content.id}`
  }

  /**
   * Générer un ID unique pour le partage
   */
  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Charger le profil utilisateur
   */
  private async loadProfile() {
    try {
      const profile = await indexedDBCache.get<SocialProfile>('social_profile')
      this.profile = profile
    } catch (error) {
      console.warn('Erreur chargement profil social:', error)
    }
  }

  /**
   * Charger le contenu partagé
   */
  private async loadSharedContent() {
    try {
      const content = await indexedDBCache.get<ShareableContent[]>('shared_content') || []
      this.sharedContent = content
    } catch (error) {
      console.warn('Erreur chargement contenu partagé:', error)
    }
  }

  /**
   * Charger les posts de la communauté
   */
  private async loadCommunityPosts() {
    try {
      const posts = await indexedDBCache.get<CommunityPost[]>('community_posts') || []
      this.communityPosts = posts
    } catch (error) {
      console.warn('Erreur chargement posts communauté:', error)
    }
  }

  /**
   * Charger les achievements
   */
  private async loadAchievements() {
    try {
      const achievements = await indexedDBCache.get<Achievement[]>('achievements') || []
      this.achievements = achievements
    } catch (error) {
      console.warn('Erreur chargement achievements:', error)
    }
  }

  /**
   * Sauvegarder le contenu partagé
   */
  private async saveSharedContent() {
    try {
      await indexedDBCache.set('shared_content', this.sharedContent)
    } catch (error) {
      console.error('Erreur sauvegarde contenu partagé:', error)
    }
  }

  /**
   * API publique
   */
  
  // Obtenir le profil
  getProfile(): SocialProfile | null {
    return this.profile
  }

  // Obtenir le contenu partagé
  getSharedContent(): ShareableContent[] {
    return [...this.sharedContent]
  }

  // Obtenir les posts de la communauté
  getCommunityPosts(): CommunityPost[] {
    return [...this.communityPosts]
  }

  // Obtenir les achievements
  getAchievements(): Achievement[] {
    return [...this.achievements]
  }

  // Obtenir un contenu par ID
  getContentById(id: string): ShareableContent | null {
    return this.sharedContent.find(content => content.id === id) || null
  }

  // Supprimer un contenu partagé
  async deleteSharedContent(id: string): Promise<boolean> {
    const index = this.sharedContent.findIndex(content => content.id === id)
    if (index === -1) return false
    
    this.sharedContent.splice(index, 1)
    await this.saveSharedContent()
    return true
  }

  // Mettre à jour les statistiques d'un contenu
  async updateContentStats(id: string, stats: Partial<ShareableContent['stats']>): Promise<boolean> {
    const content = this.sharedContent.find(c => c.id === id)
    if (!content) return false
    
    content.stats = { ...content.stats, ...stats }
    await this.saveSharedContent()
    return true
  }
}

// Instance singleton
export const socialSharingManager = new SocialSharingManager()

// Types exportés
export type { ShareableContent, SocialProfile, Achievement, CommunityPost, Comment, ShareOptions }
