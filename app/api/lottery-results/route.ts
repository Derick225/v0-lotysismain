import { type NextRequest, NextResponse } from "next/server"
import { LotteryResultService } from "@/lib/supabase"
import { VALID_DRAW_NAMES, validateNumbers, validateDate, validateDrawName } from "@/app/lib/constants"
import logger from "@/app/lib/logger"

// GET - Récupérer les résultats de loterie
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const drawName = searchParams.get("draw_name")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const limit = searchParams.get("limit")
    const offset = searchParams.get("offset")

    logger.info("GET /api/lottery-results", { drawName, startDate, endDate, limit, offset })

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

    if (startDate && !validateDate(startDate)) {
      return NextResponse.json({ success: false, error: "Invalid start_date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    if (endDate && !validateDate(endDate)) {
      return NextResponse.json({ success: false, error: "Invalid end_date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    const limitNum = limit ? Number.parseInt(limit) : undefined
    const offsetNum = offset ? Number.parseInt(offset) : undefined

    if (limit && (isNaN(limitNum!) || limitNum! < 1 || limitNum! > 1000)) {
      return NextResponse.json({ success: false, error: "Limit must be between 1 and 1000" }, { status: 400 })
    }

    if (offset && (isNaN(offsetNum!) || offsetNum! < 0)) {
      return NextResponse.json({ success: false, error: "Offset must be 0 or positive" }, { status: 400 })
    }

    let results

    // Récupération selon les paramètres
    if (drawName) {
      results = await LotteryResultService.getByDrawName(drawName, limitNum)
    } else if (startDate && endDate) {
      results = await LotteryResultService.getByDateRange(startDate, endDate)
    } else {
      results = await LotteryResultService.getAll(limitNum, offsetNum)
    }

    logger.info(`Retrieved ${results.length} lottery results`)

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
      pagination: limitNum
        ? {
            limit: limitNum,
            offset: offsetNum || 0,
            hasMore: results.length === limitNum,
          }
        : undefined,
    })
  } catch (error) {
    logger.error("Error in GET /api/lottery-results", error)
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

// POST - Créer un nouveau résultat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { draw_name, date, gagnants, machine } = body

    logger.info("POST /api/lottery-results", { draw_name, date, gagnants, machine })

    // Validation des champs requis
    if (!draw_name || !date || !gagnants) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: draw_name, date, gagnants",
        },
        { status: 400 },
      )
    }

    // Validation du nom de tirage
    if (!validateDrawName(draw_name)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid draw name",
          validDrawNames: Array.from(VALID_DRAW_NAMES),
        },
        { status: 400 },
      )
    }

    // Validation de la date
    if (!validateDate(date)) {
      return NextResponse.json({ success: false, error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    // Validation des numéros gagnants
    if (!Array.isArray(gagnants) || !validateNumbers(gagnants)) {
      return NextResponse.json(
        {
          success: false,
          error: "gagnants must be an array of 5 unique numbers between 1 and 90",
        },
        { status: 400 },
      )
    }

    // Validation des numéros machine (optionnel)
    if (machine && (!Array.isArray(machine) || !validateNumbers(machine))) {
      return NextResponse.json(
        {
          success: false,
          error: "machine must be an array of 5 unique numbers between 1 and 90",
        },
        { status: 400 },
      )
    }

    // Vérifier si un résultat existe déjà pour ce tirage et cette date
    const existingResults = await LotteryResultService.getByDrawName(draw_name, 1000)
    const duplicate = existingResults.find((result) => result.date === date)

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: "A result already exists for this draw and date",
          existing: duplicate,
        },
        { status: 409 },
      )
    }

    // Créer le nouveau résultat
    const newResult = await LotteryResultService.create({
      draw_name,
      date,
      gagnants,
      machine,
    })

    logger.info(`Created new lottery result: ${newResult.id}`)

    return NextResponse.json(
      {
        success: true,
        data: newResult,
        message: "Lottery result created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error in POST /api/lottery-results", error)
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

// PUT - Mettre à jour un résultat existant
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || isNaN(Number.parseInt(id))) {
      return NextResponse.json({ success: false, error: "Valid ID parameter is required" }, { status: 400 })
    }

    const body = await request.json()
    const { draw_name, date, gagnants, machine } = body

    logger.info(`PUT /api/lottery-results?id=${id}`, { draw_name, date, gagnants, machine })

    // Validation des champs (tous optionnels pour PUT)
    if (draw_name && !validateDrawName(draw_name)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid draw name",
          validDrawNames: Array.from(VALID_DRAW_NAMES),
        },
        { status: 400 },
      )
    }

    if (date && !validateDate(date)) {
      return NextResponse.json({ success: false, error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    if (gagnants && (!Array.isArray(gagnants) || !validateNumbers(gagnants))) {
      return NextResponse.json(
        {
          success: false,
          error: "gagnants must be an array of 5 unique numbers between 1 and 90",
        },
        { status: 400 },
      )
    }

    if (machine && (!Array.isArray(machine) || !validateNumbers(machine))) {
      return NextResponse.json(
        {
          success: false,
          error: "machine must be an array of 5 unique numbers between 1 and 90",
        },
        { status: 400 },
      )
    }

    // Mettre à jour le résultat
    const updatedResult = await LotteryResultService.update(Number.parseInt(id), {
      draw_name,
      date,
      gagnants,
      machine,
    })

    logger.info(`Updated lottery result: ${id}`)

    return NextResponse.json({
      success: true,
      data: updatedResult,
      message: "Lottery result updated successfully",
    })
  } catch (error) {
    logger.error(`Error in PUT /api/lottery-results`, error)

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ success: false, error: "Lottery result not found" }, { status: 404 })
    }

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

// DELETE - Supprimer un résultat
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id || isNaN(Number.parseInt(id))) {
      return NextResponse.json({ success: false, error: "Valid ID parameter is required" }, { status: 400 })
    }

    logger.info(`DELETE /api/lottery-results?id=${id}`)

    await LotteryResultService.delete(Number.parseInt(id))

    logger.info(`Deleted lottery result: ${id}`)

    return NextResponse.json({
      success: true,
      message: "Lottery result deleted successfully",
    })
  } catch (error) {
    logger.error(`Error in DELETE /api/lottery-results`, error)

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ success: false, error: "Lottery result not found" }, { status: 404 })
    }

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
    },
  })
}
