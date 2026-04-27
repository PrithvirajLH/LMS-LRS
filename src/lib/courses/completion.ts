import { getTableClient } from "@/lib/azure/table-client";
import { downloadBlob } from "@/lib/azure/blob-client";
import { getDefaultPassingScore } from "@/lib/settings";
import type { CourseEntity } from "./course-storage";
import type { StatementEntity, XAPIStatement } from "@/lib/lrs/types";

const VERB_COMPLETED = "http://adlnet.gov/expapi/verbs/completed";
const VERB_PASSED = "http://adlnet.gov/expapi/verbs/passed";
const VERB_FAILED = "http://adlnet.gov/expapi/verbs/failed";
const LMS_HOMEPAGE = "https://lms.creativeminds.com";

export interface CompletionDecision {
  shouldComplete: boolean;
  // Score in 0..100 (rounded). 0 if no scored statement was found.
  score: number;
  completedDate: string;
  // Effective passing score used for this decision (0..1).
  effectivePassingScore: number;
  // hasAssessment used (after applying course/global/fallback resolution).
  hasAssessment: boolean;
  // Human-readable reasons useful for audit/debug.
  reasons: string[];
  // For dashboard rendering even when not yet complete.
  hasStatements: boolean;
  uniqueModules: number;
}

// Resolve the effective policy for a course by walking
// per-course → org-wide setting → hardcoded fallback.
export async function resolveCoursePolicy(course: CourseEntity): Promise<{
  hasAssessment: boolean;
  passingScore: number;
}> {
  const hasAssessment = course.hasAssessment ?? true;
  const defaultScore = await getDefaultPassingScore();
  const passingScore = course.passingScore ?? defaultScore;
  return { hasAssessment, passingScore };
}

// Generate "YYYY-MM" partition keys for the last `monthsBack` months,
// matching the existing dashboard scan window.
function recentPartitions(monthsBack: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

// Decide whether a learner has truly completed a course based on the
// statements the LRS holds. The score on the certificate is derived
// here, not from any single client-supplied payload.
export async function evaluateCompletion(
  course: CourseEntity,
  email: string
): Promise<CompletionDecision> {
  const policy = await resolveCoursePolicy(course);
  const reasons: string[] = [];

  const decision: CompletionDecision = {
    shouldComplete: false,
    score: 0,
    completedDate: "",
    effectivePassingScore: policy.passingScore,
    hasAssessment: policy.hasAssessment,
    reasons,
    hasStatements: false,
    uniqueModules: 0,
  };

  if (!course.activityId) {
    reasons.push("course has no activityId");
    return decision;
  }

  const stmtTable = await getTableClient("statements");
  const actorIfiValue = `${LMS_HOMEPAGE}::${email}`.replace(/'/g, "''");

  let hasCompletedVerb = false;
  let completedDate = "";
  let hasFailedVerb = false;
  let bestScaledScore = 0;
  const moduleIds = new Set<string>();

  for (const pk of recentPartitions(3)) {
    const filter = `PartitionKey eq '${pk}' and actorIfiType eq 'account' and actorIfiValue eq '${actorIfiValue}'`;
    const iter = stmtTable.listEntities<StatementEntity>({ queryOptions: { filter } });

    for await (const entity of iter) {
      const objId = entity.objectId;
      if (!objId || !objId.startsWith(course.activityId)) continue;

      decision.hasStatements = true;

      // Track sub-activities visited (used by dashboard for progress %)
      if (objId !== course.activityId) {
        moduleIds.add(objId);
      }

      // Course-root verbs are the ones that drive completion
      if (objId === course.activityId) {
        if (entity.verbId === VERB_COMPLETED) {
          hasCompletedVerb = true;
          if (!completedDate || entity.stored < completedDate) {
            completedDate = entity.stored;
          }
        }
        if (entity.verbId === VERB_FAILED) {
          hasFailedVerb = true;
        }

        // Pull the full statement to read the score for assessed courses.
        // Storyline emits result.score on both `passed` and `completed`
        // statements, so we accept the score from any verb on the root.
        if (policy.hasAssessment) {
          try {
            const json = await downloadBlob("statements", `${entity.statementId}.json`);
            const stmt = JSON.parse(json) as XAPIStatement;
            const scaled = stmt.result?.score?.scaled;
            if (typeof scaled === "number" && scaled > bestScaledScore) {
              // A failed-verb statement with a high score is still a fail —
              // record the score for visibility but don't let it pass the gate.
              if (entity.verbId !== VERB_FAILED) {
                bestScaledScore = scaled;
              }
            }
          } catch {
            // Ignore individual blob read errors — we have many statements
          }
        }
      }
    }
  }

  decision.uniqueModules = moduleIds.size;
  decision.score = Math.round(bestScaledScore * 100);
  decision.completedDate = completedDate;

  if (!hasCompletedVerb) {
    reasons.push("no verbs/completed received on course root");
    return decision;
  }

  if (!policy.hasAssessment) {
    decision.shouldComplete = true;
    reasons.push("course has no assessment — verbs/completed accepted");
    return decision;
  }

  if (hasFailedVerb && bestScaledScore < policy.passingScore) {
    reasons.push("learner has a verbs/failed on course root and best score is below threshold");
    return decision;
  }

  if (bestScaledScore < policy.passingScore) {
    reasons.push(
      `best score ${bestScaledScore.toFixed(2)} is below passing threshold ${policy.passingScore.toFixed(2)}`
    );
    return decision;
  }

  decision.shouldComplete = true;
  reasons.push(
    `score ${bestScaledScore.toFixed(2)} meets passing threshold ${policy.passingScore.toFixed(2)}`
  );
  return decision;
}
