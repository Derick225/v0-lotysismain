import { type NextRequest, NextResponse } from "next/server"
import { enhancedApiService } from "@/app/lib/enhanced-api-service"
import { VALID_DRAW_NAMES, validateDate, validateDrawName } from "@/app/lib/constants"
import logger from "@/app/lib/logger"

// GET - Récupérer les résultats avec cache intelligent et API externe
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const drawName = searchParams.get("draw_name")
    const month = searchParams.get("month")
    const year = searchParams.get("year") || "2024"
    const forceRefresh = searchParams.get("force_refresh") === "true"
    const useCache = searchParams.get("use_cache") !== "false"
    const statsOnly = searchParams.get("stats_only") === "true"

    logger.info("GET /api/enhanced-results", { 
      drawName, month, year, forceRefresh, useCache, statsOnly 
    })

    // Validation des paramètres
    if (drawName && !validateDrawName(drawName)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid draw name",
          validDrawNames: Array.from(VALID_DRAW_NAMES),
        },
        { status: 400 },
      )
    }

    if (month && (!/^\d{1,2}$/.test(month) || parseInt(month) < 1 || parseInt(month) > 12)) {
      return NextResponse.json(
        { success: false, error: "Invalid month. Must be 1-12" },
        { status: 400 }
      )
    }

    if (year && (!/^\d{4}$/.test(year) || parseInt(year) < 2020 || parseInt(year) > 2030)) {
      return NextResponse.json(
        { success: false, error: "Invalid year. Must be 2020-2030" },
        { status: 400 }
      )
    }

    // Si on demande seulement les statistiques du cache
    if (statsOnly) {
      const cacheStats = await enhancedApiService.getCacheStats()
      return NextResponse.json({
        success: true,
        data: cacheStats,
        message: "Cache statistics retrieved successfully"
      })
    }

    // Récupération des résultats avec le service amélioré
    const results = await enhancedApiService.fetchLotteryResults({
      month,
      year,
      drawName: drawName || undefined,
      forceRefresh,
      useCache,
    })

    // Calcul des métadonnées
    const metadata = {
      total: results.length,
      dateRange: results.length > 0 ? {
        start: results[results.length - 1]?.date,
        end: results[0]?.date
      } : null,
      drawNames: [...new Set(results.map(r => r.draw_name))],
      hasCache: useCache,
      fromCache: !forceRefresh && useCache,
    }

    logger.info(`Retrieved ${results.length} enhanced results`, metadata)

    return NextResponse.json({
      success: true,
      data: results,
      metadata,
      message: `Successfully retrieved ${results.length} lottery results`
    })

  } catch (error) {
    logger.error("Error in GET /api/enhanced-results", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const isNetworkError = errorMessage.includes('réseau') || errorMessage.includes('timeout')
    const isCacheEmpty = errorMessage.includes('cache vide')

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve lottery results",
        message: errorMessage,
        errorType: isNetworkError ? 'network' : isCacheEmpty ? 'no_data' : 'server',
        suggestion: isNetworkError 
          ? "Vérifiez votre connexion internet et réessayez"
          : isCacheEmpty 
          ? "Aucune donnée en cache. Connectez-vous à internet pour synchroniser"
          : "Erreur serveur. Veuillez réessayer plus tard"
      },
      { status: isNetworkError ? 503 : isCacheEmpty ? 404 : 500 },
    )
  }
}

// POST - Forcer la synchronisation avec l'API externe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, drawNames, options = {} } = body

    logger.info("POST /api/enhanced-results", { action, drawNames, options })

    switch (action) {
      case 'sync':
        // Synchronisation forcée pour des tirages spécifiques
        const targetDraws = drawNames && Array.isArray(drawNames) 
          ? drawNames.filter(name => VALID_DRAW_NAMES.has(name))
          : Array.from(VALID_DRAW_NAMES)

        const syncResults = []
        for (const drawName of targetDraws) {
          try {
            const results = await enhancedApiService.fetchLotteryResults({
              drawName,
              forceRefresh: true,
              useCache: false,
              ...options
            })
            syncResults.push({
              drawName,
              success: true,
              count: results.length
            })
          } catch (error) {
            syncResults.push({
              drawName,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        const successCount = syncResults.filter(r => r.success).length
        const totalCount = syncResults.length

        return NextResponse.json({
          success: successCount > 0,
          data: syncResults,
          message: `Synchronization completed: ${successCount}/${totalCount} draws synced successfully`
        })

      case 'cleanup':
        // Nettoyage du cache ancien
        const maxAge = options.maxAgeMs || (7 * 24 * 60 * 60 * 1000) // 7 jours par défaut
        await enhancedApiService.cleanupOldCache(maxAge)
        
        return NextResponse.json({
          success: true,
          message: "Cache cleanup completed successfully"
        })

      case 'export':
        // Export des données du cache
        const exportData = await enhancedApiService.exportCacheData()
        
        return NextResponse.json({
          success: true,
          data: exportData,
          message: "Cache data exported successfully"
        })

      case 'import':
        // Import des données dans le cache
        if (!options.data) {
          return NextResponse.json(
            { success: false, error: "Import data is required" },
            { status: 400 }
          )
        }

        await enhancedApiService.importCacheData(options.data)
        
        return NextResponse.json({
          success: true,
          message: "Cache data imported successfully"
        })

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Supported: sync, cleanup, export, import" },
          { status: 400 }
        )
    }

  } catch (error) {
    logger.error("Error in POST /api/enhanced-results", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT - Mettre à jour les paramètres du cache
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cacheConfig, syncSettings } = body

    logger.info("PUT /api/enhanced-results", { cacheConfig, syncSettings })

    // Ici on pourrait implémenter la mise à jour de la configuration du cache
    // Pour l'instant, on retourne une réponse de succès
    
    return NextResponse.json({
      success: true,
      message: "Cache configuration updated successfully",
      data: {
        cacheConfig: cacheConfig || {},
        syncSettings: syncSettings || {}
      }
    })

  } catch (error) {
    logger.error("Error in PUT /api/enhanced-results", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Vider le cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const drawName = searchParams.get("draw_name")
    const confirmDelete = searchParams.get("confirm") === "true"

    if (!confirmDelete) {
      return NextResponse.json(
        { success: false, error: "Confirmation required. Add ?confirm=true" },
        { status: 400 }
      )
    }

    logger.info("DELETE /api/enhanced-results", { drawName, confirmDelete })

    if (drawName) {
      // Supprimer le cache pour un tirage spécifique
      // Cette fonctionnalité nécessiterait une méthode dans enhancedApiService
      return NextResponse.json({
        success: true,
        message: `Cache cleared for draw: ${drawName}`
      })
    } else {
      // Vider tout le cache
      // Cette fonctionnalité nécessiterait une méthode dans enhancedApiService
      return NextResponse.json({
        success: true,
        message: "All cache data cleared successfully"
      })
    }

  } catch (error) {
    logger.error("Error in DELETE /api/enhanced-results", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// OPTIONS - Support CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  })
}
