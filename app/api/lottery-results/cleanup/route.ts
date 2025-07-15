import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

interface CleanupRequest {
  before_date?: string
  max_history_days?: number
  dry_run?: boolean
  tables?: string[]
  criteria?: {
    duplicates?: boolean
    orphaned?: boolean
    invalid?: boolean
    old_data?: boolean
  }
}

interface CleanupResult {
  success: boolean
  deletedCount: number
  errors: string[]
  duration: number
  details: {
    [table: string]: {
      deleted: number
      errors: string[]
    }
  }
  dryRun: boolean
}

// DELETE - Nettoyer les anciennes données
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    const body: CleanupRequest = await request.json()
    const { 
      before_date, 
      max_history_days = 365, 
      dry_run = false,
      tables = ['lottery_results'],
      criteria = { old_data: true }
    } = body

    // Calculer la date de coupure
    let cutoffDate: string
    if (before_date) {
      cutoffDate = before_date
    } else {
      const date = new Date()
      date.setDate(date.getDate() - max_history_days)
      cutoffDate = date.toISOString().split('T')[0]
    }

    // Valider la date de coupure
    if (new Date(cutoffDate) >= new Date()) {
      return NextResponse.json(
        { success: false, error: 'La date de coupure ne peut pas être dans le futur' },
        { status: 400 }
      )
    }

    let totalDeleted = 0
    const errors: string[] = []
    const details: { [table: string]: { deleted: number; errors: string[] } } = {}

    // Nettoyer chaque table
    for (const table of tables) {
      try {
        const result = await cleanupTable(table, cutoffDate, criteria, dry_run)
        totalDeleted += result.deleted
        errors.push(...result.errors)
        details[table] = result
      } catch (error) {
        const errorMsg = `Erreur lors du nettoyage de ${table}: ${error}`
        errors.push(errorMsg)
        details[table] = { deleted: 0, errors: [errorMsg] }
      }
    }

    const duration = Date.now() - startTime

    // Enregistrer les statistiques de nettoyage (si ce n'est pas un dry run)
    if (!dry_run) {
      await recordCleanupStats({
        cutoffDate,
        deletedCount: totalDeleted,
        errors: errors.length,
        duration,
        timestamp: new Date().toISOString(),
        tables: tables.join(',')
      })
    }

    return NextResponse.json({
      success: errors.length === 0,
      deletedCount: totalDeleted,
      errors,
      duration,
      details,
      dryRun: dry_run,
      cutoffDate,
      message: dry_run 
        ? `Simulation: ${totalDeleted} enregistrements seraient supprimés`
        : errors.length === 0 
          ? `Nettoyage réussi: ${totalDeleted} enregistrements supprimés`
          : `Nettoyage partiel: ${totalDeleted} enregistrements supprimés, ${errors.length} erreurs`
    })

  } catch (error) {
    console.error('Erreur lors du nettoyage:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur lors du nettoyage',
        duration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

// GET - Obtenir un aperçu des données à nettoyer
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const beforeDate = searchParams.get('before_date')
    const maxHistoryDays = parseInt(searchParams.get('max_history_days') || '365')

    // Calculer la date de coupure
    let cutoffDate: string
    if (beforeDate) {
      cutoffDate = beforeDate
    } else {
      const date = new Date()
      date.setDate(date.getDate() - maxHistoryDays)
      cutoffDate = date.toISOString().split('T')[0]
    }

    // Compter les enregistrements qui seraient supprimés
    const preview = await getCleanupPreview(cutoffDate)

    return NextResponse.json({
      success: true,
      preview,
      cutoffDate,
      message: `${preview.totalRecords} enregistrements seraient supprimés avant le ${cutoffDate}`
    })

  } catch (error) {
    console.error('Erreur lors de l\'aperçu du nettoyage:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Fonction pour nettoyer une table spécifique
async function cleanupTable(
  table: string, 
  cutoffDate: string, 
  criteria: any, 
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = []
  let deleted = 0

  try {
    if (table === 'lottery_results') {
      // Nettoyer les anciennes données
      if (criteria.old_data) {
        const result = await cleanupOldLotteryResults(cutoffDate, dryRun)
        deleted += result.deleted
        errors.push(...result.errors)
      }

      // Nettoyer les doublons
      if (criteria.duplicates) {
        const result = await cleanupDuplicateLotteryResults(dryRun)
        deleted += result.deleted
        errors.push(...result.errors)
      }

      // Nettoyer les données invalides
      if (criteria.invalid) {
        const result = await cleanupInvalidLotteryResults(dryRun)
        deleted += result.deleted
        errors.push(...result.errors)
      }
    }

    return { deleted, errors }

  } catch (error) {
    return { 
      deleted, 
      errors: [`Erreur lors du nettoyage de ${table}: ${error}`] 
    }
  }
}

// Nettoyer les anciens résultats de loterie
async function cleanupOldLotteryResults(
  cutoffDate: string, 
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  try {
    if (dryRun) {
      // Compter seulement
      const { count, error } = await supabase
        .from('lottery_results')
        .select('*', { count: 'exact', head: true })
        .lt('date', cutoffDate)

      if (error) {
        return { deleted: 0, errors: [error.message] }
      }

      return { deleted: count || 0, errors: [] }
    } else {
      // Supprimer réellement
      const { count, error } = await supabase
        .from('lottery_results')
        .delete()
        .lt('date', cutoffDate)

      if (error) {
        return { deleted: 0, errors: [error.message] }
      }

      return { deleted: count || 0, errors: [] }
    }

  } catch (error) {
    return { deleted: 0, errors: [`Erreur lors du nettoyage des anciennes données: ${error}`] }
  }
}

// Nettoyer les doublons
async function cleanupDuplicateLotteryResults(
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  try {
    // Trouver les doublons
    const { data: duplicates, error } = await supabase
      .from('lottery_results')
      .select('draw_name, date, count(*)')
      .group('draw_name, date')
      .having('count(*) > 1')

    if (error) {
      return { deleted: 0, errors: [error.message] }
    }

    if (!duplicates || duplicates.length === 0) {
      return { deleted: 0, errors: [] }
    }

    let deleted = 0
    const errors: string[] = []

    for (const duplicate of duplicates) {
      try {
        // Garder seulement le plus récent
        const { data: records } = await supabase
          .from('lottery_results')
          .select('id, created_at')
          .eq('draw_name', duplicate.draw_name)
          .eq('date', duplicate.date)
          .order('created_at', { ascending: false })

        if (records && records.length > 1) {
          const toDelete = records.slice(1) // Garder le premier (plus récent)
          
          if (!dryRun) {
            for (const record of toDelete) {
              const { error: deleteError } = await supabase
                .from('lottery_results')
                .delete()
                .eq('id', record.id)

              if (deleteError) {
                errors.push(`Erreur lors de la suppression du doublon ${record.id}: ${deleteError.message}`)
              } else {
                deleted++
              }
            }
          } else {
            deleted += toDelete.length
          }
        }

      } catch (itemError) {
        errors.push(`Erreur lors du traitement du doublon ${duplicate.draw_name} ${duplicate.date}: ${itemError}`)
      }
    }

    return { deleted, errors }

  } catch (error) {
    return { deleted: 0, errors: [`Erreur lors du nettoyage des doublons: ${error}`] }
  }
}

// Nettoyer les données invalides
async function cleanupInvalidLotteryResults(
  dryRun: boolean
): Promise<{ deleted: number; errors: string[] }> {
  try {
    // Trouver les enregistrements avec des données invalides
    const { data: invalid, error } = await supabase
      .from('lottery_results')
      .select('id, draw_name, date, gagnants')
      .or('draw_name.is.null,date.is.null,gagnants.is.null')

    if (error) {
      return { deleted: 0, errors: [error.message] }
    }

    if (!invalid || invalid.length === 0) {
      return { deleted: 0, errors: [] }
    }

    if (dryRun) {
      return { deleted: invalid.length, errors: [] }
    }

    // Supprimer les enregistrements invalides
    const { count, error: deleteError } = await supabase
      .from('lottery_results')
      .delete()
      .in('id', invalid.map(r => r.id))

    if (deleteError) {
      return { deleted: 0, errors: [deleteError.message] }
    }

    return { deleted: count || 0, errors: [] }

  } catch (error) {
    return { deleted: 0, errors: [`Erreur lors du nettoyage des données invalides: ${error}`] }
  }
}

// Obtenir un aperçu des données à nettoyer
async function getCleanupPreview(cutoffDate: string): Promise<any> {
  try {
    const { count: oldRecords } = await supabase
      .from('lottery_results')
      .select('*', { count: 'exact', head: true })
      .lt('date', cutoffDate)

    const { data: duplicates } = await supabase
      .from('lottery_results')
      .select('draw_name, date, count(*)')
      .group('draw_name, date')
      .having('count(*) > 1')

    const { count: invalidRecords } = await supabase
      .from('lottery_results')
      .select('*', { count: 'exact', head: true })
      .or('draw_name.is.null,date.is.null,gagnants.is.null')

    return {
      oldRecords: oldRecords || 0,
      duplicates: duplicates?.length || 0,
      invalidRecords: invalidRecords || 0,
      totalRecords: (oldRecords || 0) + (duplicates?.length || 0) + (invalidRecords || 0)
    }

  } catch (error) {
    console.warn('Erreur lors de l\'aperçu:', error)
    return {
      oldRecords: 0,
      duplicates: 0,
      invalidRecords: 0,
      totalRecords: 0
    }
  }
}

// Enregistrer les statistiques de nettoyage
async function recordCleanupStats(stats: any): Promise<void> {
  try {
    await supabase
      .from('cleanup_stats')
      .insert([stats])
  } catch (error) {
    console.warn('Impossible d\'enregistrer les statistiques de nettoyage:', error)
  }
}
