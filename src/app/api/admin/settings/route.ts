import { requireAuth, handleAuthError } from "@/lib/auth/guard";
import { NextRequest, NextResponse } from "next/server";
import { listGlobalSettings, setGlobalSetting, type SettingKey } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const ALLOWED_KEYS: SettingKey[] = ["defaultPassingScore"];

// GET /api/admin/settings — list every org-wide setting
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["admin"]);
    const settings = await listGlobalSettings();
    return NextResponse.json({
      settings: settings.map((s) => ({
        key: s.rowKey,
        value: s.value,
        updatedBy: s.updatedBy,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("GET /api/admin/settings failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to load settings" }, { status: 500 });
  }
}

// PATCH /api/admin/settings — update a single setting
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ["admin"]);
    const body = await request.json();
    const { key, value } = body as { key?: string; value?: string };

    if (!key || !ALLOWED_KEYS.includes(key as SettingKey)) {
      return NextResponse.json(
        { error: true, message: `Unknown or unsupported setting key` },
        { status: 400 }
      );
    }

    if (typeof value !== "string") {
      return NextResponse.json(
        { error: true, message: "value must be a string" },
        { status: 400 }
      );
    }

    // Per-key validation
    if (key === "defaultPassingScore") {
      const n = parseFloat(value);
      if (Number.isNaN(n) || n < 0 || n > 1) {
        return NextResponse.json(
          { error: true, message: "defaultPassingScore must be a number between 0 and 1" },
          { status: 400 }
        );
      }
    }

    await setGlobalSetting(key as SettingKey, value, auth.session.userId);

    audit({
      action: "settings.update",
      actorId: auth.session.userId,
      actorName: auth.session.userName,
      actorRole: auth.session.role,
      targetType: "setting",
      targetId: key,
      summary: `Updated org setting "${key}" to "${value}"`,
      details: { key, value },
      ip: getClientIp(request),
    });

    return NextResponse.json({ key, value });
  } catch (e) {
    const authResp = handleAuthError(e); if (authResp) return authResp;
    logger.error("PATCH /api/admin/settings failed", { error: e });
    return NextResponse.json({ error: true, message: "Failed to update setting" }, { status: 500 });
  }
}
