'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { 
  useSocialSharing, 
  useQuickShare, 
  useSharingStats, 
  useSharingPlatforms 
} from '../hooks/use-social-sharing'
import type { ShareableContent, ShareOptions } from '../lib/social-sharing-manager'
import type { PredictionRecord } from '../lib/prediction-history'
import type { DrawResult } from '../lib/constants'

interface SocialSharingPanelProps {
  prediction?: PredictionRecord
  result?: DrawResult
  predictions?: PredictionRecord[]
  className?: string
}

export function SocialSharingPanel({ 
  prediction, 
  result, 
  predictions = [],
  className 
}: SocialSharingPanelProps) {
  const [activeTab, setActiveTab] = useState('share')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const {
    sharePrediction,
    shareResult,
    shareOnPlatform,
    sharedContent,
    isSharing,
    error
  } = useSocialSharing()

  const { quickSharePrediction, quickShareResult } = useQuickShare()
  const { availablePlatforms } = useSharingPlatforms()

  const canShare = prediction || (result && predictions.length > 0)

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Share2" critical size={20} />
            Partage Social
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canShare ? (
            <div className="text-center py-8">
              <OptimizedIcon name="Share2" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Rien à partager</h3>
              <p className="text-muted-foreground">
                Générez une prédiction ou consultez des résultats pour pouvoir les partager.
              </p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="share">Partager</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
              </TabsList>

              <TabsContent value="share" className="space-y-4">
                <QuickShareSection
                  prediction={prediction}
                  result={result}
                  predictions={predictions}
                  platforms={availablePlatforms}
                  onQuickShare={prediction ? quickSharePrediction : quickShareResult}
                  isSharing={isSharing}
                />
                
                <div className="flex justify-center">
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <AccessibleButton variant="outline">
                        <OptimizedIcon name="Settings" critical size={16} className="mr-2" />
                        Options avancées
                      </AccessibleButton>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Options de partage avancées</DialogTitle>
                      </DialogHeader>
                      <AdvancedShareForm
                        prediction={prediction}
                        result={result}
                        predictions={predictions}
                        onShare={prediction ? sharePrediction : shareResult}
                        onClose={() => setIsDialogOpen(false)}
                        isSharing={isSharing}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <ShareHistorySection content={sharedContent} />
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <ShareStatsSection />
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <OptimizedIcon name="AlertCircle" critical size={16} />
                <span className="text-sm font-medium">Erreur de partage</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Section de partage rapide
function QuickShareSection({ 
  prediction, 
  result, 
  predictions, 
  platforms, 
  onQuickShare, 
  isSharing 
}: {
  prediction?: PredictionRecord
  result?: DrawResult
  predictions: PredictionRecord[]
  platforms: any[]
  onQuickShare: any
  isSharing: boolean
}) {
  const handleQuickShare = async (platformId: string) => {
    if (prediction) {
      await onQuickShare(prediction, platformId)
    } else if (result) {
      await onQuickShare(result, predictions, platformId)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Partage rapide</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.slice(0, 8).map((platform) => (
          <AccessibleButton
            key={platform.id}
            onClick={() => handleQuickShare(platform.id)}
            disabled={isSharing}
            variant="outline"
            className="flex flex-col items-center gap-2 h-20"
            style={{ borderColor: platform.color }}
          >
            <span className="text-2xl">{platform.icon}</span>
            <span className="text-xs">{platform.name}</span>
          </AccessibleButton>
        ))}
      </div>
    </div>
  )
}

// Formulaire de partage avancé
function AdvancedShareForm({ 
  prediction, 
  result, 
  predictions, 
  onShare, 
  onClose, 
  isSharing 
}: {
  prediction?: PredictionRecord
  result?: DrawResult
  predictions: PredictionRecord[]
  onShare: any
  onClose: () => void
  isSharing: boolean
}) {
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public')
  const [tags, setTags] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [includeImage, setIncludeImage] = useState(true)
  const [customMessage, setCustomMessage] = useState('')

  const { availablePlatforms } = useSharingPlatforms()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const options = {
      privacy,
      customTitle: customTitle || undefined,
      customDescription: customDescription || undefined,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
      platform: selectedPlatform || undefined
    }

    let success = false
    if (prediction) {
      const content = await onShare(prediction, options)
      success = !!content
    } else if (result) {
      const content = await onShare(result, predictions, options)
      success = !!content
    }

    if (success) {
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Titre personnalisé</label>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={prediction ? `Prédiction ${prediction.drawName}` : `Résultats ${result?.draw_name}`}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Confidentialité</label>
          <Select value={privacy} onValueChange={(value: any) => setPrivacy(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="friends">Amis uniquement</SelectItem>
              <SelectItem value="private">Privé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Description personnalisée</label>
        <Textarea
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          placeholder="Ajoutez une description personnalisée..."
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Tags (séparés par des virgules)</label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="loterie, prédiction, analyse"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Plateforme de partage</label>
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une plateforme (optionnel)" />
          </SelectTrigger>
          <SelectContent>
            {availablePlatforms.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.icon} {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={includeImage}
            onCheckedChange={setIncludeImage}
          />
          <label className="text-sm font-medium">Inclure une image</label>
        </div>
      </div>

      {selectedPlatform && (
        <div>
          <label className="text-sm font-medium mb-2 block">Message personnalisé</label>
          <Textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Message personnalisé pour le partage..."
            rows={2}
          />
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <AccessibleButton
          type="button"
          onClick={onClose}
          variant="outline"
          disabled={isSharing}
        >
          Annuler
        </AccessibleButton>
        <AccessibleButton
          type="submit"
          disabled={isSharing}
        >
          {isSharing ? 'Partage...' : 'Partager'}
        </AccessibleButton>
      </div>
    </form>
  )
}

// Section historique des partages
function ShareHistorySection({ content }: { content: ShareableContent[] }) {
  const { deleteContent, copyShareLink } = useSocialSharing()

  if (content.length === 0) {
    return (
      <div className="text-center py-8">
        <OptimizedIcon name="History" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Aucun partage</h3>
        <p className="text-muted-foreground">
          Vos partages apparaîtront ici.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Historique des partages ({content.length})</h3>
      {content.map((item) => (
        <ShareHistoryItem
          key={item.id}
          content={item}
          onDelete={() => deleteContent(item.id)}
          onCopyLink={() => copyShareLink(item)}
        />
      ))}
    </div>
  )
}

// Élément d'historique de partage
function ShareHistoryItem({ 
  content, 
  onDelete, 
  onCopyLink 
}: { 
  content: ShareableContent
  onDelete: () => void
  onCopyLink: () => void
}) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'prediction': return 'Target'
      case 'result': return 'Trophy'
      case 'trend': return 'TrendingUp'
      case 'achievement': return 'Award'
      default: return 'Share2'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'prediction': return 'text-blue-600'
      case 'result': return 'text-green-600'
      case 'trend': return 'text-orange-600'
      case 'achievement': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <OptimizedIcon 
            name={getTypeIcon(content.type)} 
            category="interface" 
            size={20} 
            className={getTypeColor(content.type)}
          />
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm mb-1">{content.title}</h4>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {content.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{new Date(content.metadata.timestamp).toLocaleDateString('fr-FR')}</span>
              <span>{content.stats.views} vues</span>
              <span>{content.stats.likes} likes</span>
              <span>{content.stats.shares} partages</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge variant={content.privacy === 'public' ? 'default' : 'secondary'}>
              {content.privacy}
            </Badge>
            
            <AccessibleButton
              onClick={onCopyLink}
              variant="ghost"
              size="sm"
              ariaLabel="Copier le lien"
            >
              <OptimizedIcon name="Copy" critical size={14} />
            </AccessibleButton>
            
            <AccessibleButton
              onClick={onDelete}
              variant="ghost"
              size="sm"
              ariaLabel="Supprimer"
            >
              <OptimizedIcon name="Trash2" size={14} className="text-red-500" />
            </AccessibleButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Section statistiques de partage
function ShareStatsSection() {
  const stats = useSharingStats()

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Statistiques de partage</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalShares}</div>
            <div className="text-sm text-muted-foreground">Partages totaux</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalViews}</div>
            <div className="text-sm text-muted-foreground">Vues totales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalLikes}</div>
            <div className="text-sm text-muted-foreground">Likes totaux</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.averageEngagement.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Engagement moyen</div>
          </CardContent>
        </Card>
      </div>

      {stats.mostPopular?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contenu le plus populaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <OptimizedIcon name="Trophy" critical size={20} className="text-yellow-600" />
              <div>
                <h4 className="font-medium text-sm">{stats.mostPopular.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {stats.mostPopular.stats.views} vues • {stats.mostPopular.stats.likes} likes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
