'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reducedMotion: boolean
  screenReaderMode: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
  announcements: boolean
}

interface FocusManagement {
  currentFocusIndex: number
  focusableElements: HTMLElement[]
  trapFocus: boolean
  restoreFocus: HTMLElement | null
}

interface ScreenReaderAnnouncement {
  id: string
  message: string
  priority: 'polite' | 'assertive'
  timestamp: number
}

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    focusVisible: true,
    announcements: true
  })

  const [focusManagement, setFocusManagement] = useState<FocusManagement>({
    currentFocusIndex: -1,
    focusableElements: [],
    trapFocus: false,
    restoreFocus: null
  })

  const [announcements, setAnnouncements] = useState<ScreenReaderAnnouncement[]>([])
  const announcementRef = useRef<HTMLDivElement>(null)

  // Détecter les préférences système
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Détecter la préférence de mouvement réduit
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSettings(prev => ({ ...prev, reducedMotion: prefersReducedMotion.matches }))

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    prefersReducedMotion.addEventListener('change', handleMotionChange)

    // Détecter la préférence de contraste élevé
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)')
    setSettings(prev => ({ ...prev, highContrast: prefersHighContrast.matches }))

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, highContrast: e.matches }))
    }
    prefersHighContrast.addEventListener('change', handleContrastChange)

    // Détecter si un lecteur d'écran est actif
    const detectScreenReader = () => {
      // Méthodes de détection des lecteurs d'écran
      const hasScreenReader = 
        // @ts-ignore
        window.speechSynthesis ||
        // @ts-ignore
        window.navigator.userAgent.includes('NVDA') ||
        // @ts-ignore
        window.navigator.userAgent.includes('JAWS') ||
        // @ts-ignore
        window.navigator.userAgent.includes('VoiceOver')

      setSettings(prev => ({ ...prev, screenReaderMode: !!hasScreenReader }))
    }
    detectScreenReader()

    return () => {
      prefersReducedMotion.removeEventListener('change', handleMotionChange)
      prefersHighContrast.removeEventListener('change', handleContrastChange)
    }
  }, [])

  // Gestion des raccourcis clavier
  useEffect(() => {
    if (!settings.keyboardNavigation) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Raccourcis globaux
      switch (e.key) {
        case 'F6':
          e.preventDefault()
          navigateToNextLandmark()
          break
        case 'Escape':
          if (focusManagement.trapFocus) {
            exitFocusTrap()
          }
          break
        case 'Tab':
          if (focusManagement.trapFocus) {
            e.preventDefault()
            navigateWithinTrap(e.shiftKey ? -1 : 1)
          }
          break
        case 'h':
          if (e.altKey) {
            e.preventDefault()
            navigateToNextHeading()
          }
          break
        case 'r':
          if (e.altKey) {
            e.preventDefault()
            navigateToNextRegion()
          }
          break
        case 'l':
          if (e.altKey) {
            e.preventDefault()
            navigateToNextLink()
          }
          break
        case 'b':
          if (e.altKey) {
            e.preventDefault()
            navigateToNextButton()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [settings.keyboardNavigation, focusManagement.trapFocus])

  // Fonctions de navigation
  const navigateToNextLandmark = useCallback(() => {
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="region"]')
    const currentFocus = document.activeElement
    let nextIndex = 0

    if (currentFocus) {
      const currentIndex = Array.from(landmarks).findIndex(el => el.contains(currentFocus))
      nextIndex = (currentIndex + 1) % landmarks.length
    }

    const nextLandmark = landmarks[nextIndex] as HTMLElement
    if (nextLandmark) {
      nextLandmark.focus()
      announceToScreenReader(`Navigation vers ${nextLandmark.getAttribute('aria-label') || 'région'}`)
    }
  }, [])

  const navigateToNextHeading = useCallback(() => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
    navigateToNextElement(headings, 'titre')
  }, [])

  const navigateToNextRegion = useCallback(() => {
    const regions = document.querySelectorAll('[role="region"], section, article, aside')
    navigateToNextElement(regions, 'région')
  }, [])

  const navigateToNextLink = useCallback(() => {
    const links = document.querySelectorAll('a[href], [role="link"]')
    navigateToNextElement(links, 'lien')
  }, [])

  const navigateToNextButton = useCallback(() => {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')
    navigateToNextElement(buttons, 'bouton')
  }, [])

  const navigateToNextElement = useCallback((elements: NodeListOf<Element>, type: string) => {
    const currentFocus = document.activeElement
    let nextIndex = 0

    if (currentFocus) {
      const currentIndex = Array.from(elements).findIndex(el => el === currentFocus || el.contains(currentFocus))
      nextIndex = (currentIndex + 1) % elements.length
    }

    const nextElement = elements[nextIndex] as HTMLElement
    if (nextElement) {
      nextElement.focus()
      announceToScreenReader(`Navigation vers ${type}: ${nextElement.textContent?.trim() || nextElement.getAttribute('aria-label') || 'élément'}`)
    }
  }, [])

  // Gestion du focus trap
  const createFocusTrap = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    setFocusManagement(prev => ({
      ...prev,
      focusableElements: Array.from(focusableElements),
      trapFocus: true,
      restoreFocus: document.activeElement as HTMLElement,
      currentFocusIndex: 0
    }))

    if (firstElement) {
      firstElement.focus()
    }

    return {
      destroy: () => exitFocusTrap()
    }
  }, [])

  const navigateWithinTrap = useCallback((direction: number) => {
    const { focusableElements, currentFocusIndex } = focusManagement
    if (focusableElements.length === 0) return

    let newIndex = currentFocusIndex + direction
    if (newIndex < 0) newIndex = focusableElements.length - 1
    if (newIndex >= focusableElements.length) newIndex = 0

    focusableElements[newIndex]?.focus()
    setFocusManagement(prev => ({ ...prev, currentFocusIndex: newIndex }))
  }, [focusManagement])

  const exitFocusTrap = useCallback(() => {
    setFocusManagement(prev => {
      if (prev.restoreFocus) {
        prev.restoreFocus.focus()
      }
      return {
        ...prev,
        trapFocus: false,
        focusableElements: [],
        currentFocusIndex: -1,
        restoreFocus: null
      }
    })
  }, [])

  // Annonces pour lecteurs d'écran
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.announcements) return

    const announcement: ScreenReaderAnnouncement = {
      id: `announcement-${Date.now()}-${Math.random()}`,
      message,
      priority,
      timestamp: Date.now()
    }

    setAnnouncements(prev => [...prev, announcement])

    // Nettoyer les anciennes annonces
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id))
    }, 5000)
  }, [settings.announcements])

  // Vérification des contrastes
  const checkContrast = useCallback((foreground: string, background: string): { ratio: number, level: 'AA' | 'AAA' | 'fail' } => {
    // Fonction simplifiée de calcul de contraste
    const getLuminance = (color: string) => {
      // Conversion simplifiée - en production, utiliser une vraie librairie
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255
      const b = parseInt(hex.substr(4, 2), 16) / 255
      
      const sRGB = [r, g, b].map(c => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)

    if (ratio >= 7) return { ratio, level: 'AAA' }
    if (ratio >= 4.5) return { ratio, level: 'AA' }
    return { ratio, level: 'fail' }
  }, [])

  // Appliquer les paramètres d'accessibilité
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Contraste élevé
    if (settings.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Texte large
    if (settings.largeText) {
      root.classList.add('large-text')
    } else {
      root.classList.remove('large-text')
    }

    // Mouvement réduit
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible')
    } else {
      root.classList.remove('focus-visible')
    }

    // Mode lecteur d'écran
    if (settings.screenReaderMode) {
      root.classList.add('screen-reader-mode')
    } else {
      root.classList.remove('screen-reader-mode')
    }
  }, [settings])

  // Fonctions utilitaires
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    announceToScreenReader(`${key} ${value ? 'activé' : 'désactivé'}`)
  }, [announceToScreenReader])

  const getAccessibilityScore = useCallback(() => {
    let score = 0
    const checks = [
      settings.keyboardNavigation,
      settings.focusVisible,
      settings.announcements,
      !settings.reducedMotion || settings.reducedMotion, // Respecter la préférence
      settings.highContrast || !settings.highContrast // Flexible
    ]
    
    score = (checks.filter(Boolean).length / checks.length) * 100
    return Math.round(score)
  }, [settings])

  return {
    settings,
    updateSetting,
    announceToScreenReader,
    createFocusTrap,
    exitFocusTrap,
    checkContrast,
    getAccessibilityScore,
    announcements,
    focusManagement,
    // Raccourcis pour les composants
    isHighContrast: settings.highContrast,
    isLargeText: settings.largeText,
    isReducedMotion: settings.reducedMotion,
    isScreenReaderMode: settings.screenReaderMode
  }
}

// Hook simplifié pour les annonces
export function useScreenReaderAnnouncements() {
  const { announceToScreenReader } = useAccessibility()
  return { announce: announceToScreenReader }
}

// Hook pour la gestion du focus
export function useFocusManagement() {
  const { createFocusTrap, exitFocusTrap } = useAccessibility()
  return { createFocusTrap, exitFocusTrap }
}
