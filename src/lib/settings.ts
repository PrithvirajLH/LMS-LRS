import { getTableClient } from "@/lib/azure/table-client";
import { TTLCache } from "@/lib/cache";

// Org-wide settings, editable by admins from /admin/settings.
// All values are stored as strings in Table Storage; typed accessors below.

export interface SettingEntity {
  partitionKey: string;   // "settings"
  rowKey: string;         // setting key
  value: string;
  updatedBy: string;
  updatedAt: string;
}

export type SettingKey = "defaultPassingScore";

// Hardcoded fallbacks if no global setting and no per-course override is set.
const FALLBACKS: Record<SettingKey, string> = {
  defaultPassingScore: "0.8",
};

const settingsCache = new TTLCache<string>({
  defaultTtlSeconds: 30,
  maxSize: 50,
});

export async function getGlobalSetting(key: SettingKey): Promise<string> {
  const cached = settingsCache.get(key);
  if (cached !== undefined) return cached;

  const table = await getTableClient("globalSettings");
  try {
    const entity = await table.getEntity<SettingEntity>("settings", key);
    settingsCache.set(key, entity.value);
    return entity.value;
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) {
      const fallback = FALLBACKS[key];
      settingsCache.set(key, fallback);
      return fallback;
    }
    throw e;
  }
}

export async function getDefaultPassingScore(): Promise<number> {
  const raw = await getGlobalSetting("defaultPassingScore");
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) return 0.8;
  return parsed;
}

export async function setGlobalSetting(
  key: SettingKey,
  value: string,
  updatedBy: string
): Promise<void> {
  const table = await getTableClient("globalSettings");
  const entity: SettingEntity = {
    partitionKey: "settings",
    rowKey: key,
    value,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  await table.upsertEntity(entity, "Replace");
  settingsCache.delete(key);
}

export async function listGlobalSettings(): Promise<SettingEntity[]> {
  const table = await getTableClient("globalSettings");
  const out: SettingEntity[] = [];
  const iter = table.listEntities<SettingEntity>({
    queryOptions: { filter: "PartitionKey eq 'settings'" },
  });
  for await (const e of iter) out.push(e);
  return out;
}
