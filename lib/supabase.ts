import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import logger from "../app/lib/logger";

// Configuration Supabase avec fallback gracieux
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Options de configuration optimisées
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': 'lotysis-pwa'
    }
  }
};

// Client Supabase pour les opérations côté client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Client Supabase avec clé de service pour les opérations admin
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  ...supabaseOptions,
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Types pour les données Supabase
export interface LotteryResult {
  id: string | number
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
  created_at: string
  updated_at?: string
}

export interface NewLotteryResult {
  draw_name: string
  date: string
  gagnants: number[]
  machine?: number[]
}

export interface UpdateLotteryResult {
  draw_name?: string
  date?: string
  gagnants?: number[]
  machine?: number[]
}

export interface PredictionResult {
  id: string | number
  draw_name: string
  prediction_date: string
  predicted_numbers: number[]
  algorithm: string
  confidence: number
  actual_numbers?: number[]
  accuracy?: number
  created_at: string
}

export interface NewPredictionResult {
  draw_name: string
  prediction_date: string
  predicted_numbers: number[]
  algorithm: string
  confidence: number
  actual_numbers?: number[]
  accuracy?: number
}

// ─────────────────────────────────────────────────────────
// ML Prediction types (used by monitoring & analytics UI)
// ─────────────────────────────────────────────────────────

export interface MLPrediction {
  id: number
  draw_name: string
  prediction_date: string
  model_type: string
  predicted_numbers: number[]
  confidence: number
  actual_numbers?: number[]
  accuracy?: number
  created_at: string
  updated_at?: string
}

export interface NewMLPrediction {
  draw_name: string
  prediction_date: string
  model_type: string
  predicted_numbers: number[]
  confidence: number
  actual_numbers?: number[]
  accuracy?: number
}

export interface UpdateMLPrediction {
  draw_name?: string
  prediction_date?: string
  model_type?: string
  predicted_numbers?: number[]
  confidence?: number
  actual_numbers?: number[]
  accuracy?: number
  updated_at?: string
}

export interface MLModel {
  id: number
  draw_name: string
  model_type: string
  model_data: any
  version: string
  performance_metrics: any
  created_at: string
  updated_at?: string
}

export interface NewMLModel {
  draw_name: string
  model_type: string
  model_data: any
  version: string
  performance_metrics: any
}

// Types pour les favoris utilisateur
export interface UserFavorite {
  id: number
  user_id?: string
  draw_name: string
  numbers: number[]
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface NewUserFavorite {
  user_id?: string
  draw_name: string
  numbers: number[]
  name: string
  description?: string
  is_active?: boolean
}

// Types pour les paramètres de notification
export interface NotificationSetting {
  id: number
  user_id?: string
  draw_names: string[]
  reminder_minutes: number
  sound_enabled: boolean
  vibration_enabled: boolean
  enabled: boolean
  created_at: string
  updated_at?: string
}

export interface NewNotificationSetting {
  user_id?: string
  draw_names: string[]
  reminder_minutes?: number
  sound_enabled?: boolean
  vibration_enabled?: boolean
  enabled?: boolean
}

// Types pour les logs d'audit
export interface AuditLog {
  id: number
  user_id?: string
  action: string
  table_name: string
  record_id?: number
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface NewAuditLog {
  user_id?: string
  action: string
  table_name: string
  record_id?: number
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
}

// Types pour la synchronisation
export interface SyncStatus {
  id: number
  table_name: string
  last_sync: string
  sync_direction: 'up' | 'down' | 'bidirectional'
  status: 'success' | 'error' | 'pending'
  error_message?: string
  records_synced: number
  created_at: string
}

// Fonction pour vérifier la clé de service
export function requireServiceRoleKey() {
  if (!supabaseServiceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing - using mock responses for development");
    return null;
  }
  return supabaseAdmin;
}

// Fonction pour tester la connexion Supabase
export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (supabaseUrl === "https://placeholder.supabase.co") {
      return {
        success: false,
        error: "Supabase URL not configured - using placeholder",
      };
    }

    const { data, error } = await supabase.from("lottery_results").select("count").limit(1);

    if (error) {
      return {
        success: false,
        error: `Erreur Supabase: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Erreur de connexion: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
    };
  }
}

// Service pour les résultats de loterie
export class LotteryResultService {
  static async create(data: NewLotteryResult): Promise<LotteryResult> {
    const admin = requireServiceRoleKey();
    if (!admin) {
      // Mock response for development
      return {
        id: Date.now(),
        ...data,
        created_at: new Date().toISOString(),
      };
    }

    const { data: result, error } = await admin.from("lottery_results").insert([data]).select().single();

    if (error) {
      throw new Error(`Failed to create lottery result: ${error.message}`);
    }

    return result;
  }

  static async getAll(limit = 100, offset = 0): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from("lottery_results")
      .select("*")
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching lottery results:", error);
      return [];
    }

    return data || [];
  }

  static async getById(id: number): Promise<LotteryResult | null> {
    const { data, error } = await supabase.from("lottery_results").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get lottery result: ${error.message}`);
    }

    return data;
  }

