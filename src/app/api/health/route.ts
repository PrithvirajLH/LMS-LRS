import { NextResponse } from "next/server";
import { getTableClient } from "@/lib/azure/table-client";

/**
 * GET /api/health — Health check endpoint.
 *
 * Returns 200 if the server is up and can reach Azure Table Storage.
 * Returns 503 if the storage backend is unreachable.
 * Used by load balancers, uptime monitors, and deployment pipelines.
 */
export async function GET() {
  const start = Date.now();

  try {
    // Verify Azure Table Storage connectivity
    const table = await getTableClient("sessions");
    // A lightweight query: just check the table is reachable
    // A point-read on a known partition is the cheapest possible check.
    // If the table doesn't exist yet, ensureTable (called by getTableClient) creates it.
    const iterator = table.listEntities({ queryOptions: { filter: "PartitionKey eq 'session'" } });
    await iterator.next();

    const latencyMs = Date.now() - start;

    return NextResponse.json(
      {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          azureTables: { status: "ok", latencyMs },
        },
      },
      { status: 200 }
    );
  } catch (e) {
    const latencyMs = Date.now() - start;
    console.error("Health check failed:", e);

    return NextResponse.json(
      {
        status: "unhealthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks: {
          azureTables: {
            status: "error",
            latencyMs,
            message: e instanceof Error ? e.message : "Unknown error",
          },
        },
      },
      { status: 503 }
    );
  }
}
