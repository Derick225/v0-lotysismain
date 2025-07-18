'use client'

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OptimizedIcon } from './ui/optimized-icons'
import { getNumberColor, type DrawResult } from '../lib/constants'
import { 
  advancedAnalytics, 
  type NumberTrend, 
  type SequencePattern, 
  type TemporalTrend, 
  type SmartSuggestion 
} from '../lib/advanced-analytics'
import { useAccessibility } from '../hooks/use-accessibility'

interface AdvancedMetricsProps {
  drawName: string
  data: DrawResult[]
}

export function AdvancedMetrics({ drawName, data }: AdvancedMetricsProps) {
  const [activeTab, setActiveTab] = useState('trends')
  const [selectedSuggestion, setSelectedSuggestion] = useState<SmartSuggestion | null>(null)
  const { announceToScreenReader } = useAccessibility()

  // Calcul des métriques avancées
  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null

    const trends = advancedAnalytics.analyzeNumberTrends(data, drawName)
    const patterns = advancedAnalytics.analyzeSequencePatterns(data)
    const temporalTrends = advancedAnalytics.analyzeTemporalTrends(data, drawName)
    const suggestions = advancedAnalytics.generateSmartSuggestions(trends, patterns, temporalTrends)

    return { trends, patterns, temporalTrends, suggestions }
  }, [data, drawName])

  const handleSuggestionSelect = useCallback((suggestion: SmartSuggestion) => {
    setSelectedSuggestion(suggestion)
    announceToScreenReader(`Suggestion sélectionnée: ${suggestion.title}`)
  }, [announceToScreenReader])

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <OptimizedIcon name="Database" category="analytics" size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Données insuffisantes</h3>
          <p className="text-muted-foreground">
            Au moins 10 tirages sont nécessaires pour générer des métriques avancées.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <OptimizedIcon name="TrendingUp" critical size={16} />
            Tendances
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <OptimizedIcon name="Network" category="predictions" size={16} />
            Patterns
          </TabsTrigger>
          <TabsTrigger value="temporal" className="flex items-center gap-2">
            <OptimizedIcon name="Calendar" critical size={16} />
            Temporel
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <OptimizedIcon name="Lightbulb" category="analytics" size={16} />
            Suggestions
          </TabsTrigger>
        </TabsList>

        {/* Onglet Tendances des Numéros */}
        <TabsContent value="trends" className="space-y-4">
          <NumberTrendsView trends={metrics.trends} />
        </TabsContent>

        {/* Onglet Patterns */}
        <TabsContent value="patterns" className="space-y-4">
          <SequencePatternsView patterns={metrics.patterns} />
        </TabsContent>

        {/* Onglet Tendances Temporelles */}
        <TabsContent value="temporal" className="space-y-4">
          <TemporalTrendsView trends={metrics.temporalTrends} />
        </TabsContent>

        {/* Onglet Suggestions */}
        <TabsContent value="suggestions" className="space-y-4">
          <SmartSuggestionsView 
            suggestions={metrics.suggestions}
            onSuggestionSelect={handleSuggestionSelect}
            selectedSuggestion={selectedSuggestion}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Composant pour les tendances des numéros
