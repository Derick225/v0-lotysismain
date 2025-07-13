"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  AlertCircle,
  CheckCircle,
  Target,
  Zap,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { type ShapExplanation } from '../services/shap-service'
import { type BayesianPrediction } from '../services/bayesian-analysis-service'

interface MLExplanationPanelProps {
  shapExplanation?: ShapExplanation
  bayesianPrediction?: BayesianPrediction
  isLoading?: boolean
  onRequestExplanation?: () => void
}

export function MLExplanationPanel({
  shapExplanation,
  bayesianPrediction,
  isLoading = false,
  onRequestExplanation
}: MLExplanationPanelProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('shap')

  // Couleurs pour les graphiques
  const colors = {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: '#6b7280',
    primary: '#3b82f6',
    secondary: '#8b5cf6'
  }

  // Préparer les données pour les graphiques SHAP
  const shapChartData = shapExplanation?.shapValues
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 10)
    .map(sv => ({
      feature: sv.feature.replace(/_/g, ' '),
      contribution: sv.contribution,
      absContribution: Math.abs(sv.contribution),
      color: sv.contribution > 0 ? colors.positive : colors.negative
    })) || []

  // Préparer les données pour les graphiques bayésiens
  const bayesianChartData = bayesianPrediction?.numbers.map((num, index) => ({
    number: num,
    probability: bayesianPrediction.posteriors[index]?.probability * 100 || 0,
    lower: bayesianPrediction.posteriors[index]?.credibleInterval[0] * 100 || 0,
    upper: bayesianPrediction.posteriors[index]?.credibleInterval[1] * 100 || 0
  })) || []

  // Données pour le graphique d'incertitude
  const uncertaintyData = bayesianPrediction ? [
    { name: 'Entropie', value: bayesianPrediction.uncertaintyMeasures.entropy, max: 6.5 },
    { name: 'Variance', value: bayesianPrediction.uncertaintyMeasures.variance * 1000, max: 10 },
    { name: 'Écart-type', value: bayesianPrediction.uncertaintyMeasures.standardDeviation * 100, max: 5 },
    { name: 'Coeff. Variation', value: bayesianPrediction.uncertaintyMeasures.coefficientOfVariation * 10, max: 2 }
  ] : []

  const handleRequestExplanation = () => {
    if (onRequestExplanation) {
      onRequestExplanation()
      toast({
        title: "Génération d'explications",
        description: "Calcul des explications SHAP et de l'analyse bayésienne en cours...",
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Génération des explications ML...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!shapExplanation && !bayesianPrediction) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Aucune explication disponible
            </p>
            <Button onClick={handleRequestExplanation}>
              <Zap className="h-4 w-4 mr-2" />
              Générer les explications
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Explications du Modèle ML
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shap">SHAP</TabsTrigger>
            <TabsTrigger value="bayesian">Bayésien</TabsTrigger>
            <TabsTrigger value="summary">Résumé</TabsTrigger>
          </TabsList>

          <TabsContent value="shap" className="space-y-4">
            {shapExplanation ? (
              <>
                {/* Graphique des contributions SHAP */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Contributions des Caractéristiques
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shapChartData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="feature" type="category" width={100} />
                        <Tooltip 
                          formatter={(value: number) => [value.toFixed(4), 'Contribution']}
                        />
                        <Bar 
                          dataKey="contribution" 
                          fill={(entry) => entry.color}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top caractéristiques positives et négatives */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="font-medium text-green-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Contributions Positives
                    </h5>
                    <div className="space-y-1">
                      {shapExplanation.summary.topPositiveFeatures.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                          <span className="text-sm">{feature.feature.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-green-700">
                            +{feature.contribution.toFixed(3)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-red-700 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Contributions Négatives
                    </h5>
                    <div className="space-y-1">
                      {shapExplanation.summary.topNegativeFeatures.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm">{feature.feature.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-red-700">
                            {feature.contribution.toFixed(3)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Métriques SHAP */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {shapExplanation.baseValue.toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valeur de base</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {shapExplanation.summary.totalContribution.toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Contribution totale</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {shapExplanation.expectedValue.toFixed(3)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valeur attendue</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Explications SHAP non disponibles</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bayesian" className="space-y-4">
            {bayesianPrediction ? (
              <>
                {/* Graphique des probabilités avec intervalles de confiance */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Probabilités Bayésiennes
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bayesianChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="number" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(2)}%`, 
                            name === 'probability' ? 'Probabilité' : 
                            name === 'lower' ? 'Borne inf.' : 'Borne sup.'
                          ]}
                        />
                        <Area 
                          dataKey="upper" 
                          stackId="1" 
                          stroke={colors.primary} 
                          fill={colors.primary}
                          fillOpacity={0.2}
                        />
                        <Area 
                          dataKey="lower" 
                          stackId="1" 
                          stroke={colors.primary} 
                          fill="white"
                        />
                        <Line 
                          dataKey="probability" 
                          stroke={colors.primary} 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Métriques d'incertitude */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Mesures d'Incertitude
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {uncertaintyData.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.value.toFixed(3)}
                          </span>
                        </div>
                        <Progress 
                          value={(item.value / item.max) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Intervalle de crédibilité */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h5 className="font-medium text-blue-700 mb-2">
                    Intervalle de Crédibilité (95%)
                  </h5>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      [{bayesianPrediction.credibleInterval[0].toFixed(2)}%, {bayesianPrediction.credibleInterval[1].toFixed(2)}%]
                    </span>
                    <Badge className="bg-blue-600">
                      Confiance: {bayesianPrediction.confidence.toFixed(1)}%
                    </Badge>
                  </div>
                </div>

                {/* Numéros prédits avec probabilités */}
                <div className="space-y-2">
                  <h5 className="font-medium">Numéros Prédits</h5>
                  <div className="flex flex-wrap gap-2">
                    {bayesianPrediction.numbers.map((num, index) => (
                      <div key={num} className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                          {num}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(bayesianPrediction.posteriors[index]?.probability * 100 || 0).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Analyse bayésienne non disponible</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Résumé SHAP */}
              {shapExplanation && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analyse SHAP</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {shapExplanation.shapValues.length} caractéristiques analysées
                      </span>
                    </div>
                    <div className="text-sm">
                      <strong>Caractéristique la plus importante:</strong><br />
                      {shapExplanation.summary.topPositiveFeatures[0]?.feature.replace(/_/g, ' ') || 'N/A'}
                    </div>
                    <div className="text-sm">
                      <strong>Impact total:</strong> {shapExplanation.summary.totalContribution.toFixed(3)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Résumé Bayésien */}
              {bayesianPrediction && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analyse Bayésienne</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Confiance: {bayesianPrediction.confidence.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-sm">
                      <strong>Entropie:</strong> {bayesianPrediction.uncertaintyMeasures.entropy.toFixed(3)}
                    </div>
                    <div className="text-sm">
                      <strong>Intervalle de crédibilité:</strong><br />
                      [{bayesianPrediction.credibleInterval[0].toFixed(1)}%, {bayesianPrediction.credibleInterval[1].toFixed(1)}%]
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleRequestExplanation} variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Régénérer les explications
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
