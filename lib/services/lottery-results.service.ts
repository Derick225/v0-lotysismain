import { supabase, LotteryResult, NewLotteryResult, UpdateLotteryResult } from '../supabase'

export class LotteryResultExtendedService {
  /**
   * Récupérer tous les résultats de tirage
   */
  static async getAllResults(limit = 100): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération résultats:', error)
      throw new Error(`Erreur lors de la récupération des résultats: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les résultats par nom de tirage
   */
  static async getResultsByDrawName(drawName: string, limit = 50): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('*')
      .eq('draw_name', drawName)
      .order('date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Erreur récupération résultats par tirage:', error)
      throw new Error(`Erreur lors de la récupération des résultats pour ${drawName}: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les résultats d'une période donnée
   */
  static async getResultsByDateRange(
    startDate: string,
    endDate: string,
    drawName?: string
  ): Promise<LotteryResult[]> {
    let query = supabase
      .from('lottery_results')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
    
    if (drawName) {
      query = query.eq('draw_name', drawName)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Erreur récupération résultats par période:', error)
      throw new Error(`Erreur lors de la récupération des résultats: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Ajouter un nouveau résultat
   */
  static async addResult(result: NewLotteryResult): Promise<LotteryResult> {
    const { data, error } = await supabase
      .from('lottery_results')
      .insert([result])
      .select()
      .single()
    
    if (error) {
      console.error('Erreur ajout résultat:', error)
      throw new Error(`Erreur lors de l'ajout du résultat: ${error.message}`)
    }
    
    return data
  }

  /**
   * Mettre à jour un résultat existant
   */
  static async updateResult(id: number, updates: UpdateLotteryResult): Promise<LotteryResult> {
    const { data, error } = await supabase
      .from('lottery_results')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Erreur mise à jour résultat:', error)
      throw new Error(`Erreur lors de la mise à jour du résultat: ${error.message}`)
    }
    
    return data
  }

  /**
   * Supprimer un résultat
   */
  static async deleteResult(id: number): Promise<void> {
    const { error } = await supabase
      .from('lottery_results')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erreur suppression résultat:', error)
      throw new Error(`Erreur lors de la suppression du résultat: ${error.message}`)
    }
  }

  /**
   * Vérifier si un résultat existe déjà
   */
  static async resultExists(drawName: string, date: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('id')
      .eq('draw_name', drawName)
      .eq('date', date)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erreur vérification existence:', error)
      throw new Error(`Erreur lors de la vérification: ${error.message}`)
    }
    
    return !!data
  }

  /**
   * Récupérer les statistiques d'un tirage
   */
  static async getDrawStatistics(drawName: string) {
    const { data, error } = await supabase
      .from('draw_statistics')
      .select('*')
      .eq('draw_name', drawName)
      .single()
    
    if (error) {
      console.error('Erreur récupération statistiques:', error)
      throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`)
    }
    
    return data
  }

  /**
   * Récupérer les fréquences des numéros
   */
  static async getNumberFrequencies(drawName: string) {
    const { data, error } = await supabase
      .from('number_frequencies')
      .select('*')
      .eq('draw_name', drawName)
      .order('frequency', { ascending: false })
    
    if (error) {
      console.error('Erreur récupération fréquences:', error)
      throw new Error(`Erreur lors de la récupération des fréquences: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Récupérer les derniers résultats pour tous les tirages
   */
  static async getLatestResults(): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from('lottery_results')
      .select('*')
      .order('date', { ascending: false })
      .limit(28) // Un pour chaque tirage
    
    if (error) {
      console.error('Erreur récupération derniers résultats:', error)
      throw new Error(`Erreur lors de la récupération des derniers résultats: ${error.message}`)
    }
    
    return data || []
  }

  /**
   * Importer des résultats en lot
   */
  static async bulkImport(results: NewLotteryResult[]): Promise<LotteryResult[]> {
    const { data, error } = await supabase
      .from('lottery_results')
      .insert(results)
      .select()
    
    if (error) {
      console.error('Erreur import en lot:', error)
      throw new Error(`Erreur lors de l'import en lot: ${error.message}`)
    }
    
    return data || []
  }
}
