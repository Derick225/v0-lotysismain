"use client"

import React from 'react'
import * as LucideIcons from 'lucide-react'
import * as HeroIcons from '@heroicons/react/24/outline'
import * as HeroIconsSolid from '@heroicons/react/24/solid'
import * as TablerIcons from '@tabler/icons-react'
import { IconType } from 'react-icons'
import * as Fa from 'react-icons/fa6'
import * as Io from 'react-icons/io5'
import * as Md from 'react-icons/md'
import * as Gi from 'react-icons/gi'
import * as Bs from 'react-icons/bs'
import * as Ai from 'react-icons/ai'
import * as Fi from 'react-icons/fi'
import * as Bi from 'react-icons/bi'
import * as Ti from 'react-icons/ti'
import * as Si from 'react-icons/si'
import * as Ci from 'react-icons/ci'
import * as Ri from 'react-icons/ri'
import * as Wi from 'react-icons/wi'
import * as Hi from 'react-icons/hi2'
import * as Pi from 'react-icons/pi'
import * as Gr from 'react-icons/gr'
import * as Vsc from 'react-icons/vsc'
import * as Im from 'react-icons/im'
import * as Cg from 'react-icons/cg'
import * as Tb from 'react-icons/tb'
import * as Sl from 'react-icons/sl'
import * as Fc from 'react-icons/fc'

// Types d'icônes supportées
export type IconLibrary = 
  | 'lucide' 
  | 'heroicons' 
  | 'heroicons-solid' 
  | 'tabler' 
  | 'fa' 
  | 'io' 
  | 'md' 
  | 'gi' 
  | 'bs' 
  | 'ai' 
  | 'fi' 
  | 'bi' 
  | 'ti' 
  | 'si' 
  | 'ci' 
  | 'ri' 
  | 'wi' 
  | 'hi' 
  | 'pi' 
  | 'gr' 
  | 'vsc' 
  | 'im' 
  | 'cg' 
  | 'tb' 
  | 'sl' 
  | 'fc'

// Propriétés de l'icône
export interface IconProps {
  name: string
  library?: IconLibrary
  size?: number | string
  color?: string
  className?: string
  strokeWidth?: number
  onClick?: () => void
  style?: React.CSSProperties
  title?: string
  'aria-label'?: string
  'aria-hidden'?: boolean
  role?: string
  focusable?: boolean
}

// Composant Icon
export const Icon: React.FC<IconProps> = ({
  name,
  library = 'lucide',
  size = 24,
  color,
  className = '',
  strokeWidth = 2,
  onClick,
  style = {},
  title,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = false,
  role = 'img',
  focusable = false,
  ...props
}) => {
  // Styles communs
  const commonProps = {
    size: typeof size === 'number' ? size : parseInt(size, 10) || 24,
    color,
    className,
    onClick,
    style,
    'aria-label': ariaLabel || title || name,
    'aria-hidden': ariaHidden,
    role,
    focusable,
    ...props
  }

  // Styles spécifiques pour Lucide
  const lucideProps = {
    ...commonProps,
    strokeWidth,
  }

  // Fonction pour obtenir l'icône depuis react-icons
  const getReactIcon = (iconSet: Record<string, IconType>, iconName: string) => {
    const Icon = iconSet[iconName]
    return Icon ? <Icon {...commonProps} /> : null
  }

  try {
    // Sélection de la bibliothèque d'icônes
    switch (library) {
      case 'lucide':
        const LucideIcon = LucideIcons[name as keyof typeof LucideIcons]
        return LucideIcon ? <LucideIcon {...lucideProps} /> : null

      case 'heroicons':
        const HeroIcon = HeroIcons[name as keyof typeof HeroIcons]
        return HeroIcon ? <HeroIcon {...commonProps} /> : null

      case 'heroicons-solid':
        const HeroIconSolid = HeroIconsSolid[name as keyof typeof HeroIconsSolid]
        return HeroIconSolid ? <HeroIconSolid {...commonProps} /> : null

      case 'tabler':
        const TablerIcon = TablerIcons[name as keyof typeof TablerIcons]
        return TablerIcon ? <TablerIcon {...commonProps} /> : null

      case 'fa':
        return getReactIcon(Fa, name)
      case 'io':
        return getReactIcon(Io, name)
      case 'md':
        return getReactIcon(Md, name)
      case 'gi':
        return getReactIcon(Gi, name)
      case 'bs':
        return getReactIcon(Bs, name)
      case 'ai':
        return getReactIcon(Ai, name)
      case 'fi':
        return getReactIcon(Fi, name)
      case 'bi':
        return getReactIcon(Bi, name)
      case 'ti':
        return getReactIcon(Ti, name)
      case 'si':
        return getReactIcon(Si, name)
      case 'ci':
        return getReactIcon(Ci, name)
      case 'ri':
        return getReactIcon(Ri, name)
      case 'wi':
        return getReactIcon(Wi, name)
      case 'hi':
        return getReactIcon(Hi, name)
      case 'pi':
        return getReactIcon(Pi, name)
      case 'gr':
        return getReactIcon(Gr, name)
      case 'vsc':
        return getReactIcon(Vsc, name)
      case 'im':
        return getReactIcon(Im, name)
      case 'cg':
        return getReactIcon(Cg, name)
      case 'tb':
        return getReactIcon(Tb, name)
      case 'sl':
        return getReactIcon(Sl, name)
      case 'fc':
        return getReactIcon(Fc, name)

      default:
        return null
    }
  } catch (error) {
    console.error(`Erreur lors du chargement de l'icône ${name} depuis la bibliothèque ${library}:`, error)
    return null
  }
}

