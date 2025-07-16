'use client'

import { memo, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getNumberColor, formatDateTime, type DrawResult } from '../../lib/constants'
import { OptimizedIcon } from '../ui/optimized-icons'
import { Skeleton } from '../ui/lazy-loader'

interface DrawDataOptimizedProps {
  drawName: string
  data: DrawResult[]
  loading?: boolean
  onRefresh?: () => void
}

// Composant pour afficher un numéro avec mémorisation
const NumberBall = memo(({ 
  number, 
  isMachine = false 
}: { 
  number: number
  isMachine?: boolean 
}) => {
  const colorClass = useMemo(() => getNumberColor(number), [number])
  const baseClass = useMemo(() => 
    `w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${colorClass}`,
    [colorClass]
  )
  const machineClass = useMemo(() => 
    isMachine ? `${baseClass} border-2 border-dashed` : baseClass,
    [baseClass, isMachine]
  )

  return (
    <div className={machineClass} aria-label={`Numéro ${number}${isMachine ? ' (Machine)' : ''}`}>
      {number}
    </div>
  )
})

NumberBall.displayName = 'NumberBall'

// Composant pour afficher une série de numéros
const NumberSeries = memo(({ 
  numbers, 
  title, 
  isMachine = false,
  icon 
}: {
  numbers: number[]
  title: string
  isMachine?: boolean
  icon?: string
}) => {
  const sortedNumbers = useMemo(() => [...numbers].sort((a, b) => a - b), [numbers])

  if (!numbers || numbers.length === 0) return null

  return (
    <div>
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        {icon && <OptimizedIcon name={icon} category="analytics" size={16} />}
        {title}
        {isMachine && (
          <Badge variant="secondary" className="ml-2">
            Machine
          </Badge>
        )}
      </h4>
      <div className="flex flex-wrap gap-3">
        {sortedNumbers.map((num, idx) => (
          <NumberBall 
            key={`${num}-${idx}`} 
            number={num} 
            isMachine={isMachine}
          />
        ))}
      </div>
      {isMachine && (
        <p className="text-xs text-muted-foreground mt-2">
          Les numéros machine sont générés automatiquement par le système
        </p>
      )}
    </div>
  )
})

NumberSeries.displayName = 'NumberSeries'

// Composant pour les statistiques rapides
const QuickStats = memo(({ data }: { data: DrawResult[] }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) return null

    const totalDraws = data.length
    const totalNumbers = data.reduce((sum, draw) => sum + draw.gagnants.length, 0)
    const avgNumbers = totalNumbers / totalDraws
    const hasAnyMachine = data.some(draw => draw.machine && draw.machine.length > 0)
    const machineCount = data.filter(draw => draw.machine && draw.machine.length > 0).length

    return {
      totalDraws,
      avgNumbers: Math.round(avgNumbers * 10) / 10,
      hasAnyMachine,
      machinePercentage: hasAnyMachine ? Math.round((machineCount / totalDraws) * 100) : 0
    }
  }, [data])

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">{stats.totalDraws}</div>
        <div className="text-xs text-muted-foreground">Tirages</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{stats.avgNumbers}</div>
        <div className="text-xs text-muted-foreground">Moy. numéros</div>
      </div>
      {stats.hasAnyMachine && (
        <>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.machinePercentage}%</div>
            <div className="text-xs text-muted-foreground">Avec machine</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalDraws - Math.floor(stats.totalDraws * stats.machinePercentage / 100)}
            </div>
            <div className="text-xs text-muted-foreground">Sans machine</div>
          </div>
        </>
      )}
    </div>
  )
})

QuickStats.displayName = 'QuickStats'

// Composant principal optimisé
export const DrawDataOptimized = memo(({ 
  drawName, 
  data, 
  loading = false,
  onRefresh 
}: DrawDataOptimizedProps) => {
  // Mémoriser le dernier tirage
  const latestDraw = useMemo(() => {
    if (!data || data.length === 0) return null
    return data[0] // Supposer que les données sont triées par date décroissante
  }, [data])

  // Mémoriser la date formatée
  const formattedDate = useMemo(() => {
    if (!latestDraw) return null
    return formatDateTime(latestDraw.date)
  }, [latestDraw])

  // Callback pour le rafraîchissement
  const handleRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  // État de chargement
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="circle" className="w-14 h-14" />
              ))}
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Aucune donnée
  if (!latestDraw) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Database" category="analytics" size={20} />
            Données - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <OptimizedIcon name="Database" category="analytics" size={48} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aucune donnée disponible</h3>
          <p className="text-muted-foreground mb-4">
            Aucun résultat trouvé pour le tirage {drawName}
          </p>
          {onRefresh && (
            <Button onClick={handleRefresh} variant="outline">
              <OptimizedIcon name="Refresh" critical size={16} className="mr-2" />
              Actualiser
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations du tirage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <OptimizedIcon name="Database" category="analytics" size={20} />
              Données - {drawName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {formattedDate}
              </Badge>
              {onRefresh && (
                <Button onClick={handleRefresh} variant="outline" size="sm">
                  <OptimizedIcon name="Refresh" critical size={16} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Numéros Gagnants */}
          <NumberSeries
            numbers={latestDraw.gagnants}
            title="Numéros Gagnants"
            icon="Target"
          />

          {/* Numéros Machine (conditionnels) */}
          {latestDraw.machine && latestDraw.machine.length > 0 && (
            <NumberSeries
              numbers={latestDraw.machine}
              title="Numéros Machine"
              isMachine={true}
              icon="Cpu"
            />
          )}

          {/* Informations additionnelles */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Tirage #{latestDraw.id}</span>
            <span>
              {latestDraw.machine && latestDraw.machine.length > 0 
                ? `${latestDraw.gagnants.length + latestDraw.machine.length} numéros total`
                : `${latestDraw.gagnants.length} numéros`
              }
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="BarChart3" critical size={20} />
            Statistiques Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickStats data={data} />
        </CardContent>
      </Card>
    </div>
  )
})

DrawDataOptimized.displayName = 'DrawDataOptimized'