  static async getByDrawName(drawName: string, limit = 100): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from("lottery_results")
      .select("*")
      .eq("draw_name", drawName)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching lottery results by draw name:", error);
      return [];
    }

    return data || [];
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from("lottery_results")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching lottery results by date range:", error);
      return [];
    }

    return data || [];
  }

  static async update(id: number, updates: UpdateLotteryResult): Promise<LotteryResult> {
    const admin = requireServiceRoleKey();
    if (!admin) {
      // Mock response for development
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error("Lottery result not found");
      }
      return {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }

    const { data, error } = await admin
      .from("lottery_results")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update lottery result: ${error.message}`);
    }

    return data;
  }

  static async delete(id: number): Promise<boolean> {
    const admin = requireServiceRoleKey();
    if (!admin) {
      // Mock response for development
      return true;
    }

    const { error } = await admin.from("lottery_results").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete lottery result: ${error.message}`);
    }

    return true;
  }

  static async getStatistics() {
    try {
      const [totalResult, recentResult] = await Promise.all([
        supabase.from("lottery_results").select("id", { count: "exact" }),
        supabase.from("lottery_results").select("*").order("created_at", { ascending: false }).limit(1),
      ]);

      return {
        total_draws: totalResult.count || 0,
        last_update: recentResult.data?.[0]?.created_at || null,
      };
    } catch (error) {
      console.error("Error getting statistics:", error);
      return {
        total_draws: 0,
        last_update: null,
      };
    }
  }
}

// Service pour les prédictions
export class PredictionService {
  static async create(data: NewPredictionResult): Promise<PredictionResult> {
    const admin = requireServiceRoleKey()
    if (!admin) {
      // Mock response for development
      return {
        id: Date.now(),
        ...data,
        created_at: new Date().toISOString(),
      }
    }

    const { data: result, error } = await admin.from("predictions").insert([data]).select().single()

    if (error) {
      throw new Error(`Failed to create prediction: ${error.message}`)
    }

    return result
  }

  static async getAll(limit = 50): Promise<PredictionResult[]> {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .order("prediction_date", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching predictions:", error)
      return []
    }

    return data || []
  }

  static async getByDrawName(drawName: string, limit = 50): Promise<PredictionResult[]> {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("draw_name", drawName)
      .order("prediction_date", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching predictions by draw name:", error)
      return []
    }

    return data || []
  }

  static async updateAccuracy(id: number, actualNumbers: number[], accuracy: number): Promise<PredictionResult> {
    const admin = requireServiceRoleKey()
    if (!admin) {
      throw new Error("Service role key required for updating predictions")
    }

    const { data, error } = await admin
      .from("predictions")
      .update({
        actual_numbers: actualNumbers,
        accuracy: accuracy,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update prediction accuracy: ${error.message}`)
    }

    return data
  }
}

// Service pour les modèles ML
export class MLModelService {
  static async save(data: NewMLModel): Promise<MLModel> {
    const admin = requireServiceRoleKey()
    if (!admin) {
      // Mock response for development
      return {
        id: Date.now(),
        ...data,
        created_at: new Date().toISOString(),
      }
    }

    const { data: result, error } = await admin.from("ml_models").insert([data]).select().single()

    if (error) {
      throw new Error(`Failed to save ML model: ${error.message}`)
    }

    return result
  }

  static async load(drawName: string, modelType: string): Promise<MLModel | null> {
    const { data, error } = await supabase
      .from("ml_models")
      .select("*")
      .eq("draw_name", drawName)
      .eq("model_type", modelType)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Not found
      }
      console.error("Error loading ML model:", error)
      return null
    }

    return data
  }

  static async getAll(drawName?: string): Promise<MLModel[]> {
    let query = supabase.from("ml_models").select("*").order("created_at", { ascending: false })

    if (drawName) {
      query = query.eq("draw_name", drawName)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching ML models:", error)
      return []
    }

    return data || []
  }

  static async delete(id: number): Promise<boolean> {
    const admin = requireServiceRoleKey()
    if (!admin) {
      return true
    }

    const { error } = await admin.from("ml_models").delete().eq("id", id)

    if (error) {
      throw new Error(`Failed to delete ML model: ${error.message}`)
    }

    return true
  }
}

// Fonctions utilitaires
export async function cleanupOldData(daysOld = 365) {
  const admin = requireServiceRoleKey()
  if (!admin) {
    return { success: false, error: "Service role key required" }
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  try {
    const { error } = await admin.from("lottery_results").delete().lt("date", cutoffDate.toISOString().split("T")[0])

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function backupData() {
  try {
    const [lotteryResults, predictions, mlModels] = await Promise.all([
      supabase.from("lottery_results").select("*").order("date", { ascending: false }),
      supabase.from("predictions").select("*").order("prediction_date", { ascending: false }),
      supabase.from("ml_models").select("*").order("created_at", { ascending: false }),
    ])

    if (lotteryResults.error) throw lotteryResults.error
    if (predictions.error) throw predictions.error
    if (mlModels.error) throw mlModels.error

    return {
      success: true,
      data: {
        lottery_results: lotteryResults.data,
        predictions: predictions.data,
        ml_models: mlModels.data,
        backup_date: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function restoreData(backupData: any) {
  const admin = requireServiceRoleKey()
  if (!admin) {
    return { success: false, error: "Service role key required" }
  }

  try {
    let restoredCount = 0

    if (backupData.lottery_results && Array.isArray(backupData.lottery_results)) {
      const { error: lotteryError } = await admin
        .from("lottery_results")
        .upsert(backupData.lottery_results, { onConflict: "date,draw_name" })

      if (lotteryError) throw lotteryError
      restoredCount += backupData.lottery_results.length
    }

    if (backupData.predictions && Array.isArray(backupData.predictions)) {
      const { error: predictionsError } = await admin
        .from("predictions")
        .upsert(backupData.predictions, { onConflict: "prediction_date,draw_name,algorithm" })

      if (predictionsError) throw predictionsError
      restoredCount += backupData.predictions.length
    }

    if (backupData.ml_models && Array.isArray(backupData.ml_models)) {
      const { error: modelsError } = await admin
        .from("ml_models")
        .upsert(backupData.ml_models, { onConflict: "draw_name,model_type,version" })

      if (modelsError) throw modelsError
      restoredCount += backupData.ml_models.length
    }

    return {
      success: true,
      data: { restored_count: restoredCount },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
