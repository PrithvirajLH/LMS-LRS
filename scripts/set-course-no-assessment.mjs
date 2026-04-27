/**
 * Test helper: flip a course's `hasAssessment` flag via the table client.
 * Used to verify the "no-quiz" code path of evaluateCompletion.
 *
 *   node --env-file=.env.local scripts/set-course-no-assessment.mjs <courseId> <true|false>
 */
import { TableClient } from "@azure/data-tables";

const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("AZURE_STORAGE_CONNECTION_STRING is not set");
  process.exit(1);
}

const courseId = process.argv[2];
const hasAssessmentArg = process.argv[3];

if (!courseId || !["true", "false"].includes(hasAssessmentArg)) {
  console.error("Usage: node set-course-no-assessment.mjs <courseId> <true|false>");
  process.exit(1);
}

const hasAssessment = hasAssessmentArg === "true";
const client = TableClient.fromConnectionString(conn, "courses");

await client.updateEntity(
  { partitionKey: "course", rowKey: courseId, hasAssessment },
  "Merge"
);
console.log(`Set course ${courseId} hasAssessment = ${hasAssessment}`);
