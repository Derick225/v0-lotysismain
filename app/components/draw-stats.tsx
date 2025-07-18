"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"
import type { DrawResult } from "../lib/constants"
import { useMemo } from "react"
import { OptimizedIcon } from "./ui/optimized-icons"
import { AdvancedMetrics } from "./advanced-metrics"

interface DrawStatsProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

export function DrawStats({ drawName, data, getNumberColor }: DrawStatsProps) {
  const stats = useMemo(() => {
    if (data.length === 0) return null

    // Calculer les fréquences
    const frequencies: { [key: number]: number } = {}
    const totalDraws = data.length

    data.forEach((draw) => {
      draw.gagnants.forEach((num) => {
        frequencies[num] = (frequencies[num] || 0) + 1
      })
    })

    // Trier par fréquence
    const sortedByFreq = Object.entries(frequencies)
      .map(([num, freq]) => ({ num: Number.parseInt(num), freq, percentage: (freq / totalDraws) * 100 }))
      .sort((a, b) => b.freq - a.freq)

    const mostFrequent = sortedByFreq.slice(0, 10)
    const leastFrequent = sortedByFreq.slice(-10).reverse()

    // Calculer les écarts
    const lastAppearance: { [key: number]: number } = {}
    data.forEach((draw, index) => {
      draw.gagnants.forEach((num) => {
        if (lastAppearance[num] === undefined) {
          lastAppearance[num] = index
        }
      })
    })

    const gaps = Object.entries(lastAppearance)
      .map(([num, lastIndex]) => ({ num: Number.parseInt(num), gap: lastIndex }))
      .sort((a, b) => b.gap - a.gap)

    return {
      totalDraws,
      mostFrequent,
      leastFrequent,
      longestGaps: gaps.slice(0, 10),
    }
  }, [data])

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune donnée disponible pour les statistiques.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Aperçu Statistique - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{stats.totalDraws}</div>
              <div className="text-sm text-muted-foreground">Tirages analysés</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.mostFrequent[0]?.num || "N/A"}</div>
              <div className="text-sm text-muted-foreground">Numéro le plus fréquent</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.leastFrequent[0]?.num || "N/A"}</div>
              <div className="text-sm text-muted-foreground">Numéro le moins fréquent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Numéros les Plus Fréquents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.mostFrequent.map((item, index) => (
              <div key={item.num} className="flex items-center gap-4">
                <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(item.num)}`}
                >
                  {item.num}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{item.freq} fois</span>
                    <span className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Numéros les Moins Fréquents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.leastFrequent.map((item, index) => (
              <div key={item.num} className="flex items-center gap-4">
                <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                  {index + 1}
                </Badge>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(item.num)}`}
                >
                  {item.num}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{item.freq} fois</span>
                    <span className="text-sm text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
