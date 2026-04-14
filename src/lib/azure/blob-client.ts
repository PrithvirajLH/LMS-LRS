import {
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

const CONTAINER_NAMES = {
  statements: "xapi-statements",
  documents: "xapi-documents",
  attachments: "xapi-attachments",
} as const;

type ContainerName = keyof typeof CONTAINER_NAMES;

const clients = new Map<string, ContainerClient>();
const containersEnsured = new Set<string>();

async function ensureContainer(containerName: string): Promise<void> {
  if (containersEnsured.has(containerName)) return;
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(containerName);
  try {
    await containerClient.create();
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    // 409 = container already exists
    if (err.statusCode !== 409) throw e;
  }
  containersEnsured.add(containerName);
}

export async function getContainerClient(
  name: ContainerName
): Promise<ContainerClient> {
  const containerName = CONTAINER_NAMES[name];
  if (clients.has(containerName)) {
    return clients.get(containerName)!;
  }
  await ensureContainer(containerName);
  const serviceClient = BlobServiceClient.fromConnectionString(connectionString);
  const client = serviceClient.getContainerClient(containerName);
  clients.set(containerName, client);
  return client;
}

export async function uploadBlob(
  container: ContainerName,
  blobName: string,
  content: string | Buffer,
  contentType = "application/json"
): Promise<void> {
  const client = await getContainerClient(container);
  const blockBlob = client.getBlockBlobClient(blobName);
  const length = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
  await blockBlob.upload(content, length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

export async function downloadBlob(
  container: ContainerName,
  blobName: string
): Promise<string> {
  const client = await getContainerClient(container);
  const blockBlob = client.getBlockBlobClient(blobName);
  const response = await blockBlob.download(0);
  const chunks: Buffer[] = [];
  for await (const chunk of response.readableStreamBody as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function downloadBlobBuffer(
  container: ContainerName,
  blobName: string
): Promise<Buffer> {
  const client = await getContainerClient(container);
  const blockBlob = client.getBlockBlobClient(blobName);
  const response = await blockBlob.download(0);
  const chunks: Buffer[] = [];
  for await (const chunk of response.readableStreamBody as NodeJS.ReadableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function blobExists(
  container: ContainerName,
  blobName: string
): Promise<boolean> {
  const client = await getContainerClient(container);
  const blockBlob = client.getBlockBlobClient(blobName);
  return blockBlob.exists();
}

export async function deleteBlob(
  container: ContainerName,
  blobName: string
): Promise<void> {
  const client = await getContainerClient(container);
  const blockBlob = client.getBlockBlobClient(blobName);
  await blockBlob.deleteIfExists();
}
