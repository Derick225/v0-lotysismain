"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { X, Plus, History, Shuffle, Check } from "lucide-react"
import { validateNumber, getNumberColor } from "../lib/constants"
import { useToast } from "@/hooks/use-toast"

interface NumberInputProps {
  label: string
  value: number[]
  onChange: (numbers: number[]) => void
  maxNumbers?: number
  minNumbers?: number
  placeholder?: string
  required?: boolean
  disabled?: boolean
  persistKey?: string
  allowHistory?: boolean
  quickInput?: boolean
  showColorLegend?: boolean
}

export function NumberInput({
  label,
  value,
  onChange,
  maxNumbers = 5,
  minNumbers = 0,
  placeholder = "Entrez un numéro entre 1 et 90",
  required = false,
  disabled = false,
  persistKey,
  allowHistory = false,
  quickInput = false,
  showColorLegend = false,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [history, setHistory] = useState<number[][]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [suggestions, setSuggestions] = useState<number[]>([])
  const { toast } = useToast()

  // Charger l'historique depuis localStorage
  useEffect(() => {
    if (allowHistory && persistKey) {
      try {
        const saved = localStorage.getItem(`number-input-history-${persistKey}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setHistory(parsed.slice(0, 10)) // Garder seulement les 10 derniers
          }
        }
      } catch (error) {
        console.warn("Failed to load number input history:", error)
      }
    }
  }, [allowHistory, persistKey])

  // Sauvegarder dans l'historique
  const saveToHistory = useCallback(
    (numbers: number[]) => {
      if (!allowHistory || !persistKey || numbers.length === 0) return

      try {
        const newHistory = [numbers, ...history.filter((h) => JSON.stringify(h) !== JSON.stringify(numbers))].slice(
          0,
          10,
        )
        setHistory(newHistory)
        localStorage.setItem(`number-input-history-${persistKey}`, JSON.stringify(newHistory))
      } catch (error) {
        console.warn("Failed to save number input history:", error)
      }
    },
    [allowHistory, persistKey, history],
  )

  // Générer des suggestions basées sur les numéros populaires
  useEffect(() => {
    if (quickInput) {
      const popular = [7, 13, 21, 33, 42, 55, 69, 77, 88, 3, 9, 17, 25, 39, 51, 63, 71, 81, 90]
      const available = popular.filter((num) => !value.includes(num))
      setSuggestions(available.slice(0, 10))
    }
  }, [quickInput, value])

  const handleInputSubmit = () => {
    const num = Number.parseInt(inputValue.trim())

    if (!inputValue.trim()) {
      return
    }

    if (!validateNumber(num)) {
      toast({
        title: "Numéro invalide",
        description: "Le numéro doit être entre 1 et 90",
        variant: "destructive",
      })
      return
    }

    if (value.includes(num)) {
      toast({
        title: "Numéro déjà sélectionné",
        description: `Le numéro ${num} est déjà dans la liste`,
        variant: "destructive",
      })
      return
    }

    if (value.length >= maxNumbers) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez sélectionner que ${maxNumbers} numéros maximum`,
        variant: "destructive",
      })
      return
    }

    const newNumbers = [...value, num].sort((a, b) => a - b)
    onChange(newNumbers)
    setInputValue("")

    // Sauvegarder si c'est complet
    if (newNumbers.length === maxNumbers) {
      saveToHistory(newNumbers)
    }
  }

  const handleRemoveNumber = (numToRemove: number) => {
    const newNumbers = value.filter((num) => num !== numToRemove)
    onChange(newNumbers)
  }

  const handleAddSuggestion = (num: number) => {
    if (value.length >= maxNumbers) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez sélectionner que ${maxNumbers} numéros maximum`,
        variant: "destructive",
      })
      return
    }

    const newNumbers = [...value, num].sort((a, b) => a - b)
    onChange(newNumbers)

    if (newNumbers.length === maxNumbers) {
      saveToHistory(newNumbers)
    }
  }

  const handleRandomFill = () => {
    const needed = maxNumbers - value.length
    if (needed <= 0) return

    const available = []
    for (let i = 1; i <= 90; i++) {
      if (!value.includes(i)) {
        available.push(i)
      }
    }

    const random = []
    for (let i = 0; i < needed && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length)
      random.push(available.splice(index, 1)[0])
    }

    const newNumbers = [...value, ...random].sort((a, b) => a - b)
    onChange(newNumbers)
    saveToHistory(newNumbers)

    toast({
      title: "Numéros générés",
      description: `${random.length} numéros aléatoires ajoutés`,
    })
  }

  const handleLoadFromHistory = (numbers: number[]) => {
    onChange(numbers)
    setShowHistory(false)
    toast({
      title: "Numéros chargés",
      description: "Numéros chargés depuis l'historique",
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleInputSubmit()
    }
  }

  const isComplete = value.length >= minNumbers
  const canAddMore = value.length < maxNumbers

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor={`number-input-${label}`} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          <span className="text-muted-foreground ml-2">
            ({value.length}/{maxNumbers})
          </span>
        </Label>

        <div className="flex gap-2">
          {allowHistory && history.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              disabled={disabled}
            >
              <History className="h-4 w-4" />
            </Button>
          )}

          {canAddMore && (
            <Button type="button" variant="outline" size="sm" onClick={handleRandomFill} disabled={disabled}>
              <Shuffle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Input principal */}
      <div className="flex gap-2">
        <Input
          id={`number-input-${label}`}
          type="number"
          min="1"
          max="90"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || !canAddMore}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleInputSubmit}
          disabled={disabled || !canAddMore || !inputValue.trim()}
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Numéros sélectionnés */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((num) => (
            <Badge
              key={num}
              variant="secondary"
              className={`${getNumberColor(num)} relative group cursor-pointer`}
              onClick={() => !disabled && handleRemoveNumber(num)}
            >
              <span className="font-mono font-bold">{num.toString().padStart(2, "0")}</span>
              {!disabled && <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </Badge>
          ))}
        </div>
      )}

      {/* Indicateur de statut */}
      {isComplete && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <Check className="h-4 w-4" />
          <span>Sélection complète</span>
        </div>
      )}

      {/* Suggestions rapides */}
      {quickInput && canAddMore && suggestions.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Suggestions rapides</Label>
            <div className="flex flex-wrap gap-1">
              {suggestions.slice(0, 8).map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddSuggestion(num)}
                  disabled={disabled}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {num}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      {showHistory && history.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Historique récent</Label>
            <div className="space-y-2">
              {history.slice(0, 5).map((numbers, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50"
                  onClick={() => handleLoadFromHistory(numbers)}
                >
                  <div className="flex gap-1">
                    {numbers.map((num) => (
                      <Badge key={num} variant="outline" className="text-xs">
                        {num}
                      </Badge>
                    ))}
                  </div>
                  <Button type="button" variant="ghost" size="sm">
                    Charger
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Légende des couleurs */}
      {showColorLegend && (
        <Card>
          <CardContent className="p-3">
            <Label className="text-xs text-muted-foreground mb-2 block">Légende des couleurs</Label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                <span>1-9</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-800 rounded"></div>
                <span>10-19</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-800 rounded"></div>
                <span>20-29</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-indigo-800 rounded"></div>
                <span>30-39</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-600 rounded"></div>
                <span>40-49</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-pink-600 rounded"></div>
                <span>50-59</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-600 rounded"></div>
                <span>60-69</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-gray-600 rounded"></div>
                <span>70-79</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-600 rounded"></div>
                <span>80-90</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NumberInput
