
import { NextResponse } from "next/server";

// Planning des tirages pour les tirages standards
const DRAW_SCHEDULE = {
  Lundi: {
    "10H": "Reveil",
    "13H": "Etoile",
    "16H": "Akwaba",
    "18H15": "Monday Special",
  },
  Mardi: {
    "10H": "La Matinale",
    "13H": "Emergence",
    "16H": "Sika",
    "18H15": "Lucky Tuesday",
  },
  Mercredi: {
    "10H": "Premiere Heure",
    "13H": "Fortune",
    "16H": "Baraka",
    "18H15": "Midweek",
  },
  Jeudi: {
    "10H": "Kado",
    "13H": "Privilege",
    "16H": "Monni",
    "18H15": "Fortune Thursday",
  },
  Vendredi: {
    "10H": "Cash",
    "13H": "Solution",
    "16H": "Wari",
    "18H15": "Friday Bonanza",
  },
  Samedi: {
    "10H": "Soutra",
    "13H": "Diamant",
    "16H": "Moaye",
    "18H15": "National",
  },
  Dimanche: {
    "10H": "Benediction",
    "13H": "Prestige",
    "16H": "Awale",
    "18H15": "Espoir",
  },
};

interface DrawResult {
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // e.g., "mai-2025"

  const baseUrl = "https://lotobonheur.ci/api/results";
  const url = month ? `${baseUrl}?month=${month}` : baseUrl;

  try {
    console.log(`Fetching from external API: ${url}`);

    // Fetch the API directly
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
        Referer: "https://lotobonheur.ci/resultats",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const resultsData = await response.json();

    if (!resultsData.success) {
      throw new Error("API returned unsuccessful response");
    }

    const drawsResultsWeekly = resultsData.drawsResultsWeekly;
    if (!drawsResultsWeekly || !Array.isArray(drawsResultsWeekly)) {
      throw new Error("Invalid API response structure");
    }

    // Valid draw names
    const validDrawNames = new Set<string>();
    Object.values(DRAW_SCHEDULE).forEach((day) => {
      Object.values(day).forEach((drawName) => validDrawNames.add(drawName));
    });

    const results: DrawResult[] = [];
    const currentYear = new Date().getFullYear();

    // Process draw results
    for (const week of drawsResultsWeekly) {
      if (!week.drawResultsDaily || !Array.isArray(week.drawResultsDaily)) {
        continue;
      }

      for (const dailyResult of week.drawResultsDaily) {
        const dateStr = dailyResult.date;
        let drawDate: string;

        try {
          // Parse date (e.g., "dimanche 04/05" to "2025-05-04")
          const [, dayMonth] = dateStr.split(" ");
          const [day, month] = dayMonth.split("/");
          const parsedDate = new Date(currentYear, Number.parseInt(month) - 1, Number.parseInt(day));
          drawDate = parsedDate.toISOString().split("T")[0];
        } catch (e) {
          console.warn(`Invalid date format: ${dateStr}, error: ${e}`);
          continue;
        }

        // Process standard draws
        if (dailyResult.drawResults?.standardDraws) {
          for (const draw of dailyResult.drawResults.standardDraws) {
            const drawName = draw.drawName;

            if (!validDrawNames.has(drawName) || draw.winningNumbers?.startsWith(".")) {
              continue; // Skip invalid or placeholder draws
            }

            // Parse numbers
            const winningNumbers = (draw.winningNumbers?.match(/\d+/g) || []).map(Number).slice(0, 5);
            const machineNumbers = (draw.machineNumbers?.match(/\d+/g) || []).map(Number).slice(0, 5);

            // Validate data (at least winning numbers are required)
            if (winningNumbers.length === 5) {
              results.push({
                draw_name: drawName,
                date: drawDate,
                gagnants: winningNumbers,
                machine: machineNumbers.length === 5 ? machineNumbers : undefined,
              });
            } else {
              console.warn(`Incomplete data for draw ${drawName}: ${winningNumbers}`);
            }
          }
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid draw results found for the specified period.",
          data: [],
          total: 0,
        },
        { status: 404 },
      );
    }

    // Sort by date (most recent first)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Successfully fetched ${results.length} results from external API`);

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
      source: "external_api",
      cached: true,
    });
  } catch (error) {
    console.error(`Error fetching from external API ${url}:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch results from external API",
        data: [],
        total: 0,
        source: "error",
      },
      { status: 500 },
    );
  }
}

// Handler pour les requêtes OPTIONS (CORS preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

