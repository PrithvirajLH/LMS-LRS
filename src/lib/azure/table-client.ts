import { TableClient, TableServiceClient } from "@azure/data-tables";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

const TABLE_NAMES = {
  credentials: "credentials",
  statements: "statements",
  statementIndex: "statementIndex",
  documents: "documents",
} as const;

type TableName = keyof typeof TABLE_NAMES;

const clients = new Map<string, TableClient>();
const tablesEnsured = new Set<string>();

async function ensureTable(tableName: string): Promise<void> {
  if (tablesEnsured.has(tableName)) return;
  const serviceClient = TableServiceClient.fromConnectionString(connectionString);
  try {
    await serviceClient.createTable(tableName);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    // 409 = table already exists, that's fine
    if (err.statusCode !== 409) throw e;
  }
  tablesEnsured.add(tableName);
}

export async function getTableClient(name: TableName): Promise<TableClient> {
  const tableName = TABLE_NAMES[name];
  if (clients.has(tableName)) {
    return clients.get(tableName)!;
  }
  await ensureTable(tableName);
  const client = TableClient.fromConnectionString(connectionString, tableName);
  clients.set(tableName, client);
  return client;
}
