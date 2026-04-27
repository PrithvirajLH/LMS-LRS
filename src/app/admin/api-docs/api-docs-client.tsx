"use client";

/**
 * Client wrapper around swagger-ui-react.
 *
 * Why a separate file?
 *   - swagger-ui-react accesses the DOM during render — it must be loaded
 *     with `ssr: false`, which Next.js only allows from a "use client" file.
 *   - Keeping the page itself a Server Component lets us emit metadata and
 *     stay aligned with the rest of the admin app shell.
 */
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-sm text-gray-500">Loading API docs…</div>
  ),
});

export function ApiDocsClient() {
  return (
    <div className="swagger-ui-host">
      <SwaggerUI url="/api/docs/openapi.json" />
    </div>
  );
}
