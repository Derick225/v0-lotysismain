<<<<<<< HEAD
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  try {
    // Test database connection
    const dbStart = Date.now()
    try {
      const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

      checks.database = {
        status: error ? "unhealthy" : "healthy",
        response_time: Date.now() - dbStart,
        error: error?.message,
        details: {
          connection: error ? "failed" : "active",
          query_executed: !error,
        },
      }
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        response_time: Date.now() - dbStart,
        error: error instanceof Error ? error.message : "Database connection failed",
        details: {
          connection: "failed",
          query_executed: false,
        },
      }
    }

    // Test API endpoints
    const apiStart = Date.now()
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/lottery-results?limit=1`,
      )
      checks.api = {
        status: response.ok ? "healthy" : "degraded",
        response_time: Date.now() - apiStart,
        error: response.ok ? null : `HTTP ${response.status}`,
        details: {
          endpoint: "/api/lottery-results",
          status_code: response.status,
        },
      }
    } catch (error) {
      checks.api = {
        status: "unhealthy",
        response_time: Date.now() - apiStart,
        error: error instanceof Error ? error.message : "API endpoint failed",
        details: {
          endpoint: "/api/lottery-results",
          status_code: null,
        },
      }
    }

    // Test external API
    const externalStart = Date.now()
    try {
      const response = await fetch("https://lotobonheur.ci/api/results", {
        method: "GET",
        headers: {
          "User-Agent": "Lotysis-Monitor/1.0",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      checks.external_api = {
        status: response.ok ? "healthy" : "degraded",
        response_time: Date.now() - externalStart,
        error: response.ok ? null : `HTTP ${response.status}`,
        details: {
          endpoint: "https://lotobonheur.ci/api/results",
          status_code: response.status,
        },
      }
    } catch (error) {
      checks.external_api = {
        status: "degraded", // External API issues are not critical
        response_time: Date.now() - externalStart,
        error: error instanceof Error ? error.message : "External API failed",
        details: {
          endpoint: "https://lotobonheur.ci/api/results",
          status_code: null,
        },
      }
    }

    // System metrics
    const memoryUsage = process.memoryUsage()
    checks.system = {
      status: "healthy",
      response_time: 0,
      details: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        uptime: process.uptime(),
        node_version: process.version,
        platform: process.platform,
      },
    }

    // Determine overall status
    const statuses = Object.values(checks).map((check) => check.status)
    let overallStatus = "healthy"

    if (statuses.includes("unhealthy")) {
      overallStatus = "unhealthy"
    } else if (statuses.includes("degraded")) {
      overallStatus = "degraded"
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time: totalTime,
      checks,
      summary: {
        total_checks: Object.keys(checks).length,
        healthy: statuses.filter((s) => s === "healthy").length,
        degraded: statuses.filter((s) => s === "degraded").length,
        unhealthy: statuses.filter((s) => s === "unhealthy").length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Health check failed",
        checks,
      },
      { status: 500 },
    )
  }
}

// Support for HEAD requests (common for health checks)
export async function HEAD() {
  try {
    // Quick health check without detailed response
    const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

    return new NextResponse(null, {
      status: error ? 503 : 200,
      headers: {
        "Content-Type": "application/json",
        "X-Health-Status": error ? "unhealthy" : "healthy",
      },
    })
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "X-Health-Status": "unhealthy",
      },
    })
  }
}
=======
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const startTime = Date.now()
  const checks: Record<string, any> = {}

  try {
    // Test database connection
    const dbStart = Date.now()
    try {
      const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

      checks.database = {
        status: error ? "unhealthy" : "healthy",
        response_time: Date.now() - dbStart,
        error: error?.message,
        details: {
          connection: error ? "failed" : "active",
          query_executed: !error,
        },
      }
    } catch (error) {
      checks.database = {
        status: "unhealthy",
        response_time: Date.now() - dbStart,
        error: error instanceof Error ? error.message : "Database connection failed",
        details: {
          connection: "failed",
          query_executed: false,
        },
      }
    }

    // Test API endpoints
    const apiStart = Date.now()
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/lottery-results?limit=1`,
      )
      checks.api = {
        status: response.ok ? "healthy" : "degraded",
        response_time: Date.now() - apiStart,
        error: response.ok ? null : `HTTP ${response.status}`,
        details: {
          endpoint: "/api/lottery-results",
          status_code: response.status,
        },
      }
    } catch (error) {
      checks.api = {
        status: "unhealthy",
        response_time: Date.now() - apiStart,
        error: error instanceof Error ? error.message : "API endpoint failed",
        details: {
          endpoint: "/api/lottery-results",
          status_code: null,
        },
      }
    }

    // Test external API
    const externalStart = Date.now()
    try {
      const response = await fetch("https://lotobonheur.ci/api/results", {
        method: "GET",
        headers: {
          "User-Agent": "Lotysis-Monitor/1.0",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      checks.external_api = {
        status: response.ok ? "healthy" : "degraded",
        response_time: Date.now() - externalStart,
        error: response.ok ? null : `HTTP ${response.status}`,
        details: {
          endpoint: "https://lotobonheur.ci/api/results",
          status_code: response.status,
        },
      }
    } catch (error) {
      checks.external_api = {
        status: "degraded", // External API issues are not critical
        response_time: Date.now() - externalStart,
        error: error instanceof Error ? error.message : "External API failed",
        details: {
          endpoint: "https://lotobonheur.ci/api/results",
          status_code: null,
        },
      }
    }

    // System metrics
    const memoryUsage = process.memoryUsage()
    checks.system = {
      status: "healthy",
      response_time: 0,
      details: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        uptime: process.uptime(),
        node_version: process.version,
        platform: process.platform,
      },
    }

    // Determine overall status
    const statuses = Object.values(checks).map((check) => check.status)
    let overallStatus = "healthy"

    if (statuses.includes("unhealthy")) {
      overallStatus = "unhealthy"
    } else if (statuses.includes("degraded")) {
      overallStatus = "degraded"
    }

    const totalTime = Date.now() - startTime

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time: totalTime,
      checks,
      summary: {
        total_checks: Object.keys(checks).length,
        healthy: statuses.filter((s) => s === "healthy").length,
        degraded: statuses.filter((s) => s === "degraded").length,
        unhealthy: statuses.filter((s) => s === "unhealthy").length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        response_time: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Health check failed",
        checks,
      },
      { status: 500 },
    )
  }
}

// Support for HEAD requests (common for health checks)
export async function HEAD() {
  try {
    // Quick health check without detailed response
    const { data, error } = await supabase.from("lottery_results").select("count").limit(1)

    return new NextResponse(null, {
      status: error ? 503 : 200,
      headers: {
        "Content-Type": "application/json",
        "X-Health-Status": error ? "unhealthy" : "healthy",
      },
    })
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "X-Health-Status": "unhealthy",
      },
    })
  }
}
>>>>>>> ffb12d4 (changement)