// Icônes spécifiques à l'application Lotysis
export const AppIcons = {
  // Navigation
  home: { name: 'Home', library: 'lucide' as IconLibrary },
  results: { name: 'ListChecks', library: 'lucide' as IconLibrary },
  statistics: { name: 'BarChart3', library: 'lucide' as IconLibrary },
  predictions: { name: 'Sparkles', library: 'lucide' as IconLibrary },
  profile: { name: 'User', library: 'lucide' as IconLibrary },
  settings: { name: 'Settings', library: 'lucide' as IconLibrary },
  admin: { name: 'ShieldAlert', library: 'lucide' as IconLibrary },
  
  // Actions
  add: { name: 'Plus', library: 'lucide' as IconLibrary },
  edit: { name: 'Pencil', library: 'lucide' as IconLibrary },
  delete: { name: 'Trash2', library: 'lucide' as IconLibrary },
  save: { name: 'Save', library: 'lucide' as IconLibrary },
  cancel: { name: 'X', library: 'lucide' as IconLibrary },
  search: { name: 'Search', library: 'lucide' as IconLibrary },
  filter: { name: 'Filter', library: 'lucide' as IconLibrary },
  refresh: { name: 'RefreshCw', library: 'lucide' as IconLibrary },
  download: { name: 'Download', library: 'lucide' as IconLibrary },
  upload: { name: 'Upload', library: 'lucide' as IconLibrary },
  
  // Notifications
  success: { name: 'CheckCircle', library: 'lucide' as IconLibrary },
  error: { name: 'XCircle', library: 'lucide' as IconLibrary },
  warning: { name: 'AlertTriangle', library: 'lucide' as IconLibrary },
  info: { name: 'Info', library: 'lucide' as IconLibrary },
  
  // Lottery
  ticket: { name: 'Ticket', library: 'lucide' as IconLibrary },
  draw: { name: 'Dices', library: 'tabler' as IconLibrary },
  jackpot: { name: 'Trophy', library: 'lucide' as IconLibrary },
  numbers: { name: 'Hash', library: 'lucide' as IconLibrary },
  calendar: { name: 'Calendar', library: 'lucide' as IconLibrary },
  
  // ML/AI
  brain: { name: 'Brain', library: 'lucide' as IconLibrary },
  model: { name: 'Network', library: 'lucide' as IconLibrary },
  prediction: { name: 'LineChart', library: 'lucide' as IconLibrary },
  algorithm: { name: 'GitBranch', library: 'lucide' as IconLibrary },
  
  // Utilisateurs
  user: { name: 'User', library: 'lucide' as IconLibrary },
  users: { name: 'Users', library: 'lucide' as IconLibrary },
  userPlus: { name: 'UserPlus', library: 'lucide' as IconLibrary },
  userMinus: { name: 'UserMinus', library: 'lucide' as IconLibrary },
  userCheck: { name: 'UserCheck', library: 'lucide' as IconLibrary },
  userX: { name: 'UserX', library: 'lucide' as IconLibrary },
  
  // Sécurité
  lock: { name: 'Lock', library: 'lucide' as IconLibrary },
  unlock: { name: 'Unlock', library: 'lucide' as IconLibrary },
  shield: { name: 'Shield', library: 'lucide' as IconLibrary },
  key: { name: 'Key', library: 'lucide' as IconLibrary },
  
  // Système
  database: { name: 'Database', library: 'lucide' as IconLibrary },
  server: { name: 'Server', library: 'lucide' as IconLibrary },
  cloud: { name: 'Cloud', library: 'lucide' as IconLibrary },
  api: { name: 'Webhook', library: 'lucide' as IconLibrary },
  code: { name: 'Code', library: 'lucide' as IconLibrary },
  
  // Médias sociaux
  facebook: { name: 'FaFacebook', library: 'fa' as IconLibrary },
  twitter: { name: 'FaTwitter', library: 'fa' as IconLibrary },
  instagram: { name: 'FaInstagram', library: 'fa' as IconLibrary },
  youtube: { name: 'FaYoutube', library: 'fa' as IconLibrary },
  whatsapp: { name: 'FaWhatsapp', library: 'fa' as IconLibrary },
  
  // Divers
  help: { name: 'HelpCircle', library: 'lucide' as IconLibrary },
  link: { name: 'Link', library: 'lucide' as IconLibrary },
  external: { name: 'ExternalLink', library: 'lucide' as IconLibrary },
  menu: { name: 'Menu', library: 'lucide' as IconLibrary },
  more: { name: 'MoreHorizontal', library: 'lucide' as IconLibrary },
  close: { name: 'X', library: 'lucide' as IconLibrary },
  check: { name: 'Check', library: 'lucide' as IconLibrary },
  star: { name: 'Star', library: 'lucide' as IconLibrary },
  heart: { name: 'Heart', library: 'lucide' as IconLibrary },
  share: { name: 'Share2', library: 'lucide' as IconLibrary },
  print: { name: 'Printer', library: 'lucide' as IconLibrary },
  mail: { name: 'Mail', library: 'lucide' as IconLibrary },
  phone: { name: 'Phone', library: 'lucide' as IconLibrary },
  location: { name: 'MapPin', library: 'lucide' as IconLibrary },
}

// Composant AppIcon pour utiliser les icônes prédéfinies de l'application
export interface AppIconProps extends Omit<IconProps, 'name' | 'library'> {
  name: keyof typeof AppIcons
}

export const AppIcon: React.FC<AppIconProps> = ({ name, ...props }) => {
  const iconConfig = AppIcons[name]
  if (!iconConfig) return null
  
  return <Icon name={iconConfig.name} library={iconConfig.library} {...props} />
}

export default Icon
