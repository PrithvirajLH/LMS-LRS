import { compare } from "bcryptjs";
import { getTableClient } from "@/lib/azure/table-client";
import { credentialCache } from "@/lib/cache";
import { getLaunchToken, type LaunchTokenEntity } from "./launch-tokens";
import type { CredentialEntity } from "./types";

export interface AuthResult {
  authenticated: true;
  credential: CredentialEntity;
  launchToken?: LaunchTokenEntity;
}

export interface AuthError {
  authenticated: false;
  status: number;
  message: string;
}

const LMS_HOMEPAGE = "https://lms.creativeminds.com";

// Build a CredentialEntity-shaped object for a launch-token request so the
// downstream pipeline (rate limiter, audit fields, authority on stored
// statements) keeps working unchanged.
function synthesizeLaunchTokenCredential(
  token: LaunchTokenEntity
): CredentialEntity {
  return {
    partitionKey: "credential",
    rowKey: `lt:${token.rowKey}`,
    apiSecretHash: "",
    displayName: `Launch token (${token.email})`,
    authorityAgent: JSON.stringify({
      objectType: "Agent",
      account: { homePage: LMS_HOMEPAGE, name: token.email },
      name: token.userName,
    }),
    scopes: "statements/write",
    rateLimitPerMinute: 60,
    isActive: true,
  };
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

  // ── Launch-token path ──
  // The browser-side player authenticates with `lt:<token>`. The token is
  // looked up by exact match (no bcrypt) and binds the request to a single
  // user, course, and registration.
  if (apiKey === "lt") {
    const token = await getLaunchToken(apiSecret);
    if (!token) {
      return {
        authenticated: false,
        status: 401,
        message: "Invalid or expired launch token",
      };
    }
    return {
      authenticated: true,
      credential: synthesizeLaunchTokenCredential(token),
      launchToken: token,
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
