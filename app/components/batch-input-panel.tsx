"use client"

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, CheckCircle, AlertTriangle, Download, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BatchResult {
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
}

interface ValidationError {
  line: number;
  error: string;
  data?: string;
}

export function BatchInputPanel() {
  const [textInput, setTextInput] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [parsedResults, setParsedResults] = useState<BatchResult[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const parseTextInput = (text: string): { results: BatchResult[]; errors: ValidationError[] } => {
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const results: BatchResult[] = [];
    const errors: ValidationError[] = [];

    lines.forEach((line, index) => {
      try {
        // Format attendu: "Nom du tirage,YYYY-MM-DD,num1-num2-num3-num4-num5,machine1-machine2-machine3-machine4-machine5"
        // ou: "Nom du tirage,YYYY-MM-DD,num1-num2-num3-num4-num5"
        const parts = line.split(",").map((p) => p.trim());

        if (parts.length < 3) {
          errors.push({
            line: index + 1,
            error: "Format invalide. Attendu: Nom,Date,Numéros[,Machine]",
            data: line,
          })
          return
        }

        const [drawName, date, gagnants, machine] = parts

        // Valider la date
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errors.push({
            line: index + 1,
            error: "Format de date invalide (YYYY-MM-DD requis)",
            data: line,
          })
          return
        }

        // Parser les numéros gagnants
        const gagnantsArray = gagnants.split("-").map((n) => Number.parseInt(n.trim()))
        if (gagnantsArray.length !== 5 || gagnantsArray.some((n) => isNaN(n) || n < 1 || n > 90)) {
          errors.push({
            line: index + 1,
            error: "5 numéros gagnants requis (1-90)",
            data: line,
          })
          return
        }

        // Parser les numéros machine (optionnel)
        let machineArray: number[] | undefined
        if (machine && machine.trim()) {
          machineArray = machine.split("-").map((n) => Number.parseInt(n.trim()))
          if (machineArray.length !== 5 || machineArray.some((n) => isNaN(n) || n < 1 || n > 90)) {
            errors.push({
              line: index + 1,
              error: "5 numéros machine requis si fournis (1-90)",
              data: line,
            })
            return
          }
        }

        results.push({
          draw_name: drawName,
          date,
          gagnants: gagnantsArray,
          machine: machineArray,
        })
      } catch (error) {
        errors.push({
          line: index + 1,
          error: `Erreur de parsing: ${error}`,
          data: line,
        })
      }
    })

    return { results, errors }
  }

  const handleTextProcess = () => {
    const { results, errors } = parseTextInput(textInput)
    setParsedResults(results)
    setValidationErrors(errors)

    if (errors.length === 0) {
      toast({
        title: "Parsing réussi",
        description: `${results.length} résultat(s) prêt(s) à être importé(s)`,
      })
    } else {
      toast({
        title: "Erreurs détectées",
        description: `${errors.length} erreur(s) trouvée(s)`,
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)

      // Auto-process si c'est un CSV
      if (file.name.endsWith(".csv")) {
        const { results, errors } = parseTextInput(content)
        setParsedResults(results)
        setValidationErrors(errors)
      }
    }
    reader.readAsText(file)
  }

  const handleBatchSave = async () => {
    if (parsedResults.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucun résultat à sauvegarder",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < parsedResults.length; i++) {
        const result = parsedResults[i]

        const response = await fetch("/api/lottery-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Erreur lors de la sauvegarde")
        }

        setUploadProgress(((i + 1) / parsedResults.length) * 100)

        // Petite pause pour éviter de surcharger l'API
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      toast({
        title: "Import réussi",
        description: `${parsedResults.length} résultat(s) importé(s) avec succès`,
      })

      // Nettoyer après succès
      setTextInput("")
      setFileContent("")
      setParsedResults([])
      setValidationErrors([])
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: `Erreur: ${error}`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setUploadProgress(0)
    }
  }

  const generateTemplate = () => {
    const template = [
      "# Template pour import en lot",
      "# Format: Nom du tirage,Date (YYYY-MM-DD),Numéros gagnants (séparés par -),Numéros machine (optionnel, séparés par -)",
      "# Exemple:",
      "National,2025-01-08,12-25-34-67-89,5-18-42-73-90",
      "Etoile,2025-01-08,3-17-28-55-81",
      "Fortune,2025-01-07,9-23-41-62-88,14-29-47-66-85",
    ].join("\n")

    const blob = new Blob([template], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "template-import-loterie.txt"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Saisie en lot
          </CardTitle>
          <CardDescription>Importez plusieurs résultats de tirage en une seule fois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={generateTemplate} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Télécharger template
            </Button>
            <Button
              onClick={() => {
                setParsedResults([])
                setValidationErrors([])
                setTextInput("")
                setFileContent("")
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Tout effacer
            </Button>
          </div>

          <Tabs defaultValue="text" className="space-y-4">
            <TabsList>
              <TabsTrigger value="text">Saisie texte</TabsTrigger>
              <TabsTrigger value="file">Import fichier</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Collez vos données (une ligne par tirage)</label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="National,2025-01-08,12-25-34-67-89,5-18-42-73-90&#10;Etoile,2025-01-08,3-17-28-55-81&#10;Fortune,2025-01-07,9-23-41-62-88"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleTextProcess} disabled={!textInput.trim()}>
                <FileText className="h-4 w-4 mr-2" />
                Analyser le texte
              </Button>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sélectionnez un fichier CSV ou TXT</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {fileContent && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Contenu du fichier:</label>
                  <Textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={() => {
                      const { results, errors } = parseTextInput(fileContent)
                      setParsedResults(results)
                      setValidationErrors(errors)
                    }}
                    className="mt-2"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Analyser le fichier
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Erreurs de validation */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Erreurs de validation ({validationErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>
                    <strong>Ligne {error.line}:</strong> {error.error}
                    {error.data && <div className="mt-1 font-mono text-xs bg-red-50 p-2 rounded">{error.data}</div>}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats parsés */}
      {parsedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Résultats prêts à importer ({parsedResults.length})
              </span>
              <Button onClick={handleBatchSave} disabled={isProcessing} className="flex items-center gap-2">
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Importer tout
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progression de l'import</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parsedResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{result.draw_name}</Badge>
                    <span className="text-sm text-gray-500">{result.date}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-600">Gagnants:</span>
                      <div className="flex gap-1 mt-1">
                        {result.gagnants.map((num) => (
                          <Badge key={num} variant="secondary" className="text-xs">
                            {num}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {result.machine && (
                      <div>
                        <span className="text-xs text-gray-600">Machine:</span>
                        <div className="flex gap-1 mt-1">
                          {result.machine.map((num) => (
                            <Badge key={num} variant="outline" className="text-xs">
                              {num}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions d'utilisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Format requis:</strong>
              <code className="block bg-gray-100 p-2 rounded mt-1 font-mono">
                Nom du tirage,YYYY-MM-DD,num1-num2-num3-num4-num5[,machine1-machine2-machine3-machine4-machine5]
              </code>
            </div>

            <div>
              <strong>Exemples valides:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  <code>National,2025-01-08,12-25-34-67-89,5-18-42-73-90</code>
                </li>
                <li>
                  <code>Etoile,2025-01-08,3-17-28-55-81</code> (sans machine)
                </li>
                <li>
                  <code>Fortune,2025-01-07,9-23-41-62-88,14-29-47-66-85</code>
                </li>
              </ul>
            </div>

            <div>
              <strong>Règles:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Une ligne par tirage</li>
                <li>Date au format YYYY-MM-DD</li>
                <li>Exactement 5 numéros gagnants (1-90)</li>
                <li>Numéros machine optionnels (5 numéros si fournis)</li>
                <li>Séparateur: virgule entre les champs, tiret entre les numéros</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
