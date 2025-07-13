import { supabase, MLPrediction, NewMLPrediction, UpdateMLPrediction } from '../supabase'

export class MLPredictionService {
  /**
   * Récupérer toutes les prédictions
   */
  static async getAllPredictions(limit = 100): Promise<MLPrediction[]> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .order('prediction_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération prédictions:', error)
      throw new Error(`Erreur lors de la récupération des prédictions: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les prédictions par nom de tirage
   */
  static async getPredictionsByDrawName(drawName: string, limit = 50): Promise<MLPrediction[]> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .eq('draw_name', drawName)
      .order('prediction_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération prédictions par tirage:', error)
      throw new Error(`Erreur lors de la récupération des prédictions pour ${drawName}: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les prédictions par modèle
   */
  static async getPredictionsByModel(modelUsed: string, limit = 50): Promise<MLPrediction[]> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .eq('model_used', modelUsed)
      .order('prediction_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération prédictions par modèle:', error)
      throw new Error(`Erreur lors de la récupération des prédictions pour ${modelUsed}: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Ajouter une nouvelle prédiction
   */
  static async addPrediction(prediction: NewMLPrediction): Promise<MLPrediction> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .insert([prediction])
      .select()
      .single()
    
    if (error) {
      console.error('Erreur ajout prédiction:', error)
      throw new Error(`Erreur lors de l'ajout de la prédiction: ${error.message}`)
    }
    
    return data
  }

  /**
   * Mettre à jour une prédiction (généralement pour ajouter la précision)
   */
  static async updatePrediction(id: number, updates: UpdateMLPrediction): Promise<MLPrediction> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Erreur mise à jour prédiction:', error)
      throw new Error(`Erreur lors de la mise à jour de la prédiction: ${error.message}`)
    }
    
    return data
  }

  /**
   * Calculer et mettre à jour la précision d'une prédiction
   */
  static async updatePredictionAccuracy(
    predictionId: number,
    actualResultId: number,
    actualNumbers: number[]
  ): Promise<MLPrediction> {
    // Récupérer la prédiction
    const { data: prediction, error: fetchError } = await supabase
      .from('ml_predictions')
      .select('predicted_numbers')
      .eq('id', predictionId)
      .single()
    
    if (fetchError) {
      throw new Error(`Erreur lors de la récupération de la prédiction: ${fetchError.message}`)
    }
    
    // Calculer la précision
    const { data: accuracy, error: calcError } = await supabase
      .rpc('calculate_prediction_accuracy', {
        predicted_numbers: prediction.predicted_numbers,
        actual_numbers: actualNumbers
      })
    
    if (calcError) {
      throw new Error(`Erreur lors du calcul de la précision: ${calcError.message}`)
    }
    
    // Mettre à jour la prédiction
    return await this.updatePrediction(predictionId, {
      actual_result_id: actualResultId,
      accuracy: accuracy
    })
  }

  /**
   * Récupérer les performances des modèles
   */
  static async getModelPerformance() {
    const { data, error } = await supabase
      .from('model_performance')
      .select('*')
      .order('avg_accuracy', { ascending: false })
    
    if (error) {
      console.error('Erreur récupération performances:', error)
      throw new Error(`Erreur lors de la récupération des performances: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les prédictions récentes pour un tirage
   */
  static async getRecentPredictions(drawName: string, days = 30): Promise<MLPrediction[]> {
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - days)
    
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .eq('draw_name', drawName)
      .gte('prediction_date', dateLimit.toISOString())
      .order('prediction_date', { ascending: false })
    
    if (error) {
      console.error('Erreur récupération prédictions récentes:', error)
      throw new Error(`Erreur lors de la récupération des prédictions récentes: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les meilleures prédictions par précision
   */
  static async getBestPredictions(limit = 50): Promise<MLPrediction[]> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('*')
      .not('accuracy', 'is', null)
      .order('accuracy', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération meilleures prédictions:', error)
      throw new Error(`Erreur lors de la récupération des meilleures prédictions: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Supprimer une prédiction
   */
  static async deletePrediction(id: number): Promise<void> {
    const { error } = await supabase
      .from('ml_predictions')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erreur suppression prédiction:', error)
      throw new Error(`Erreur lors de la suppression de la prédiction: ${error.message}`)
    }
  }

  /**
   * Importer des prédictions en lot
   */
  static async bulkImport(predictions: NewMLPrediction[]): Promise<MLPrediction[]> {
    const { data, error } = await supabase
      .from('ml_predictions')
      .insert(predictions)
      .select()
    
    if (error) {
      console.error('Erreur import prédictions en lot:', error)
      throw new Error(`Erreur lors de l'import en lot: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les statistiques globales des prédictions
   */
  static async getPredictionStats() {
    const { data, error } = await supabase
      .from('ml_predictions')
      .select('confidence, accuracy, model_used')
      .not('accuracy', 'is', null)
    
    if (error) {
      console.error('Erreur récupération stats prédictions:', error)
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
    }
    
    if (!data || data.length === 0) {
      return {
        totalPredictions: 0,
        avgAccuracy: 0,
        avgConfidence: 0,
        byModel: {}
      }
    }
    
    const stats = data.reduce((acc, pred) => {
      acc.totalPredictions++
      acc.totalAccuracy += pred.accuracy || 0
      acc.totalConfidence += pred.confidence || 0
      
      if (!acc.byModel[pred.model_used]) {
        acc.byModel[pred.model_used] = { count: 0, accuracy: 0, confidence: 0 }
      }
      
      acc.byModel[pred.model_used].count++
      acc.byModel[pred.model_used].accuracy += pred.accuracy || 0
      acc.byModel[pred.model_used].confidence += pred.confidence || 0
      
      return acc
    }, {
      totalPredictions: 0,
      totalAccuracy: 0,
      totalConfidence: 0,
      byModel: {} as any
    })
    
    // Calculer les moyennes
    const avgAccuracy = stats.totalAccuracy / stats.totalPredictions
    const avgConfidence = stats.totalConfidence / stats.totalPredictions
    
    Object.keys(stats.byModel).forEach(model => {
      const modelStats = stats.byModel[model]
      modelStats.avgAccuracy = modelStats.accuracy / modelStats.count
      modelStats.avgConfidence = modelStats.confidence / modelStats.count
    })
    
    return {
      totalPredictions: stats.totalPredictions,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      byModel: stats.byModel
    }
  }
}
