'use client'

import { lazy, Suspense, ComponentType, memo } from 'react'
import type { LucideProps } from 'lucide-react'

// Icônes critiques chargées immédiatement (utilisées dans le layout principal)
import {
  Home,
  User,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Brain,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock
} from 'lucide-react'

// Cache pour les icônes lazy
const iconCache = new Map<string, ComponentType<LucideProps>>()

// Fonction pour créer des icônes lazy avec cache
const createLazyIcon = (iconName: string): ComponentType<LucideProps> => {
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!
  }

  const LazyIcon = lazy(async () => {
    try {
      const module = await import('lucide-react')
      const IconComponent = (module as any)[iconName]
      
      if (!IconComponent) {
        console.warn(`Icône '${iconName}' non trouvée dans lucide-react`)
        return { default: AlertCircle } // Fallback
      }
      
      return { default: IconComponent }
    } catch (error) {
      console.error(`Erreur chargement icône '${iconName}':`, error)
      return { default: AlertCircle } // Fallback
    }
  })

  // Mémoriser le composant lazy
  const MemoizedLazyIcon = memo(LazyIcon)
  iconCache.set(iconName, MemoizedLazyIcon)
  
  return MemoizedLazyIcon
}

// Composant de fallback pour les icônes en cours de chargement
const IconFallback = memo(({ size = 24 }: { size?: number }) => (
  <div 
    className="inline-block animate-pulse bg-muted rounded"
    style={{ width: size, height: size }}
    aria-hidden="true"
  />
))
IconFallback.displayName = 'IconFallback'

// Icônes critiques (chargées immédiatement)
export const CriticalIcons = {
  Home,
  User,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  Refresh: RefreshCw,
  Loader: Loader2,
  AlertCircle,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Brain,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock
}

// Icônes lazy par catégorie pour une meilleure organisation
export const LazyIcons = {
  // Actions et édition
  actions: {
    Plus: createLazyIcon('Plus'),
    Minus: createLazyIcon('Minus'),
    Edit: createLazyIcon('Edit'),
    Trash2: createLazyIcon('Trash2'),
    Save: createLazyIcon('Save'),
    Download: createLazyIcon('Download'),
    Upload: createLazyIcon('Upload'),
    Share: createLazyIcon('Share'),
    Copy: createLazyIcon('Copy'),
    Cut: createLazyIcon('Scissors'),
    Paste: createLazyIcon('Clipboard')
  },

  // Navigation et mouvement
  navigation: {
    ArrowUp: createLazyIcon('ArrowUp'),
    ArrowDown: createLazyIcon('ArrowDown'),
    ArrowLeft: createLazyIcon('ArrowLeft'),
    ArrowRight: createLazyIcon('ArrowRight'),
    RotateCcw: createLazyIcon('RotateCcw'),
    RotateCw: createLazyIcon('RotateCw'),
    ExternalLink: createLazyIcon('ExternalLink'),
    Link: createLazyIcon('Link')
  },

  // États et sécurité
  security: {
    Eye: createLazyIcon('Eye'),
    EyeOff: createLazyIcon('EyeOff'),
    Lock: createLazyIcon('Lock'),
    Unlock: createLazyIcon('Unlock'),
    Shield: createLazyIcon('Shield'),
    Key: createLazyIcon('Key')
  },

  // Communication
  communication: {
    Mail: createLazyIcon('Mail'),
    Phone: createLazyIcon('Phone'),
    MessageCircle: createLazyIcon('MessageCircle'),
    Send: createLazyIcon('Send')
  },

  // Fichiers et médias
  files: {
    File: createLazyIcon('File'),
    Folder: createLazyIcon('Folder'),
    Image: createLazyIcon('Image'),
    Video: createLazyIcon('Video'),
    Music: createLazyIcon('Music'),
    FileText: createLazyIcon('FileText')
  },

  // Interface et layout
  interface: {
    Grid: createLazyIcon('Grid3X3'),
    List: createLazyIcon('List'),
    Filter: createLazyIcon('Filter'),
    Sort: createLazyIcon('ArrowUpDown'),
    Maximize: createLazyIcon('Maximize'),
    Minimize: createLazyIcon('Minimize'),
    MoreHorizontal: createLazyIcon('MoreHorizontal'),
    MoreVertical: createLazyIcon('MoreVertical')
  },

  // Système et connectivité
  system: {
    Wifi: createLazyIcon('Wifi'),
    WifiOff: createLazyIcon('WifiOff'),
    Battery: createLazyIcon('Battery'),
    Zap: createLazyIcon('Zap'),
    Power: createLazyIcon('Power'),
    Cpu: createLazyIcon('Cpu'),
    HardDrive: createLazyIcon('HardDrive')
  },

  // Médias et contrôles
  media: {
    Play: createLazyIcon('Play'),
    Pause: createLazyIcon('Pause'),
    Stop: createLazyIcon('Square'),
    SkipBack: createLazyIcon('SkipBack'),
    SkipForward: createLazyIcon('SkipForward'),
    Volume2: createLazyIcon('Volume2'),
    VolumeX: createLazyIcon('VolumeX')
  },

  // Favoris et social
  social: {
    Star: createLazyIcon('Star'),
    Heart: createLazyIcon('Heart'),
    Bookmark: createLazyIcon('Bookmark'),
    Flag: createLazyIcon('Flag'),
    Tag: createLazyIcon('Tag'),
    Users: createLazyIcon('Users'),
    UserPlus: createLazyIcon('UserPlus')
  },

  // Thème et apparence
  theme: {
    Sun: createLazyIcon('Sun'),
    Moon: createLazyIcon('Moon'),
    Palette: createLazyIcon('Palette'),
    Contrast: createLazyIcon('Circle')
  },

  // Statistiques et données (spécifique à Lotysis)
  analytics: {
    Target: createLazyIcon('Target'),
    Lightbulb: createLazyIcon('Lightbulb'),
    Activity: createLazyIcon('Activity'),
    PieChart: createLazyIcon('PieChart'),
    LineChart: createLazyIcon('TrendingUp'),
    Database: createLazyIcon('Database'),
    Calculator: createLazyIcon('Calculator')
  },

  // Prédictions et IA (spécifique à Lotysis)
  predictions: {
    Sparkles: createLazyIcon('Sparkles'),
    Wand2: createLazyIcon('Wand2'),
    Atom: createLazyIcon('Atom'),
    Cpu: createLazyIcon('Cpu'),
    Network: createLazyIcon('Network'),
    GitBranch: createLazyIcon('GitBranch')
  }
}

