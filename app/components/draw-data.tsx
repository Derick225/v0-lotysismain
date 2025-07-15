"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp } from "lucide-react"
import type { DrawResult } from "../lib/constants"

interface DrawDataProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

export function DrawData({ drawName, data, getNumberColor }: DrawDataProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Données - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune donnée disponible pour ce tirage.</p>
        </CardContent>
      </Card>
    )
  }

  const latestDraw = data[0]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dernier Tirage - {drawName}
            </span>
            <Badge variant="outline">{new Date(latestDraw.date).toLocaleDateString("fr-FR")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Numéros Gagnants
            </h4>
            <div className="flex flex-wrap gap-3">
              {latestDraw.gagnants.map((num, idx) => (
                <div
                  key={idx}
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${getNumberColor(num)}`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Numéros Machine si disponibles */}
          {latestDraw.machine && latestDraw.machine.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="mr-1">Machine</Badge>
                Numéros Machine
              </h4>
              <div className="flex flex-wrap gap-3">
                {latestDraw.machine.map((num, idx) => (
                  <div
                    key={idx}
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-2 border-dashed ${getNumberColor(num)}`}
                  >
                    {num}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Les numéros machine sont générés automatiquement par le système
              </p>
            </div>
          )}

          {latestDraw.machine && (
            <div>
              <h4 className="font-semibold mb-3">Numéros Machine</h4>
              <div className="flex flex-wrap gap-3">
                {latestDraw.machine.map((num, idx) => (
                  <div
                    key={idx}
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg opacity-75 ${getNumberColor(num)}`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique Récent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.slice(1, 6).map((draw, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{new Date(draw.date).toLocaleDateString("fr-FR")}</Badge>
                  <div className="flex gap-2">
                    {draw.gagnants.map((num, idx) => (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${getNumberColor(num)}`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
