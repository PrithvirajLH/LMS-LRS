/**
 * Audit trail for compliance-sensitive actions.
 *
 * Every admin/instructor action that changes state is logged:
 * user creation, role changes, enrollments, course publish,
 * credential management, password resets.
 *
 * Partition: "YYYY-MM" (monthly, matches statements table pattern)
 * RowKey: reverse timestamp + random suffix for ordering and uniqueness
 *
 * The audit log is immutable — entries are never updated or deleted.
 */

import { getTableClient } from "@/lib/azure/table-client";
import { randomBytes } from "crypto";

export interface AuditEntry {
  partitionKey: string;
  rowKey: string;
  /** Action category: user.create, user.role_change, enrollment.create, course.publish, etc. */
  action: string;
  /** Who performed the action (userId from session) */
  actorId: string;
  /** Actor's display name */
  actorName: string;
  /** Actor's role at the time */
  actorRole: string;
  /** What was acted on: userId, courseId, credentialKey, etc. */
  targetType: string;
  /** ID of the target resource */
  targetId: string;
  /** Human-readable summary */
  summary: string;
  /** JSON-serialized before/after or relevant details */
  details: string;
  /** ISO timestamp */
  timestamp: string;
  /** Client IP (for forensics) */
  ip: string;
}

const MAX_TICKS = 9999999999999;

function reverseTimestamp(date: Date): string {
  return String(MAX_TICKS - date.getTime()).padStart(13, "0");
}

/**
 * Write an immutable audit log entry.
 * Fire-and-forget — never blocks the API response.
 */
export async function audit(params: {
  action: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  summary: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    const table = await getTableClient("auditLog");
    const now = new Date();
    const pk = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const rk = `${reverseTimestamp(now)}-${randomBytes(4).toString("hex")}`;

    const entry: AuditEntry = {
      partitionKey: pk,
      rowKey: rk,
      action: params.action,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      targetType: params.targetType,
      targetId: params.targetId,
      summary: params.summary,
      details: params.details ? JSON.stringify(params.details) : "{}",
      timestamp: now.toISOString(),
      ip: params.ip || "",
    };

    await table.createEntity(entry);
  } catch {
    // Audit logging should never break the main flow
    // The structured logger already captures errors
  }
}
