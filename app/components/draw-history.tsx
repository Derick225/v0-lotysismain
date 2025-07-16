"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import type { DrawResult } from "../lib/constants"
import { useState, useMemo } from "react"

interface DrawHistoryProps {
  drawName: string
  data: DrawResult[]
  getNumberColor: (num: number) => string
}

export function DrawHistory({ drawName, data, getNumberColor }: DrawHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Filtre par date
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "week":
          filterDate.setDate(now.getDate() - 7)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          break
        case "3months":
          filterDate.setMonth(now.getMonth() - 3)
          break
      }

      filtered = filtered.filter((draw) => new Date(draw.date) >= filterDate)
    }

    // Filtre par recherche de numéros
    if (searchTerm) {
      const searchNumbers = searchTerm
        .split(",")
        .map((n) => Number.parseInt(n.trim()))
        .filter((n) => !isNaN(n))
      if (searchNumbers.length > 0) {
        filtered = filtered.filter((draw) => searchNumbers.some((num) => draw.gagnants.includes(num)))
      }
    }

    return filtered
  }, [data, dateFilter, searchTerm])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const resetFilters = () => {
    setSearchTerm("")
    setDateFilter("all")
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique - {drawName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéros (ex: 5, 12, 23)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="week">7 derniers jours</SelectItem>
                <SelectItem value="month">30 derniers jours</SelectItem>
                <SelectItem value="3months">3 derniers mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>

          <div className="space-y-4">
            {paginatedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun résultat trouvé pour les critères sélectionnés.</p>
              </div>
            ) : (
              paginatedData.map((draw, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {new Date(draw.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Badge>
                      <div className="flex gap-2">
                        {draw.gagnants.map((num, idx) => (
                          <div
                            key={idx}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getNumberColor(num)}`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>

                    {draw.machine && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground">Machine:</span>
                        <div className="flex gap-1">
                          {draw.machine.map((num, idx) => (
                            <div
                              key={idx}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold opacity-75 ${getNumberColor(num)}`}
                            >
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Affichage {(currentPage - 1) * itemsPerPage + 1} à{" "}
                {Math.min(currentPage * itemsPerPage, filteredData.length)} sur {filteredData.length} résultats
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques de la Période</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{filteredData.length}</div>
              <div className="text-sm text-muted-foreground">Tirages trouvés</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {filteredData.length > 0
                  ? new Date(Math.max(...filteredData.map((d) => new Date(d.date).getTime()))).toLocaleDateString(
                      "fr-FR",
                      { day: "2-digit", month: "2-digit" },
                    )
                  : "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Dernier tirage</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {filteredData.length > 0
                  ? new Date(Math.min(...filteredData.map((d) => new Date(d.date).getTime()))).toLocaleDateString(
                      "fr-FR",
                      { day: "2-digit", month: "2-digit" },
                    )
                  : "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Premier tirage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
