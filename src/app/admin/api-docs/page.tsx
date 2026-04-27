/**
 * Admin-only Swagger UI mounted at /admin/api-docs.
 *
 * The OpenAPI spec is fetched from `/api/docs/openapi.json` (admin-guarded
 * server route). The admin layout already runs the role check before this
 * page renders, so we don't repeat it here.
 *
 * `swagger-ui-react` is client-only (DOM access during render), so the
 * component is dynamically imported with `ssr: false`.
 */
import { ApiDocsClient } from "./api-docs-client";

export const metadata = {
  title: "API Docs · LMS-LRS",
};

export default function ApiDocsPage() {
  return (
    <div className="h-full bg-white">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">API Documentation</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generated from Zod schemas. Try it out using your current session — every
          endpoint shown here is authenticated by your admin cookie.
        </p>
      </div>
      <ApiDocsClient />
    </div>
  );
}
