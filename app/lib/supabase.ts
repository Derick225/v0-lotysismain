import { createClient } from "@supabase/supabase-js"

// Configuration Supabase avec les vraies variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Vérifier que les variables d'environnement sont définies
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variables d'environnement Supabase manquantes")
}

// Client Supabase pour les opérations côté client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client Supabase avec clé de service pour les opérations admin
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Types pour les données Supabase
export interface LotteryResult {
  id?: number
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
  created_at?: string
  updated_at?: string
}

export interface PredictionResult {
  id?: number
  draw_name: string
  prediction_date: string
  predicted_numbers: number[]
  algorithm: string
  confidence: number
  actual_numbers?: number[]
  accuracy?: number
  created_at?: string
}

// Fonction pour tester la connexion Supabase
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

    if (error) {
      return {
        success: false,
        error: `Erreur Supabase: ${error.message}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Erreur de connexion: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    }
  }
}

// Fonctions CRUD pour les résultats de loterie
export async function insertLotteryResult(result: Omit<LotteryResult, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("lottery_results").insert([result]).select().single()
  return { data, error }
}

export async function getLotteryResults(limit = 100, drawName?: string) {
  let query = supabase.from("lottery_results").select("*").order("date", { ascending: false }).limit(limit)

  if (drawName) {
    query = query.eq("draw_name", drawName)
  }

  const { data, error } = await query
  return { data, error }
}

export async function updateLotteryResult(id: number, updates: Partial<LotteryResult>) {
  const { data, error } = await supabase
    .from("lottery_results")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  return { data, error }
}

export async function deleteLotteryResult(id: number) {
  const { data, error } = await supabase.from("lottery_results").delete().eq("id", id).select().single()
  return { data, error }
}

// Fonctions pour les prédictions
export async function insertPrediction(prediction: Omit<PredictionResult, "id" | "created_at">) {
  const { data, error } = await supabase.from("predictions").insert([prediction]).select().single()
  return { data, error }
}

export async function getPredictions(limit = 50, drawName?: string) {
  let query = supabase.from("predictions").select("*").order("prediction_date", { ascending: false }).limit(limit)

  if (drawName) {
    query = query.eq("draw_name", drawName)
  }

  const { data, error } = await query
  return { data, error }
}

// Fonction pour obtenir les statistiques
export async function getStatistics() {
  try {
    const [drawsResult, predictionsResult] = await Promise.all([
      supabase.from("lottery_results").select("id", { count: "exact" }),
      supabase.from("predictions").select("accuracy").not("accuracy", "is", null),
    ])

    const totalDraws = drawsResult.count || 0
    const predictions = predictionsResult.data || []
    const totalPredictions = predictions.length
    const averageAccuracy =
      totalPredictions > 0 ? predictions.reduce((sum, p) => sum + (p.accuracy || 0), 0) / totalPredictions : 0

    return {
      data: {
        total_draws: totalDraws,
        total_predictions: totalPredictions,
        average_accuracy: averageAccuracy,
        last_update: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Erreur inconnue"),
    }
  }
}

// Fonction pour nettoyer les anciennes données
export async function cleanupOldData(daysOld = 365) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  try {
    const { data, error } = await supabaseAdmin
      .from("lottery_results")
      .delete()
      .lt("date", cutoffDate.toISOString().split("T")[0])

    return { data, error }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Erreur lors du nettoyage"),
    }
  }
}

// Fonction pour sauvegarder les données
export async function backupData() {
  try {
    const [lotteryResults, predictions] = await Promise.all([
      supabase.from("lottery_results").select("*").order("date", { ascending: false }),
      supabase.from("predictions").select("*").order("prediction_date", { ascending: false }),
    ])

    if (lotteryResults.error) throw lotteryResults.error
    if (predictions.error) throw predictions.error

    return {
      data: {
        lottery_results: lotteryResults.data,
        predictions: predictions.data,
        backup_date: new Date().toISOString(),
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Erreur lors de la sauvegarde"),
    }
  }
}

// Fonction pour restaurer les données
export async function restoreData(backupData: any) {
  try {
    let restoredCount = 0

    if (backupData.lottery_results && Array.isArray(backupData.lottery_results)) {
      const { error: lotteryError } = await supabaseAdmin
        .from("lottery_results")
        .upsert(backupData.lottery_results, { onConflict: "date,draw_name" })

      if (lotteryError) throw lotteryError
      restoredCount += backupData.lottery_results.length
    }

    if (backupData.predictions && Array.isArray(backupData.predictions)) {
      const { error: predictionsError } = await supabaseAdmin
        .from("predictions")
        .upsert(backupData.predictions, { onConflict: "prediction_date,draw_name,algorithm" })

      if (predictionsError) throw predictionsError
      restoredCount += backupData.predictions.length
    }

    return {
      data: { restored_count: restoredCount },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Erreur lors de la restauration"),
    }
  }
}
