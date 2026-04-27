/**
 * OpenAPI 3.0 spec generated from the project's Zod schemas.
 *
 * The registry is populated lazily via `generateOpenApiDocument()` so the
 * server-side cost (Zod -> JSON Schema conversion) is only paid by the few
 * admins who hit `/admin/api-docs` or `/api/docs/openapi.json`. The result is
 * cached on the module — request handlers can call this multiple times per
 * lifetime of the Node process without rebuilding the spec.
 *
 * To document a new endpoint:
 *   1. Add its Zod schema in `src/lib/schemas/<area>.ts`.
 *   2. Wire it into `buildRegistry()` below with `registry.registerPath(...)`
 *      so it appears in the Swagger UI.
 */
import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";

import {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "./schemas/auth";
import {
  CreateUserSchema,
  UpdateUserRoleSchema,
  AdminResetPasswordSchema,
} from "./schemas/users";
import {
  SaveCourseSchema,
  UpdateCourseSchema,
  DeleteCourseQuerySchema,
} from "./schemas/courses";
import {
  CreateEnrollmentSchema,
  BulkEnrollSchema,
  CompleteEnrollmentSchema,
  RenewSchema,
} from "./schemas/enrollments";
import {
  CreateCredentialSchema,
  ToggleCredentialSchema,
} from "./schemas/credentials";
import {
  LaunchQuerySchema,
  EnrollSchema,
  PurgeSchema,
} from "./schemas/launch";
import { AuditQuerySchema } from "./schemas/audit";

// Adds `.openapi(...)` to every Zod type. Idempotent — safe to import twice.
extendZodWithOpenApi(z);

// Standard error envelope returned by validation failures and other 4xx.
const ErrorResponseSchema = z
  .object({
    error: z.literal(true),
    message: z.string(),
    issues: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
          code: z.string(),
        })
      )
      .optional(),
  })
  .openapi("ErrorResponse");

const SuccessMessageSchema = z
  .object({ message: z.string() })
  .openapi("SuccessMessage");

