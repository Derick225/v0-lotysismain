"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DRAW_SCHEDULE } from "../lib/constants"

interface DrawNameSelectProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  label?: string
  placeholder?: string
}

export function DrawNameSelect({
  value,
  onChange,
  required = false,
  label = "Nom du tirage",
  placeholder = "Sélectionner un tirage",
}: DrawNameSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="draw-name">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="draw-name">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(DRAW_SCHEDULE).map(([day, draws]) => (
            <div key={day}>
              <div className="px-2 py-1 text-sm font-semibold text-gray-500 bg-gray-50">{day}</div>
              {Object.entries(draws).map(([time, drawName]) => (
                <SelectItem key={drawName as string} value={drawName as string}>
                  {time} - {drawName as string}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
