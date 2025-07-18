"use client"

import React, { useState, useMemo, useCallback } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, ScatterChart, Scatter, Cell,
  HeatMapChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  BarChart3, TrendingUp, Zap, Target, Calendar, Download, 
  Maximize2, RotateCcw, Palette, Filter
} from 'lucide-react'
import { getNumberColor, getNumberBaseColor, getNumberRange } from '@/app/lib/constants'
import { LotteryResult } from '@/lib/supabase'

interface VisualizationData {
  number: number
  frequency: number
  percentage: number
  lastSeen: string
  gap: number
  trend: 'up' | 'down' | 'stable'
  range: string
}

interface InteractiveVisualizationsProps {
  results: LotteryResult[]
  drawName: string
}

export function InteractiveVisualizations({ results, drawName }: InteractiveVisualizationsProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'scatter' | 'radar' | 'heatmap'>('bar')
  const [timeRange, setTimeRange] = useState<'all' | '30' | '90' | '180'>('all')
  const [colorMode, setColorMode] = useState<'frequency' | 'range' | 'trend'>('range')
  const [showTrend, setShowTrend] = useState(false)
  const [filterRange, setFilterRange] = useState<string>('all')
  const [topNumbers, setTopNumbers] = useState([50])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [animationsEnabled, setAnimationsEnabled] = useState(true)

  // Filtrer les résultats selon la plage temporelle
  const filteredResults = useMemo(() => {
    if (timeRange === 'all') return results

    const daysAgo = parseInt(timeRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    return results.filter(result => new Date(result.date) >= cutoffDate)
  }, [results, timeRange])

  // Calculer les données de visualisation
  const visualizationData = useMemo(() => {
    const numberStats: { [key: number]: VisualizationData } = {}

    // Initialiser tous les numéros
    for (let num = 1; num <= 90; num++) {
      numberStats[num] = {
        number: num,
        frequency: 0,
        percentage: 0,
        lastSeen: '',
        gap: 0,
        trend: 'stable',
        range: getNumberRange(num)
      }
    }

    // Calculer les fréquences
    filteredResults.forEach((result, index) => {
      result.gagnants.forEach(number => {
        numberStats[number].frequency++
        if (!numberStats[number].lastSeen || result.date > numberStats[number].lastSeen) {
          numberStats[number].lastSeen = result.date
          numberStats[number].gap = index
        }
      })
    })

    // Calculer les pourcentages et tendances
    const totalDraws = filteredResults.length
    Object.values(numberStats).forEach(stat => {
      stat.percentage = totalDraws > 0 ? (stat.frequency / totalDraws) * 100 : 0
      
      // Calculer la tendance (comparaison première moitié vs seconde moitié)
      if (filteredResults.length > 10) {
        const halfPoint = Math.floor(filteredResults.length / 2)
        const firstHalf = filteredResults.slice(halfPoint)
        const secondHalf = filteredResults.slice(0, halfPoint)
        
        const firstHalfFreq = firstHalf.filter(r => r.gagnants.includes(stat.number)).length
        const secondHalfFreq = secondHalf.filter(r => r.gagnants.includes(stat.number)).length
        
        if (secondHalfFreq > firstHalfFreq * 1.2) {
          stat.trend = 'up'
        } else if (secondHalfFreq < firstHalfFreq * 0.8) {
          stat.trend = 'down'
        }
      }
    })

    // Filtrer par plage si nécessaire
    let data = Object.values(numberStats)
    if (filterRange !== 'all') {
      data = data.filter(item => item.range === filterRange)
    }

    return data.sort((a, b) => b.frequency - a.frequency)
  }, [filteredResults, filterRange])

  // Données pour graphiques temporels
  const temporalData = useMemo(() => {
    const monthlyData: { [key: string]: { month: string; frequency: number; numbers: number[] } } = {}

    filteredResults.forEach(result => {
      const monthKey = result.date.substring(0, 7) // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          frequency: 0,
          numbers: []
        }
      }
      
      monthlyData[monthKey].frequency += result.gagnants.length
      monthlyData[monthKey].numbers.push(...result.gagnants)
    })

    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
  }, [filteredResults])

  // Données pour carte thermique
  const heatmapData = useMemo(() => {
    const data: Array<{ x: number; y: number; value: number }> = []
    
    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 10; y++) {
        const number = y * 9 + x + 1
        if (number <= 90) {
          const stat = visualizationData.find(item => item.number === number)
          data.push({
            x,
            y,
            value: stat?.frequency || 0
          })
        }
      }
    }
    
    return data
  }, [visualizationData])

  // Données pour radar
  const radarData = useMemo(() => {
    const ranges = ['1-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-90']
    
    return ranges.map(range => {
      const rangeNumbers = visualizationData.filter(item => item.range === range)
      const avgFrequency = rangeNumbers.reduce((sum, item) => sum + item.frequency, 0) / rangeNumbers.length || 0
      
      return {
        range,
        frequency: Math.round(avgFrequency),
        percentage: Math.round(rangeNumbers.reduce((sum, item) => sum + item.percentage, 0) / rangeNumbers.length || 0)
      }
    })
  }, [visualizationData])

  // Couleur basée sur le mode sélectionné
  const getItemColor = useCallback((item: VisualizationData) => {
    switch (colorMode) {
      case 'frequency':
        const maxFreq = Math.max(...visualizationData.map(d => d.frequency))
        const intensity = item.frequency / maxFreq
        return `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`
      
      case 'trend':
        return item.trend === 'up' ? '#22c55e' : 
               item.trend === 'down' ? '#ef4444' : '#6b7280'
      
      case 'range':
      default:
        return getNumberBaseColor(item.number)
    }
  }, [colorMode, visualizationData])

  // Exporter les données
  const exportData = (format: 'csv' | 'json' | 'png') => {
    const dataToExport = visualizationData.slice(0, topNumbers[0])
    
    if (format === 'csv') {
      const csv = [
        'Numéro,Fréquence,Pourcentage,Dernière apparition,Écart,Tendance,Plage',
        ...dataToExport.map(item => 
          `${item.number},${item.frequency},${item.percentage.toFixed(2)},${item.lastSeen},${item.gap},${item.trend},${item.range}`
        )
      ].join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lottery-analysis-${drawName}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } else if (format === 'json') {
      const json = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lottery-analysis-${drawName}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    }
  }

  // Réinitialiser les filtres
  const resetFilters = () => {
    setTimeRange('all')
    setFilterRange('all')
    setTopNumbers([50])
    setColorMode('range')
    setShowTrend(false)
  }

  // Composant Badge numéroté
  const NumberBadge = ({ number }: { number: number }) => (
    <Badge className={`${getNumberColor(number)} text-xs`}>
      {number}
    </Badge>
  )

  // Rendu du graphique principal
  const renderChart = () => {
    const data = visualizationData.slice(0, topNumbers[0])
    
    const commonProps = {
      data,
      width: '100%',
      height: isFullscreen ? 600 : 400
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="number" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="frequency" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ r: 4 }}
                animationDuration={animationsEnabled ? 1000 : 0}
              />
              {showTrend && (
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#f97316" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="number" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="frequency" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
                animationDuration={animationsEnabled ? 1000 : 0}
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="number" name="Numéro" />
              <YAxis dataKey="frequency" name="Fréquence" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter 
                name="Numéros" 
                data={data} 
                fill="#3b82f6"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getItemColor(entry)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )

      case 'radar':
        return (
          <ResponsiveContainer {...commonProps}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="range" />
              <PolarRadiusAxis />
              <Radar 
                name="Fréquence" 
                dataKey="frequency" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6} 
              />
            </RadarChart>
          </ResponsiveContainer>
        )

      case 'heatmap':
        return (
          <div className="grid grid-cols-9 gap-1 p-4">
            {heatmapData.map((cell, index) => {
              const number = cell.y * 9 + cell.x + 1
              const maxValue = Math.max(...heatmapData.map(d => d.value))
              const intensity = cell.value / maxValue
              
              return (
                <div
                  key={index}
                  className="aspect-square flex items-center justify-center text-xs font-bold rounded border"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${0.1 + intensity * 0.8})`,
                    color: intensity > 0.5 ? 'white' : 'black'
                  }}
                  title={`Numéro ${number}: ${cell.value} occurrences`}
                >
                  {number <= 90 ? number : ''}
                </div>
              )
            })}
          </div>
        )

      case 'bar':
      default:
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="number" />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="frequency" 
                animationDuration={animationsEnabled ? 1000 : 0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getItemColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
      {/* En-tête avec contrôles */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold">Visualisations Interactives</h2>
            <Badge variant="secondary">{drawName}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Select onValueChange={(value: 'csv' | 'json' | 'png') => exportData(value)}>
              <SelectTrigger className="w-32">
                <Download className="w-4 h-4" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Contrôles */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Type de graphique</Label>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Barres</SelectItem>
                <SelectItem value="line">Ligne</SelectItem>
                <SelectItem value="area">Aire</SelectItem>
                <SelectItem value="scatter">Dispersion</SelectItem>
                <SelectItem value="radar">Radar</SelectItem>
                <SelectItem value="heatmap">Carte thermique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Période</Label>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">90 jours</SelectItem>
                <SelectItem value="180">180 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Couleurs</Label>
            <Select value={colorMode} onValueChange={(value: any) => setColorMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">Par plage</SelectItem>
                <SelectItem value="frequency">Par fréquence</SelectItem>
                <SelectItem value="trend">Par tendance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plage</Label>
            <Select value={filterRange} onValueChange={setFilterRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="1-9">1-9</SelectItem>
                <SelectItem value="10-19">10-19</SelectItem>
                <SelectItem value="20-29">20-29</SelectItem>
                <SelectItem value="30-39">30-39</SelectItem>
                <SelectItem value="40-49">40-49</SelectItem>
                <SelectItem value="50-59">50-59</SelectItem>
                <SelectItem value="60-69">60-69</SelectItem>
                <SelectItem value="70-79">70-79</SelectItem>
                <SelectItem value="80-90">80-90</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nombres à afficher: {topNumbers[0]}</Label>
            <Slider
              value={topNumbers}
              onValueChange={setTopNumbers}
              max={90}
              min={10}
              step={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="trend" 
                  checked={showTrend} 
                  onCheckedChange={setShowTrend}
                />
                <Label htmlFor="trend" className="text-sm">Tendance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="animations" 
                  checked={animationsEnabled} 
                  onCheckedChange={setAnimationsEnabled}
                />
                <Label htmlFor="animations" className="text-sm">Animations</Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graphique principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Analyse des fréquences - Top {topNumbers[0]} numéros</span>
            <Badge variant="outline">{filteredResults.length} tirages</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Évolution temporelle */}
      {chartType !== 'heatmap' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Évolution temporelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="frequency" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {visualizationData[0]?.number || '-'}
            </div>
            <div className="text-sm text-muted-foreground">Plus fréquent</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {visualizationData[0]?.frequency || 0}
            </div>
            <div className="text-sm text-muted-foreground">Occurrences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {visualizationData.filter(d => d.trend === 'up').length}
            </div>
            <div className="text-sm text-muted-foreground">En hausse</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {(visualizationData.reduce((sum, d) => sum + d.frequency, 0) / visualizationData.length).toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">Fréquence moy.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default InteractiveVisualizations
