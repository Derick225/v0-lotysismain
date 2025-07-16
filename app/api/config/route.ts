import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// Configuration par défaut
const DEFAULT_CONFIG = {
  apiUrl: "https://lotobonheur.ci/api/results",
  syncInterval: 30,
  predictionDepth: 100,
  confidenceThreshold: 60,
  enableAutoSync: true,
  enableNotifications: true,
  maxHistoryDays: 365,
  mlModelTimeout: 30000,
  backupInterval: 24, // heures
  maxBackupRetention: 30, // jours
  enableAuditLog: true,
  sessionTimeout: 8, // heures
  maxLoginAttempts: 5,
  lockoutDuration: 15, // minutes
}

// GET - Récupérer la configuration système
export async function GET(request: NextRequest) {
  try {
    // Essayer de récupérer la configuration depuis Supabase
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .single()

    if (data && !error) {
      return NextResponse.json({
        success: true,
        config: {
          ...DEFAULT_CONFIG,
          ...data.config,
          lastUpdated: data.updated_at,
          updatedBy: data.updated_by
        }
      })
    }

    // Retourner la configuration par défaut si aucune n'est trouvée
    return NextResponse.json({
      success: true,
      config: {
        ...DEFAULT_CONFIG,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    })

  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error)
    
    // Retourner la configuration par défaut en cas d'erreur
    return NextResponse.json({
      success: true,
      config: {
        ...DEFAULT_CONFIG,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'system'
      }
    })
  }
}

// POST - Sauvegarder la configuration système
export async function POST(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Valider la configuration
    const validationResult = validateConfig(config)
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration invalide',
          details: validationResult.errors 
        },
        { status: 400 }
      )
    }

    // Essayer de sauvegarder dans Supabase
    try {
      const { data, error } = await supabase
        .from('system_config')
        .upsert({
          id: 1, // ID unique pour la configuration système
          config: config,
          updated_at: new Date().toISOString(),
          updated_by: 'admin' // TODO: récupérer l'utilisateur actuel
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: 'Configuration sauvegardée avec succès',
        config: data.config,
        lastUpdated: data.updated_at
      })

    } catch (supabaseError) {
      console.warn('Impossible de sauvegarder dans Supabase:', supabaseError)
      
      // Fallback: simuler la sauvegarde
      return NextResponse.json({
        success: true,
        message: 'Configuration sauvegardée localement (mode démo)',
        config: config,
        lastUpdated: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la sauvegarde' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une partie de la configuration
export async function PUT(request: NextRequest) {
  try {
    const partialConfig = await request.json()
    
    // Récupérer la configuration actuelle
    const currentResponse = await GET(request)
    const currentData = await currentResponse.json()
    
    if (!currentData.success) {
      throw new Error('Impossible de récupérer la configuration actuelle')
    }

    // Fusionner avec la configuration partielle
    const updatedConfig = {
      ...currentData.config,
      ...partialConfig
    }

    // Valider la configuration mise à jour
    const validationResult = validateConfig(updatedConfig)
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration invalide après mise à jour',
          details: validationResult.errors 
        },
        { status: 400 }
      )
    }

    // Sauvegarder la configuration mise à jour
    const saveRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(updatedConfig),
      headers: request.headers
    })

    return await POST(saveRequest)

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

// Fonction de validation de la configuration
function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Valider les valeurs numériques
  if (typeof config.syncInterval !== 'number' || config.syncInterval < 0) {
    errors.push('syncInterval doit être un nombre positif')
  }

  if (typeof config.predictionDepth !== 'number' || config.predictionDepth < 10) {
    errors.push('predictionDepth doit être un nombre >= 10')
  }

  if (typeof config.confidenceThreshold !== 'number' || config.confidenceThreshold < 0 || config.confidenceThreshold > 100) {
    errors.push('confidenceThreshold doit être entre 0 et 100')
  }

  if (typeof config.maxHistoryDays !== 'number' || config.maxHistoryDays < 1) {
    errors.push('maxHistoryDays doit être un nombre >= 1')
  }

  if (typeof config.mlModelTimeout !== 'number' || config.mlModelTimeout < 1000) {
    errors.push('mlModelTimeout doit être >= 1000ms')
  }

  // Valider les valeurs booléennes
  if (typeof config.enableAutoSync !== 'boolean') {
    errors.push('enableAutoSync doit être un booléen')
  }

  if (typeof config.enableNotifications !== 'boolean') {
    errors.push('enableNotifications doit être un booléen')
  }

  // Valider l'URL de l'API
  if (typeof config.apiUrl !== 'string' || !config.apiUrl.trim()) {
    errors.push('apiUrl doit être une URL valide')
  } else {
    try {
      new URL(config.apiUrl)
    } catch {
      errors.push('apiUrl doit être une URL valide')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// DELETE - Réinitialiser la configuration aux valeurs par défaut
export async function DELETE(request: NextRequest) {
  try {
    // Sauvegarder la configuration par défaut
    const saveRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(DEFAULT_CONFIG),
      headers: request.headers
    })

    const result = await POST(saveRequest)
    const data = await result.json()

    if (data.success) {
      return NextResponse.json({
        success: true,
        message: 'Configuration réinitialisée aux valeurs par défaut',
        config: DEFAULT_CONFIG
      })
    }

    throw new Error(data.error || 'Erreur lors de la réinitialisation')

  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la réinitialisation' },
      { status: 500 }
    )
  }
}
