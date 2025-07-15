'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAccessibility } from '../hooks/use-accessibility'
import { AccessibleButton, AccessibleModal, LiveRegion } from './ui/accessible-components'
import { OptimizedIcon } from './ui/optimized-icons'

interface AccessibilityPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function AccessibilityPanel({ isOpen, onClose }: AccessibilityPanelProps) {
  const {
    settings,
    updateSetting,
    getAccessibilityScore,
    checkContrast,
    announceToScreenReader
  } = useAccessibility()

  const [contrastTest, setContrastTest] = useState({
    foreground: '#000000',
    background: '#ffffff'
  })

  const accessibilityScore = getAccessibilityScore()
  const contrastResult = checkContrast(contrastTest.foreground, contrastTest.background)

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    updateSetting(key, value)
    announceToScreenReader(`${key} ${value ? 'activé' : 'désactivé'}`)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Bon'
    if (score >= 50) return 'Moyen'
    return 'À améliorer'
  }

  return (
    <>
      <AccessibleModal
        isOpen={isOpen}
        onClose={onClose}
        title="Paramètres d'Accessibilité"
        description="Configurez les options d'accessibilité selon vos besoins"
        size="lg"
      >
        <div className="space-y-6">
          {/* Score d'accessibilité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Shield" category="security" size={20} />
                Score d'Accessibilité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className={`text-3xl font-bold ${getScoreColor(accessibilityScore)}`}>
                    {accessibilityScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getScoreLabel(accessibilityScore)}
                  </div>
                </div>
                <Badge 
                  variant={accessibilityScore >= 90 ? "default" : accessibilityScore >= 70 ? "secondary" : "destructive"}
                >
                  {getScoreLabel(accessibilityScore)}
                </Badge>
              </div>
              <Progress value={accessibilityScore} className="h-2" />
            </CardContent>
          </Card>

          {/* Paramètres visuels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Eye" category="security" size={20} />
                Paramètres Visuels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="high-contrast" className="font-medium">
                    Contraste élevé
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Améliore la lisibilité avec des couleurs contrastées
                  </p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="large-text" className="font-medium">
                    Texte large
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Augmente la taille du texte pour une meilleure lisibilité
                  </p>
                </div>
                <Switch
                  id="large-text"
                  checked={settings.largeText}
                  onCheckedChange={(checked) => handleSettingChange('largeText', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="reduced-motion" className="font-medium">
                    Mouvement réduit
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Réduit les animations et transitions
                  </p>
                </div>
                <Switch
                  id="reduced-motion"
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="focus-visible" className="font-medium">
                    Focus visible
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Améliore la visibilité du focus clavier
                  </p>
                </div>
                <Switch
                  id="focus-visible"
                  checked={settings.focusVisible}
                  onCheckedChange={(checked) => handleSettingChange('focusVisible', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Paramètres de navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Navigation" category="navigation" size={20} />
                Navigation et Interaction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="keyboard-navigation" className="font-medium">
                    Navigation clavier
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Active les raccourcis clavier pour la navigation
                  </p>
                </div>
                <Switch
                  id="keyboard-navigation"
                  checked={settings.keyboardNavigation}
                  onCheckedChange={(checked) => handleSettingChange('keyboardNavigation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="screen-reader-mode" className="font-medium">
                    Mode lecteur d'écran
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Optimise l'interface pour les lecteurs d'écran
                  </p>
                </div>
                <Switch
                  id="screen-reader-mode"
                  checked={settings.screenReaderMode}
                  onCheckedChange={(checked) => handleSettingChange('screenReaderMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="announcements" className="font-medium">
                    Annonces vocales
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Active les annonces pour les lecteurs d'écran
                  </p>
                </div>
                <Switch
                  id="announcements"
                  checked={settings.announcements}
                  onCheckedChange={(checked) => handleSettingChange('announcements', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Test de contraste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Palette" category="theme" size={20} />
                Test de Contraste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="foreground-color" className="block text-sm font-medium mb-2">
                    Couleur du texte
                  </label>
                  <input
                    id="foreground-color"
                    type="color"
                    value={contrastTest.foreground}
                    onChange={(e) => setContrastTest(prev => ({ ...prev, foreground: e.target.value }))}
                    className="w-full h-10 rounded border"
                  />
                </div>
                <div>
                  <label htmlFor="background-color" className="block text-sm font-medium mb-2">
                    Couleur de fond
                  </label>
                  <input
                    id="background-color"
                    type="color"
                    value={contrastTest.background}
                    onChange={(e) => setContrastTest(prev => ({ ...prev, background: e.target.value }))}
                    className="w-full h-10 rounded border"
                  />
                </div>
              </div>

              <div className="p-4 rounded border" style={{
                color: contrastTest.foreground,
                backgroundColor: contrastTest.background
              }}>
                <p className="font-medium">Exemple de texte</p>
                <p className="text-sm">Ceci est un exemple de texte avec les couleurs sélectionnées.</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    Ratio de contraste: {contrastResult.ratio.toFixed(2)}:1
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Niveau: {contrastResult.level === 'AAA' ? 'AAA (Excellent)' : 
                             contrastResult.level === 'AA' ? 'AA (Bon)' : 'Échec'}
                  </div>
                </div>
                <Badge variant={
                  contrastResult.level === 'AAA' ? 'default' :
                  contrastResult.level === 'AA' ? 'secondary' : 'destructive'
                }>
                  {contrastResult.level}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Raccourcis clavier */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Key" category="security" size={20} />
                Raccourcis Clavier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Navigation entre régions</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">F6</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Titre suivant</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt + H</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Région suivante</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt + R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Lien suivant</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt + L</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Bouton suivant</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Alt + B</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Fermer modal</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Échap</kbd>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <AccessibleButton
              variant="outline"
              onClick={onClose}
              ariaLabel="Fermer le panneau d'accessibilité"
            >
              Fermer
            </AccessibleButton>
            <AccessibleButton
              onClick={() => {
                // Réinitialiser aux valeurs par défaut
                Object.keys(settings).forEach(key => {
                  updateSetting(key as keyof typeof settings, false)
                })
                announceToScreenReader('Paramètres d\'accessibilité réinitialisés')
              }}
              variant="secondary"
              ariaLabel="Réinitialiser tous les paramètres d'accessibilité"
            >
              Réinitialiser
            </AccessibleButton>
          </div>
        </div>
      </AccessibleModal>

      {/* Région live pour les annonces */}
      <LiveRegion />
    </>
  )
}

// Bouton flottant pour ouvrir le panneau d'accessibilité
export function AccessibilityToggle() {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <>
      <AccessibleButton
        onClick={() => setIsPanelOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full w-12 h-12 shadow-lg"
        ariaLabel="Ouvrir les paramètres d'accessibilité"
        icon="Settings"
        size="icon"
        announceOnClick="Ouverture du panneau d'accessibilité"
      />

      <AccessibilityPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  )
}