function buildRegistry(): OpenAPIRegistry {
  const r = new OpenAPIRegistry();

  // ── Security schemes ────────────────────────────────────────────────
  r.registerComponent("securitySchemes", "cookieAuth", {
    type: "apiKey",
    in: "cookie",
    name: "lms_session",
    description:
      "LMS session cookie issued by `/api/auth/login`. Required for /api/admin/* and /api/learner/* routes.",
  });
  r.registerComponent("securitySchemes", "basicAuth", {
    type: "http",
    scheme: "basic",
    description:
      "HTTP Basic Auth using `<apiKey>:<apiSecret>` from an admin-issued credential. Required for /api/xapi/* routes (xAPI 1.0.3 conformant LRS).",
  });

  // ── Common schemas ──────────────────────────────────────────────────
  r.register("ErrorResponse", ErrorResponseSchema);
  r.register("SuccessMessage", SuccessMessageSchema);
  r.register("LoginRequest", LoginSchema);
  r.register("RegisterRequest", RegisterSchema);
  r.register("ForgotPasswordRequest", ForgotPasswordSchema);
  r.register("ResetPasswordRequest", ResetPasswordSchema);
  r.register("CreateUserRequest", CreateUserSchema);
  r.register("UpdateUserRoleRequest", UpdateUserRoleSchema);
  r.register("AdminResetPasswordRequest", AdminResetPasswordSchema);
  r.register("SaveCourseRequest", SaveCourseSchema);
  r.register("UpdateCourseRequest", UpdateCourseSchema);
  r.register("CreateEnrollmentRequest", CreateEnrollmentSchema);
  r.register("BulkEnrollRequest", BulkEnrollSchema);
  r.register("CompleteEnrollmentRequest", CompleteEnrollmentSchema);
  r.register("RenewRequest", RenewSchema);
  r.register("CreateCredentialRequest", CreateCredentialSchema);
  r.register("ToggleCredentialRequest", ToggleCredentialSchema);
  r.register("PurgeRequest", PurgeSchema);
  r.register("EnrollRequest", EnrollSchema);

  const validationError = {
    description: "Validation failed",
    content: { "application/json": { schema: ErrorResponseSchema } },
  };
  const unauthorized = {
    description: "Authentication required or session expired",
    content: { "application/json": { schema: ErrorResponseSchema } },
  };
  const forbidden = {
    description: "Insufficient permissions for this resource",
    content: { "application/json": { schema: ErrorResponseSchema } },
  };

  // ── Auth ────────────────────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/auth/login",
    tags: ["Auth"],
    summary: "Sign in with email or employeeId + password",
    request: {
      body: { content: { "application/json": { schema: LoginSchema } } },
    },
    responses: {
      200: { description: "Session cookie issued" },
      400: validationError,
      401: { description: "Invalid credentials" },
      429: { description: "Too many login attempts" },
    },
  });

  r.registerPath({
    method: "post",
    path: "/api/auth/register",
    tags: ["Auth"],
    summary: "Self-register a learner account (always role=learner)",
    request: {
      body: { content: { "application/json": { schema: RegisterSchema } } },
    },
    responses: {
      201: { description: "User created and signed in" },
      400: validationError,
      429: { description: "Too many registration attempts" },
    },
  });

  r.registerPath({
    method: "post",
    path: "/api/auth/forgot-password",
    tags: ["Auth"],
    summary: "Request a password-reset token (email never disclosed)",
    request: {
      body: {
        content: { "application/json": { schema: ForgotPasswordSchema } },
      },
    },
    responses: {
      200: {
        description: "Always-success response, regardless of whether the email exists",
      },
      400: validationError,
    },
  });

  r.registerPath({
    method: "post",
    path: "/api/auth/reset-password",
    tags: ["Auth"],
    summary: "Reset password using a token from /forgot-password",
    request: {
      body: {
        content: { "application/json": { schema: ResetPasswordSchema } },
      },
    },
    responses: {
      200: { description: "Password reset" },
      400: validationError,
    },
  });

  // ── Admin Users ─────────────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/admin/users",
    tags: ["Admin Users"],
    summary: "Create a user",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateUserSchema } },
      },
    },
    responses: {
      201: { description: "User created" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  r.registerPath({
    method: "patch",
    path: "/api/admin/users",
    tags: ["Admin Users"],
    summary: "Update a user's role and/or status",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: UpdateUserRoleSchema } },
      },
    },
    responses: {
      200: { description: "User updated" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
      404: { description: "User not found" },
    },
  });

  r.registerPath({
    method: "post",
    path: "/api/admin/users/reset-password",
    tags: ["Admin Users"],
    summary: "Admin resets a user's password",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: AdminResetPasswordSchema } },
      },
    },
    responses: {
      200: { description: "Password reset" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Admin Courses ───────────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/admin/courses",
    tags: ["Admin Courses"],
    summary: "Save course metadata after a Storyline ZIP upload",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: SaveCourseSchema } },
      },
    },
    responses: {
      201: { description: "Course created (status=draft)" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  r.registerPath({
    method: "patch",
    path: "/api/admin/courses",
    tags: ["Admin Courses"],
    summary: "Update course metadata, completion policy, or publish status",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: UpdateCourseSchema } },
      },
    },
    responses: {
      200: { description: "Course updated" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  r.registerPath({
    method: "delete",
    path: "/api/admin/courses",
    tags: ["Admin Courses"],
    summary: "Delete a course (metadata + blobs + enrollments)",
    security: [{ cookieAuth: [] }],
    request: { query: DeleteCourseQuerySchema },
    responses: {
      200: { description: "Course deleted" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Admin Enrollments ───────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/admin/enrollments",
    tags: ["Admin Enrollments"],
    summary: "Enroll a single user or bulk-enroll many",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        description:
          "Either a single enrollment payload or a bulk payload with `userIds[]`.",
        content: {
          "application/json": {
            schema: z.union([BulkEnrollSchema, CreateEnrollmentSchema]),
          },
        },
      },
    },
    responses: {
      201: { description: "Enrollment(s) created" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  r.registerPath({
    method: "patch",
    path: "/api/admin/enrollments",
    tags: ["Admin Enrollments"],
    summary: "Mark an enrollment as completed",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CompleteEnrollmentSchema } },
      },
    },
    responses: {
      200: { description: "Enrollment marked completed" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Admin Credentials ───────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/admin/credentials",
    tags: ["Admin Credentials"],
    summary: "Mint a new xAPI Basic-Auth credential",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateCredentialSchema } },
      },
    },
    responses: {
      201: {
        description:
          "Credential created. The plain-text apiSecret is returned ONCE — store it now.",
      },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  r.registerPath({
    method: "patch",
    path: "/api/admin/credentials",
    tags: ["Admin Credentials"],
    summary: "Activate or deactivate a credential",
    security: [{ cookieAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: ToggleCredentialSchema } },
      },
    },
    responses: {
      200: { description: "Credential toggled" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Admin Audit ─────────────────────────────────────────────────────
  r.registerPath({
    method: "get",
    path: "/api/admin/audit",
    tags: ["Admin Audit"],
    summary: "Query the HIPAA audit trail",
    security: [{ cookieAuth: [] }],
    request: { query: AuditQuerySchema },
    responses: {
      200: { description: "Matching audit entries (newest first)" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Admin Purge ─────────────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/admin/purge",
    tags: ["Admin"],
    summary: "Wipe LRS test/conformance data (statements, documents, or all)",
    security: [{ cookieAuth: [] }],
    request: {
      body: { content: { "application/json": { schema: PurgeSchema } } },
    },
    responses: {
      200: { description: "Purge complete (per-resource counts)" },
      400: validationError,
      401: unauthorized,
      403: forbidden,
    },
  });

  // ── Learner ─────────────────────────────────────────────────────────
  r.registerPath({
    method: "post",
    path: "/api/learner/enroll",
    tags: ["Learner"],
    summary: "Self-enroll the signed-in learner in a published course",
    security: [{ cookieAuth: [] }],
    request: {
      body: { content: { "application/json": { schema: EnrollSchema } } },
    },
    responses: {
      201: { description: "Enrollment created" },
      400: validationError,
      401: unauthorized,
      404: { description: "Course not found or not published" },
    },
  });

  r.registerPath({
    method: "post",
    path: "/api/learner/renew",
    tags: ["Learner"],
    summary: "Renew an expired/expiring CE credit (resets enrollment)",
    security: [{ cookieAuth: [] }],
    request: {
      body: { content: { "application/json": { schema: RenewSchema } } },
    },
    responses: {
      200: { description: "Enrollment renewed" },
      400: validationError,
      401: unauthorized,
      404: { description: "Course or enrollment not found" },
    },
  });

  r.registerPath({
    method: "get",
    path: "/api/learner/launch",
    tags: ["Learner"],
    summary: "Get launch URL + xAPI launch token for a course",
    security: [{ cookieAuth: [] }],
    request: { query: LaunchQuerySchema },
    responses: {
      200: { description: "Launch payload (URL, activityId, token, actor)" },
      400: validationError,
      401: unauthorized,
      404: { description: "Course not found" },
    },
  });

  // ── xAPI (declared, no Zod schemas — wire format is xAPI 1.0.3 spec) ─
  r.registerPath({
    method: "post",
    path: "/api/xapi/statements",
    tags: ["xAPI"],
    summary: "Store xAPI statement(s) (1.0.3 conformant)",
    description:
      "Accepts a single statement object or an array. See xAPI spec §4.1.13. Authenticated via Basic Auth credential.",
    security: [{ basicAuth: [] }],
    responses: {
      200: { description: "Statement IDs (string[])" },
      400: { description: "Malformed statement" },
      401: { description: "Missing or invalid credentials" },
    },
  });

  r.registerPath({
    method: "get",
    path: "/api/xapi/statements",
    tags: ["xAPI"],
    summary: "Query statements (xAPI 1.0.3 §4.1.14)",
    security: [{ basicAuth: [] }],
    responses: {
      200: { description: "StatementResult object" },
      401: { description: "Missing or invalid credentials" },
    },
  });

  return r;
}

let cachedDocument: ReturnType<OpenApiGeneratorV3["generateDocument"]> | null = null;

export function generateOpenApiDocument() {
  if (cachedDocument) return cachedDocument;
  const registry = buildRegistry();
  const generator = new OpenApiGeneratorV3(registry.definitions);
  cachedDocument = generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "LMS-LRS API",
      version: "1.0.0",
      description:
        "Healthcare LMS with xAPI 1.0.3 conformant LRS. Validation is enforced on every request via Zod schemas in `src/lib/schemas/`.",
    },
    servers: [{ url: "/", description: "Same-origin" }],
    tags: [
      { name: "Auth", description: "Sign-in, registration, password reset" },
      { name: "Admin Users", description: "User management" },
      { name: "Admin Courses", description: "Course CRUD + completion policy" },
      { name: "Admin Enrollments", description: "Enrollment management" },
      { name: "Admin Credentials", description: "xAPI credential issuance" },
      { name: "Admin Audit", description: "HIPAA audit trail queries" },
      { name: "Admin", description: "Other admin operations" },
      { name: "Learner", description: "Learner-facing endpoints" },
      { name: "xAPI", description: "xAPI 1.0.3 LRS resources" },
    ],
  });
  return cachedDocument;
}