function NumberTrendsView({ trends }: { trends: NumberTrend[] }) {
  const hotNumbers = trends.filter(t => t.trend === 'hot').slice(0, 10)
  const coldNumbers = trends.filter(t => t.trend === 'cold').slice(0, 10)
  const neutralNumbers = trends.filter(t => t.trend === 'neutral').slice(0, 5)

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Numéros Chauds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <OptimizedIcon name="Flame" size={20} />
            Numéros Chauds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {hotNumbers.map((trend) => (
              <NumberTrendCard key={trend.number} trend={trend} />
            ))}
            {hotNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun numéro chaud détecté
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Numéros Froids */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <OptimizedIcon name="Snowflake" size={20} />
            Numéros Froids
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {coldNumbers.map((trend) => (
              <NumberTrendCard key={trend.number} trend={trend} />
            ))}
            {coldNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun numéro froid détecté
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Numéros Neutres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <OptimizedIcon name="Minus" category="actions" size={20} />
            Numéros Neutres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {neutralNumbers.map((trend) => (
              <NumberTrendCard key={trend.number} trend={trend} />
            ))}
            {neutralNumbers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun numéro neutre
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Composant pour afficher une tendance de numéro
function NumberTrendCard({ trend }: { trend: NumberTrend }) {
  const colorClass = getNumberColor(trend.number)
  const temperatureColor = trend.trend === 'hot' ? 'text-red-600' : 
                          trend.trend === 'cold' ? 'text-blue-600' : 'text-gray-600'

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${colorClass}`}>
          {trend.number}
        </div>
        <div>
          <div className="font-medium">Numéro {trend.number}</div>
          <div className="text-xs text-muted-foreground">
            Dernière apparition: {trend.lastAppearance === 0 ? 'Récente' : `Il y a ${trend.lastAppearance} tirages`}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${temperatureColor}`}>
          {Math.round(trend.temperature)}°
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(trend.prediction)}% prob.
        </div>
      </div>
    </div>
  )
}

// Composant pour les patterns de séquences
function SequencePatternsView({ patterns }: { patterns: SequencePattern[] }) {
  return (
    <div className="space-y-4">
      {patterns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <OptimizedIcon name="Search" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun pattern détecté</h3>
            <p className="text-muted-foreground">
              Plus de données sont nécessaires pour identifier des patterns récurrents.
            </p>
          </CardContent>
        </Card>
      ) : (
        patterns.map((pattern, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{pattern.description}</h4>
                  <p className="text-sm text-muted-foreground">
                    Observé {pattern.frequency} fois • Dernière fois: {new Date(pattern.lastSeen).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Badge variant={pattern.confidence > 70 ? 'default' : pattern.confidence > 50 ? 'secondary' : 'outline'}>
                  {Math.round(pattern.confidence)}% confiance
                </Badge>
              </div>
              
              <div className="flex gap-2 mb-3">
                {pattern.sequence.map((num, idx) => (
                  <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getNumberColor(num)}`}>
                    {num}
                  </div>
                ))}
              </div>
              
              <Progress value={pattern.confidence} className="h-2" />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// Composant pour les tendances temporelles
function TemporalTrendsView({ trends }: { trends: TemporalTrend[] }) {
  return (
    <div className="space-y-4">
      {trends.map((trend, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{trend.description}</span>
              <Badge variant={trend.confidence > 0.7 ? 'default' : 'secondary'}>
                {Math.round(trend.confidence * 100)}% confiance
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trend.nextPrediction.numbers.length > 0 ? (
              <div>
                <h4 className="font-medium mb-2">Prédiction suivante:</h4>
                <div className="flex gap-2 mb-3">
                  {trend.nextPrediction.numbers.map((num, idx) => (
                    <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getNumberColor(num)}`}>
                      {num}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {trend.nextPrediction.reasoning}
                </p>
                <Progress value={trend.nextPrediction.confidence} className="h-2 mt-2" />
              </div>
            ) : (
              <p className="text-muted-foreground">Données insuffisantes pour une prédiction temporelle.</p>
            )}
          </CardContent>
        </Card>
      ))}
      
      {trends.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <OptimizedIcon name="Calendar" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Analyse temporelle en cours</h3>
            <p className="text-muted-foreground">
              Plus de données historiques sont nécessaires pour identifier des tendances temporelles.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Composant pour les suggestions intelligentes
function SmartSuggestionsView({ 
  suggestions, 
  onSuggestionSelect, 
  selectedSuggestion 
}: { 
  suggestions: SmartSuggestion[]
  onSuggestionSelect: (suggestion: SmartSuggestion) => void
  selectedSuggestion: SmartSuggestion | null
}) {
  return (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <OptimizedIcon name="Lightbulb" category="analytics" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune suggestion disponible</h3>
            <p className="text-muted-foreground">
              Plus de données sont nécessaires pour générer des suggestions intelligentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        suggestions.map((suggestion) => (
          <Card 
            key={suggestion.id} 
            className={`cursor-pointer transition-colors ${
              selectedSuggestion?.id === suggestion.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSuggestionSelect(suggestion)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    {suggestion.title}
                    <Badge variant={
                      suggestion.priority === 'high' ? 'default' : 
                      suggestion.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {suggestion.priority === 'high' ? 'Haute' : 
                       suggestion.priority === 'medium' ? 'Moyenne' : 'Basse'} priorité
                    </Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{suggestion.confidence}%</div>
                  <div className="text-xs text-muted-foreground">confiance</div>
                </div>
              </div>
              
              <div className="flex gap-2 mb-3">
                {suggestion.numbers.map((num, idx) => (
                  <div key={idx} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getNumberColor(num)}`}>
                    {num}
                  </div>
                ))}
              </div>
              
              <div className="space-y-1">
                {suggestion.reasoning.map((reason, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                    <OptimizedIcon name="Check" critical size={12} />
                    {reason}
                  </p>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-3">
                <Progress value={suggestion.confidence} className="h-2 flex-1 mr-4" />
                <span className="text-xs text-muted-foreground">
                  Valide jusqu'au {new Date(suggestion.validUntil).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      {selectedSuggestion && (
        <Alert>
          <OptimizedIcon name="Info" critical size={16} />
          <AlertDescription>
            <strong>{selectedSuggestion.title}</strong> sélectionnée avec {selectedSuggestion.confidence}% de confiance.
            Cette suggestion est basée sur l'analyse des données historiques et les tendances actuelles.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
