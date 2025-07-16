"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, HeatMapChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, GitBranch, Target, Zap } from 'lucide-react';
import { getNumberColor, getNumberBaseColor } from '@/app/lib/constants';
import { LotteryResult } from '@/lib/supabase';

interface CoOccurrenceData {
  number1: number;
  number2: number;
  frequency: number;
  percentage: number;
  lastSeen: string;
}

interface CorrelationMatrix {
  number: number;
  correlations: { [key: number]: number };
}

interface CoOccurrenceAnalysisProps {
  results: LotteryResult[];
  drawName: string;
}

export function CoOccurrenceAnalysis({ results, drawName }: CoOccurrenceAnalysisProps) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [analysisType, setAnalysisType] = useState<'same_draw' | 'next_draw' | 'correlation'>('same_draw');
  const [minOccurrences, setMinOccurrences] = useState(2);
  const [timeRange, setTimeRange] = useState<'all' | '30' | '90' | '180'>('all');

  // Filtrer les résultats selon la plage temporelle
  const filteredResults = useMemo(() => {
    if (timeRange === 'all') return results;

    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return results.filter(result => new Date(result.date) >= cutoffDate);
  }, [results, timeRange]);

  // Calculer les co-occurrences dans le même tirage
  const sameDrawCoOccurrences = useMemo(() => {
    const occurrences: { [key: string]: CoOccurrenceData } = {};

    filteredResults.forEach(result => {
      const numbers = result.gagnants;

      // Calculer toutes les paires possibles
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const num1 = Math.min(numbers[i], numbers[j]);
          const num2 = Math.max(numbers[i], numbers[j]);
          const key = `${num1}-${num2}`;

          if (!occurrences[key]) {
            occurrences[key] = {
              number1: num1,
              number2: num2,
              frequency: 0,
              percentage: 0,
              lastSeen: result.date
            };
          }

          occurrences[key].frequency++;
          if (result.date > occurrences[key].lastSeen) {
            occurrences[key].lastSeen = result.date;
          }
        }
      }
    });

    // Calculer les pourcentages et filtrer
    const totalDraws = filteredResults.length;
    return Object.values(occurrences)
      .map(item => ({
        ...item,
        percentage: totalDraws > 0 ? (item.frequency / totalDraws) * 100 : 0
      }))
      .filter(item => item.frequency >= minOccurrences)
      .sort((a, b) => b.frequency - a.frequency);
  }, [filteredResults, minOccurrences]);

  // Calculer les co-occurrences dans le tirage suivant
  const nextDrawCoOccurrences = useMemo(() => {
    const occurrences: { [key: string]: CoOccurrenceData } = {};

    for (let i = 0; i < filteredResults.length - 1; i++) {
      const currentNumbers = filteredResults[i].gagnants;
      const nextNumbers = filteredResults[i + 1].gagnants;

      currentNumbers.forEach(currentNum => {
        nextNumbers.forEach(nextNum => {
          const key = `${currentNum}-${nextNum}`

          if (!occurrences[key]) {
            occurrences[key] = {
              number1: currentNum,
              number2: nextNum,
              frequency: 0,
              percentage: 0,
              lastSeen: filteredResults[i + 1].date
            }
          }

          occurrences[key].frequency++
          if (filteredResults[i + 1].date > occurrences[key].lastSeen) {
            occurrences[key].lastSeen = filteredResults[i + 1].date
          }
        })
      })
    }

    const totalPairs = filteredResults.length - 1
    return Object.values(occurrences)
      .map(item => ({
        ...item,
        percentage: totalPairs > 0 ? (item.frequency / totalPairs) * 100 : 0
      }))
      .filter(item => item.frequency >= minOccurrences)
      .sort((a, b) => b.frequency - a.frequency)
  }, [filteredResults, minOccurrences])

  // Calculer la matrice de corrélation
  const correlationMatrix = useMemo(() => {
    const matrix: CorrelationMatrix[] = []
    
    for (let num = 1; num <= 90; num++) {
      const correlations: { [key: number]: number } = {}
      
      // Obtenir toutes les occurrences du numéro
      const numOccurrences = filteredResults.filter(result => 
        result.gagnants.includes(num)
      )

      if (numOccurrences.length === 0) continue

      // Calculer la corrélation avec chaque autre numéro
      for (let otherNum = 1; otherNum <= 90; otherNum++) {
        if (num === otherNum) continue

        const bothOccurrences = numOccurrences.filter(result =>
          result.gagnants.includes(otherNum)
        ).length

        const correlation = numOccurrences.length > 0 ? 
          bothOccurrences / numOccurrences.length : 0

        if (correlation > 0) {
          correlations[otherNum] = correlation
        }
      }

      matrix.push({ number: num, correlations })
    }

    return matrix.sort((a, b) => 
      Object.keys(b.correlations).length - Object.keys(a.correlations).length
    )
  }, [filteredResults])

  // Obtenir les données pour le numéro sélectionné
  const getSelectedNumberData = () => {
    if (!selectedNumber) return []

    if (analysisType === 'same_draw') {
      return sameDrawCoOccurrences
        .filter(item => item.number1 === selectedNumber || item.number2 === selectedNumber)
        .map(item => ({
          number: item.number1 === selectedNumber ? item.number2 : item.number1,
          frequency: item.frequency,
          percentage: item.percentage,
          lastSeen: item.lastSeen
        }))
        .slice(0, 20)
    } else if (analysisType === 'next_draw') {
      return nextDrawCoOccurrences
        .filter(item => item.number1 === selectedNumber)
        .map(item => ({
          number: item.number2,
          frequency: item.frequency,
          percentage: item.percentage,
          lastSeen: item.lastSeen
        }))
        .slice(0, 20)
    } else {
      const correlations = correlationMatrix.find(m => m.number === selectedNumber)?.correlations || {}
      return Object.entries(correlations)
        .map(([num, correlation]) => ({
          number: parseInt(num),
          frequency: Math.round(correlation * 100),
          percentage: correlation * 100,
          lastSeen: ''
        }))
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 20)
    }
  }

  const selectedNumberData = getSelectedNumberData()

  // Composant Badge numéroté
  const NumberBadge = ({ number, frequency, onClick }: { 
    number: number; 
    frequency?: number; 
    onClick?: () => void 
  }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={`${getNumberColor(number)} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      {number}
      {frequency && (
        <span className="ml-1 text-xs opacity-75">({frequency})</span>
      )}
    </Button>
  )

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">Analyse des Co-occurrences</h2>
          <Badge variant="secondary">{drawName}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Type d'analyse</Label>
            <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same_draw">Même tirage</SelectItem>
                <SelectItem value="next_draw">Tirage suivant</SelectItem>
                <SelectItem value="correlation">Corrélation</SelectItem>
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
            <Label>Occurrences min.</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={minOccurrences}
              onChange={(e) => setMinOccurrences(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-2">
            <Label>Résultats analysés</Label>
            <div className="flex items-center h-10 px-3 bg-muted rounded-md text-sm">
              {filteredResults.length} tirages
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="detailed">Analyse détaillée</TabsTrigger>
          <TabsTrigger value="matrix">Matrice</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top co-occurrences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Top Co-occurrences
                <Badge variant="outline">
                  {analysisType === 'same_draw' ? 'Même tirage' : 
                   analysisType === 'next_draw' ? 'Tirage suivant' : 'Corrélation'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(analysisType === 'same_draw' ? sameDrawCoOccurrences : nextDrawCoOccurrences)
                  .slice(0, 10)
                  .map((item, index) => (
                    <div key={`${item.number1}-${item.number2}`} 
                         className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                        <NumberBadge number={item.number1} />
                        <span className="text-muted-foreground">+</span>
                        <NumberBadge number={item.number2} />
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{item.frequency}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Sélection de numéro pour analyse */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Sélectionner un numéro à analyser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2 mb-4">
                {Array.from({ length: 90 }, (_, i) => i + 1).map((number) => (
                  <NumberBadge
                    key={number}
                    number={number}
                    onClick={() => setSelectedNumber(number)}
                  />
                ))}
              </div>

              {selectedNumber && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <NumberBadge number={selectedNumber} />
                    Analyse pour le numéro {selectedNumber}
                  </h3>
                  
                  {selectedNumberData.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedNumberData.map((item) => (
                        <div key={item.number} 
                             className="flex items-center justify-between p-2 bg-background rounded border">
                          <NumberBadge number={item.number} />
                          <div className="text-right">
                            <div className="text-sm font-bold">{item.frequency}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Aucune co-occurrence trouvée pour ce numéro avec les critères actuels.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {selectedNumber && selectedNumberData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Graphique détaillé - Numéro {selectedNumber}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={selectedNumberData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="number" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        `${value}${name === 'percentage' ? '%' : ''}`,
                        name === 'frequency' ? 'Occurrences' : 'Pourcentage'
                      ]}
                    />
                    <Bar dataKey="frequency" fill="#3b82f6">
                      {selectedNumberData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getNumberBaseColor(entry.number)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Matrice de corrélation (top 20 numéros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {correlationMatrix.slice(0, 20).map((item) => (
                  <div key={item.number} className="flex items-center gap-2 p-2 border rounded">
                    <NumberBadge number={item.number} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {Object.keys(item.correlations).length} corrélations
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(item.correlations)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 10)
                          .map(([num, correlation]) => (
                            <Badge key={num} variant="secondary" className="text-xs">
                              {num} ({(correlation * 100).toFixed(0)}%)
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CoOccurrenceAnalysis
