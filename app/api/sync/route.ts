import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

interface SyncRequest {
  source: string
  syncInterval?: number
  maxResults?: number
  forceSync?: boolean
  tables?: string[]
}

interface SyncResult {
  success: boolean
  syncedCount: number
  errors: string[]
  duration: number
  lastSyncTime: string
  conflicts: any[]
}

// POST - Synchroniser les données avec une source externe
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    const body: SyncRequest = await request.json()
    const { source, maxResults = 1000, forceSync = false, tables = ['lottery_results'] } = body

    // Valider l'URL source
    if (!source || typeof source !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL source requise' },
        { status: 400 }
      )
    }

    let totalSynced = 0
    const errors: string[] = []
    const conflicts: any[] = []

    // Synchroniser chaque table demandée
    for (const table of tables) {
      try {
        const result = await syncTable(table, source, maxResults, forceSync)
        totalSynced += result.syncedCount
        errors.push(...result.errors)
        conflicts.push(...result.conflicts)
      } catch (error) {
        errors.push(`Erreur lors de la synchronisation de ${table}: ${error}`)
      }
    }

    const duration = Date.now() - startTime

    // Enregistrer les statistiques de synchronisation
    await recordSyncStats({
      source,
      syncedCount: totalSynced,
      errors: errors.length,
      duration,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: errors.length === 0,
      syncedCount: totalSynced,
      errors,
      conflicts,
      duration,
      lastSyncTime: new Date().toISOString(),
      message: errors.length === 0 
        ? `Synchronisation réussie: ${totalSynced} enregistrements`
        : `Synchronisation partielle: ${totalSynced} enregistrements, ${errors.length} erreurs`
    })

  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur lors de la synchronisation',
        duration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// GET - Obtenir le statut de synchronisation
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')

    // Récupérer les statistiques de synchronisation
    const stats = await getSyncStats(source)

    return NextResponse.json({
      success: true,
      stats,
      lastCheck: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du statut de sync:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Fonction pour synchroniser une table spécifique
async function syncTable(
  table: string, 
  source: string, 
  maxResults: number, 
  forceSync: boolean
): Promise<SyncResult> {
  const startTime = Date.now()
  let syncedCount = 0
  const errors: string[] = []
  const conflicts: any[] = []

  try {
    if (table === 'lottery_results') {
      // Simuler la récupération de données depuis l'API externe
      const externalData = await fetchExternalLotteryData(source, maxResults)
      
      if (!externalData || externalData.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          errors: ['Aucune nouvelle donnée trouvée'],
          duration: Date.now() - startTime,
          lastSyncTime: new Date().toISOString(),
          conflicts: []
        }
      }

      // Traiter chaque résultat
      for (const item of externalData) {
        try {
          // Vérifier si l'enregistrement existe déjà
          const { data: existing } = await supabase
            .from('lottery_results')
            .select('id, updated_at')
            .eq('draw_name', item.draw_name)
            .eq('date', item.date)
            .single()

          if (existing && !forceSync) {
            // Vérifier s'il y a des conflits
            if (existing.updated_at && new Date(existing.updated_at) < new Date(item.updated_at || item.date)) {
              conflicts.push({
                table,
                id: existing.id,
                local: existing,
                remote: item,
                type: 'update_conflict'
              })
            }
            continue
          }

          // Insérer ou mettre à jour l'enregistrement
          const { error } = await supabase
            .from('lottery_results')
            .upsert({
              draw_name: item.draw_name,
              date: item.date,
              gagnants: item.gagnants,
              machine: item.machine,
              source: 'sync',
              synced_at: new Date().toISOString()
            })

          if (error) {
            errors.push(`Erreur lors de l'insertion de ${item.draw_name} ${item.date}: ${error.message}`)
          } else {
            syncedCount++
          }

        } catch (itemError) {
          errors.push(`Erreur lors du traitement de l'item: ${itemError}`)
        }
      }
    }

    return {
      success: errors.length === 0,
      syncedCount,
      errors,
      duration: Date.now() - startTime,
      lastSyncTime: new Date().toISOString(),
      conflicts
    }

  } catch (error) {
    return {
      success: false,
      syncedCount,
      errors: [`Erreur lors de la synchronisation de ${table}: ${error}`],
      duration: Date.now() - startTime,
      lastSyncTime: new Date().toISOString(),
      conflicts
    }
  }
}

// Simuler la récupération de données externes
async function fetchExternalLotteryData(source: string, maxResults: number): Promise<any[]> {
  try {
    // En production, ceci ferait un vrai appel API
    // Pour la démo, on simule des données
    const mockData = []
    const drawNames = ['National', 'Etoile', 'Fortune', 'Bonheur']
    
    for (let i = 0; i < Math.min(maxResults, 10); i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      mockData.push({
        draw_name: drawNames[Math.floor(Math.random() * drawNames.length)],
        date: date.toISOString().split('T')[0],
        gagnants: Array.from({ length: 5 }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b),
        machine: Array.from({ length: 5 }, () => Math.floor(Math.random() * 90) + 1).sort((a, b) => a - b),
        updated_at: new Date().toISOString()
      })
    }

    return mockData

  } catch (error) {
    console.error('Erreur lors de la récupération des données externes:', error)
    return []
  }
}

// Enregistrer les statistiques de synchronisation
async function recordSyncStats(stats: any): Promise<void> {
  try {
    await supabase
      .from('sync_stats')
      .insert([stats])
  } catch (error) {
    console.warn('Impossible d\'enregistrer les statistiques de sync:', error)
  }
}

// Récupérer les statistiques de synchronisation
async function getSyncStats(source?: string | null): Promise<any> {
  try {
    let query = supabase
      .from('sync_stats')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (source) {
      query = query.eq('source', source)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      recent: data || [],
      summary: {
        totalSyncs: data?.length || 0,
        lastSync: data?.[0]?.timestamp || null,
        averageDuration: data?.length ? 
          data.reduce((sum, stat) => sum + (stat.duration || 0), 0) / data.length : 0,
        successRate: data?.length ?
          (data.filter(stat => stat.errors === 0).length / data.length) * 100 : 100
      }
    }

  } catch (error) {
    console.warn('Erreur lors de la récupération des stats de sync:', error)
    return {
      recent: [],
      summary: {
        totalSyncs: 0,
        lastSync: null,
        averageDuration: 0,
        successRate: 100
      }
    }
  }
}
