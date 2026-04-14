import { requireAuth, isAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { getTableClient } from "@/lib/azure/table-client";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { CredentialEntity } from "@/lib/lrs/types";

// POST /api/admin/credentials — Create a new API credential
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();
    const displayName: string = body.displayName || "Unnamed Credential";
    const scopes: string = body.scopes || "statements/write,statements/read";

    // Generate API key and secret
    const apiKey = `ak_${randomBytes(24).toString("hex")}`;
    const apiSecret = `as_${randomBytes(32).toString("hex")}`;

    // Hash the secret for storage
    const apiSecretHash = await hash(apiSecret, 10);

    // Build the authority agent for this credential
    const authorityAgent = JSON.stringify({
      objectType: "Agent",
      account: {
        homePage: body.homePage || "https://lrs.example.com",
        name: apiKey,
      },
      name: displayName,
    });

    const table = await getTableClient("credentials");

    const entity: CredentialEntity = {
      partitionKey: "credential",
      rowKey: apiKey,
      apiSecretHash,
      displayName,
      authorityAgent,
      scopes,
      rateLimitPerMinute: body.rateLimitPerMinute || 300,
      isActive: true,
    };

    await table.createEntity(entity);

    audit({
      action: "credential.create",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "credential", targetId: apiKey,
      summary: `Created API credential "${displayName}"`,
      details: { displayName, scopes },
      ip: getClientIp(request),
    });

    // Return the key and secret (secret is shown only once)
    return NextResponse.json(
      {
        apiKey,
        apiSecret,
        displayName,
        scopes: scopes.split(","),
        message:
          "Save the apiSecret now — it cannot be retrieved again. Use Basic Auth with base64(apiKey:apiSecret).",
      },
      { status: 201 }
    );
  } catch (e) {
    logger.error("POST /api/admin/credentials failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to create credential" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/credentials — Toggle active status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const body = await request.json();
    const { apiKey, isActive } = body;
    if (!apiKey) {
      return NextResponse.json({ error: true, message: "apiKey is required" }, { status: 400 });
    }

    const table = await getTableClient("credentials");
    await table.updateEntity(
      { partitionKey: "credential", rowKey: apiKey, isActive: !!isActive },
      "Merge"
    );

    audit({
      action: isActive ? "credential.activate" : "credential.deactivate",
      actorId: auth.session.userId, actorName: auth.session.userName, actorRole: auth.session.role,
      targetType: "credential", targetId: apiKey,
      summary: `${isActive ? "Activated" : "Deactivated"} API credential ${apiKey}`,
      ip: getClientIp(request),
    });

    return NextResponse.json({ apiKey, isActive: !!isActive });
  } catch (e) {
    logger.error("PATCH /api/admin/credentials failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to update credential" },
      { status: 500 }
    );
  }
}

// GET /api/admin/credentials — List all credentials (without secrets)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["instructor", "admin"]); if (isAuthError(auth)) return auth;
    const table = await getTableClient("credentials");
    const credentials: Array<{
      apiKey: string;
      displayName: string;
      scopes: string[];
      isActive: boolean;
      rateLimitPerMinute: number;
    }> = [];

    const iterator = table.listEntities<CredentialEntity>({
      queryOptions: { filter: "PartitionKey eq 'credential'" },
    });

    for await (const entity of iterator) {
      credentials.push({
        apiKey: entity.rowKey,
        displayName: entity.displayName,
        scopes: entity.scopes.split(","),
        isActive: entity.isActive,
        rateLimitPerMinute: entity.rateLimitPerMinute,
      });
    }

    return NextResponse.json({ credentials });
  } catch (e) {
    logger.error("GET /api/admin/credentials failed", { error: e });
    return NextResponse.json(
      { error: true, message: "Failed to list credentials" },
      { status: 500 }
    );
  }
}
