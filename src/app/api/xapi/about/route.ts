import { NextRequest } from "next/server";
import { validateVersionHeader, xapiResponse, xapiError } from "@/lib/lrs/headers";

// GET /api/xapi/about — LRS metadata
export async function GET(request: NextRequest) {
  const versionError = validateVersionHeader(
    request.headers.get("X-Experience-API-Version")
  );
  if (versionError) return xapiError(versionError, 400);

  return xapiResponse({
    version: ["1.0.3", "1.0.2", "1.0.1", "1.0.0"],
    extensions: {},
  });
}
