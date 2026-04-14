import { compare } from "bcryptjs";
import { getTableClient } from "@/lib/azure/table-client";
import { credentialCache } from "@/lib/cache";
import type { CredentialEntity } from "./types";

export interface AuthResult {
  authenticated: true;
  credential: CredentialEntity;
}

export interface AuthError {
  authenticated: false;
  status: number;
  message: string;
}

export async function authenticateRequest(
  authHeader: string | null
): Promise<AuthResult | AuthError> {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return {
      authenticated: false,
      status: 401,
      message: "Authorization header with Basic scheme is required",
    };
  }

  const encoded = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return {
      authenticated: false,
      status: 401,
      message: "Invalid Basic Auth encoding",
    };
  }

  const colonIndex = decoded.indexOf(":");
  if (colonIndex === -1) {
    return {
      authenticated: false,
      status: 401,
      message: "Invalid Basic Auth format (expected key:secret)",
    };
  }

  const apiKey = decoded.slice(0, colonIndex);
  const apiSecret = decoded.slice(colonIndex + 1);

  if (!apiKey || !apiSecret) {
    return {
      authenticated: false,
      status: 401,
      message: "API key and secret are required",
    };
  }

  // ── Cache-first: skip bcrypt if we've verified this key+secret recently ──
  const cacheKey = `${apiKey}:${encoded}`; // encoded includes the secret
  const cached = credentialCache.get(cacheKey);
  if (cached) {
    return { authenticated: true, credential: cached.credential as unknown as CredentialEntity };
  }

  // ── Cache miss: verify against Azure Tables ──
  const table = await getTableClient("credentials");

  let entity: CredentialEntity;
  try {
    entity = await table.getEntity<CredentialEntity>("credential", apiKey);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 404) {
      return {
        authenticated: false,
        status: 401,
        message: "Invalid credentials",
      };
    }
    throw e;
  }

  if (!entity.isActive) {
    return {
      authenticated: false,
      status: 401,
      message: "Credential is deactivated",
    };
  }

  const matches = await compare(apiSecret, entity.apiSecretHash);
  if (!matches) {
    return {
      authenticated: false,
      status: 401,
      message: "Invalid credentials",
    };
  }

  // Cache the verified credential for 60 seconds (avoids bcrypt on every statement)
  credentialCache.set(cacheKey, {
    credential: entity as unknown as Record<string, unknown>,
    secretHash: entity.apiSecretHash,
  });

  return { authenticated: true, credential: entity };
}
