'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { OptimizedIcon } from "./ui/optimized-icons"
import { AdvancedMetrics } from "./advanced-metrics"
import type { DrawResult } from "../lib/constants"
import { useMemo } from "react"

interface EnhancedDrawStatsProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

export function EnhancedDrawStats({ drawName, data, getNumberColor }: EnhancedDrawStatsProps) {
  const basicStats = useMemo(() => {
    if (data.length === 0) return null

    // Calculer les fréquences
    const frequencies: { [key: number]: number } = {}
    const totalDraws = data.length
    let totalNumbers = 0

    data.forEach((draw) => {
      draw.gagnants.forEach((num) => {
        frequencies[num] = (frequencies[num] || 0) + 1
        totalNumbers++
      })
      // Inclure les numéros machine s'ils existent
      if (draw.machine) {
        draw.machine.forEach((num) => {
          frequencies[num] = (frequencies[num] || 0) + 1
          totalNumbers++
        })
      }
    })

    // Trier par fréquence
    const sortedByFrequency = Object.entries(frequencies)
      .map(([num, freq]) => ({ num: Number.parseInt(num), freq, percentage: (freq / totalDraws) * 100 }))
      .sort((a, b) => b.freq - a.freq)

    const mostFrequent = sortedByFrequency.slice(0, 10)
    const leastFrequent = sortedByFrequency.slice(-10).reverse()
    const uniqueNumbers = Object.keys(frequencies).length
    const averageFrequency = (totalNumbers / totalDraws / uniqueNumbers) * 100

    // Calculer les écarts (numéros qui n'ont pas été tirés récemment)
    const lastAppearance: { [key: number]: number } = {}
    data.forEach((draw, index) => {
      draw.gagnants.forEach((num) => {
        if (!(num in lastAppearance)) {
          lastAppearance[num] = index
        }
      })
      if (draw.machine) {
        draw.machine.forEach((num) => {
          if (!(num in lastAppearance)) {
            lastAppearance[num] = index
          }
        })
      }
    })

    const gaps = Object.entries(lastAppearance)
      .map(([num, lastIndex]) => ({ num: Number.parseInt(num), gap: lastIndex }))
      .sort((a, b) => b.gap - a.gap)

    // Statistiques sur les numéros machine
    const machineStats = {
      totalWithMachine: data.filter(draw => draw.machine && draw.machine.length > 0).length,
      percentageWithMachine: data.length > 0 ? (data.filter(draw => draw.machine && draw.machine.length > 0).length / data.length) * 100 : 0
    }

    return {
      totalDraws,
      uniqueNumbers,
      averageFrequency,
      mostFrequent,
      leastFrequent,
      longestGaps: gaps.slice(0, 10),
      machineStats,
      totalNumbers
    }
  }, [data])

  if (!basicStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="BarChart3" critical size={20} />
            Statistiques - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <OptimizedIcon name="Database" category="analytics" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune donnée disponible</h3>
            <p className="text-muted-foreground">
              Aucun résultat trouvé pour le tirage {drawName}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <OptimizedIcon name="BarChart3" critical size={16} />
            Statistiques de Base
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <OptimizedIcon name="Brain" critical size={16} />
            Métriques Avancées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {/* Statistiques générales */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total des tirages</CardTitle>
                <OptimizedIcon name="Calendar" critical size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{basicStats.totalDraws}</div>
                <p className="text-xs text-muted-foreground">
                  Données analysées
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Numéros uniques</CardTitle>
                <OptimizedIcon name="Hash" size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{basicStats.uniqueNumbers}</div>
                <p className="text-xs text-muted-foreground">
                  Numéros différents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fréquence moyenne</CardTitle>
                <OptimizedIcon name="TrendingUp" critical size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{basicStats.averageFrequency.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Par numéro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avec Machine</CardTitle>
                <OptimizedIcon name="Cpu" category="predictions" size={16} className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{basicStats.machineStats.percentageWithMachine.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">
                  {basicStats.machineStats.totalWithMachine} tirages
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Numéros les plus fréquents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="TrendingUp" critical size={20} />
                Numéros les Plus Fréquents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {basicStats.mostFrequent.map((item, index) => (
                  <div key={item.num} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(item.num)}`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="font-medium">Numéro {item.num}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.freq} apparitions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.percentage.toFixed(1)}%</div>
                      <Progress value={item.percentage} className="w-20 h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Numéros les moins fréquents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="TrendingDown" size={20} />
                Numéros les Moins Fréquents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {basicStats.leastFrequent.map((item, index) => (
                  <div key={item.num} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{basicStats.uniqueNumbers - index}</Badge>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(item.num)}`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="font-medium">Numéro {item.num}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.freq} apparitions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.percentage.toFixed(1)}%</div>
                      <Progress value={item.percentage} className="w-20 h-2 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Numéros avec les plus longs écarts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OptimizedIcon name="Clock" critical size={20} />
                Numéros avec les Plus Longs Écarts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {basicStats.longestGaps.map((item, index) => (
                  <div key={item.num} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={item.gap === 0 ? "default" : item.gap < 5 ? "secondary" : "destructive"}>
                        #{index + 1}
                      </Badge>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getNumberColor(item.num)}`}>
                        {item.num}
                      </div>
                      <div>
                        <div className="font-medium">Numéro {item.num}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.gap === 0 ? 'Tirage le plus récent' : `Il y a ${item.gap} tirages`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.gap}</div>
                      <div className="text-xs text-muted-foreground">tirages</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Informations sur les numéros machine */}
          {basicStats.machineStats.totalWithMachine > 0 && (
            <Alert>
              <OptimizedIcon name="Info" critical size={16} />
              <AlertDescription>
                <strong>Numéros Machine :</strong> {basicStats.machineStats.totalWithMachine} tirages sur {basicStats.totalDraws} 
                ({basicStats.machineStats.percentageWithMachine.toFixed(1)}%) incluent des numéros machine. 
                Ces numéros sont générés automatiquement par le système et sont optionnels selon le type de tirage.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <AdvancedMetrics drawName={drawName} data={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