// Composant optimisé pour les icônes avec lazy loading
interface OptimizedIconProps extends LucideProps {
  name: string
  category?: keyof typeof LazyIcons
  fallback?: ComponentType<LucideProps>
  critical?: boolean
}

export const OptimizedIcon = memo(({ 
  name, 
  category, 
  fallback, 
  critical = false,
  size = 24,
  ...props 
}: OptimizedIconProps) => {
  // Si c'est une icône critique, la charger immédiatement
  if (critical && name in CriticalIcons) {
    const IconComponent = CriticalIcons[name as keyof typeof CriticalIcons]
    return <IconComponent size={size} {...props} />
  }

  // Si une catégorie est spécifiée, chercher dans cette catégorie
  if (category && LazyIcons[category] && name in LazyIcons[category]) {
    const IconComponent = LazyIcons[category][name as keyof typeof LazyIcons[typeof category]]
    return (
      <Suspense fallback={<IconFallback size={size} />}>
        <IconComponent size={size} {...props} />
      </Suspense>
    )
  }

  // Chercher dans toutes les catégories
  for (const cat of Object.values(LazyIcons)) {
    if (name in cat) {
      const IconComponent = cat[name as keyof typeof cat]
      return (
        <Suspense fallback={<IconFallback size={size} />}>
          <IconComponent size={size} {...props} />
        </Suspense>
      )
    }
  }

  // Fallback si l'icône n'est pas trouvée
  const FallbackIcon = fallback || AlertCircle
  return <FallbackIcon size={size} {...props} />
})

// Hook pour précharger des icônes
export function usePreloadIcons(iconNames: string[], category?: keyof typeof LazyIcons) {
  const preloadIcon = (name: string, cat?: keyof typeof LazyIcons) => {
    if (cat && LazyIcons[cat] && name in LazyIcons[cat]) {
      // L'icône sera chargée lors du premier rendu
      return LazyIcons[cat][name as keyof typeof LazyIcons[typeof cat]]
    }
    
    // Chercher dans toutes les catégories
    for (const category of Object.values(LazyIcons)) {
      if (name in category) {
        return category[name as keyof typeof category]
      }
    }
    
    return null
  }

  return {
    preload: () => {
      iconNames.forEach(name => preloadIcon(name, category))
    }
  }
}

// Utilitaire pour obtenir la taille du bundle des icônes
export function getIconBundleInfo() {
  const criticalCount = Object.keys(CriticalIcons).length
  const lazyCount = Object.values(LazyIcons).reduce((total, category) => {
    return total + Object.keys(category).length
  }, 0)
  
  return {
    critical: criticalCount,
    lazy: lazyCount,
    total: criticalCount + lazyCount,
    categories: Object.keys(LazyIcons).length
  }
}
