import { xapiResponse } from "@/lib/lrs/headers";

// GET /api/xapi/about — LRS metadata
// The About resource MUST NOT require the X-Experience-API-Version header per spec.
export async function GET() {
  return xapiResponse({
    version: ["1.0.3", "1.0.2", "1.0.1", "1.0.0"],
    extensions: {},
  });
}
