/**
 * Parse tincan.xml from a Storyline xAPI package.
 * Extracts activity ID, course name, launch file, and all modules/interactions.
 */

export interface TinCanActivity {
  id: string;
  type: string;
  name: string;
  description: string;
  interactionType?: string;
}

export interface TinCanManifest {
  courseActivityId: string;
  courseName: string;
  launchFile: string;
  modules: TinCanActivity[];
  interactions: TinCanActivity[];
  totalActivities: number;
}

export function parseTinCanXml(xmlContent: string): TinCanManifest {
  // Simple XML parsing without a full library
  // tincan.xml structure: <tincan><activities><activity id="..." type="...">
  const activities: TinCanActivity[] = [];

  // Extract all <activity> elements
  const activityRegex = /<activity\s+id="([^"]*)"(?:\s+type="([^"]*)")?[^>]*>([\s\S]*?)<\/activity>/g;
  let match;

  while ((match = activityRegex.exec(xmlContent)) !== null) {
    const id = match[1];
    const type = match[2] || "";
    const body = match[3];

    // Extract name
    const nameMatch = body.match(/<name[^>]*>([^<]*)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : "";

    // Extract description
    const descMatch = body.match(/<description[^>]*>([^<]*)<\/description>/);
    const description = descMatch ? descMatch[1].trim() : "";

    // Extract launch file (only on root course activity)
    const launchMatch = body.match(/<launch[^>]*>([^<]*)<\/launch>/);

    // Extract interaction type
    const interactionMatch = body.match(/<interactionType>([^<]*)<\/interactionType>/);
    const interactionType = interactionMatch ? interactionMatch[1].trim() : undefined;

    activities.push({ id, type, name, description, interactionType });
  }

  if (activities.length === 0) {
    throw new Error("No activities found in tincan.xml");
  }

  // First activity with type "course" is the root
  const courseActivity = activities.find(
    (a) => a.type.includes("activities/course")
  ) || activities[0];

  // Find the launch file
  const launchRegex = /<launch[^>]*>([^<]*)<\/launch>/;
  const launchMatch = xmlContent.match(launchRegex);
  const launchFile = launchMatch ? launchMatch[1].trim() : "index_lms.html";

  // Separate modules from interactions
  const modules = activities.filter(
    (a) => a.type.includes("activities/module") || (a.type.includes("activities/course") && a.id !== courseActivity.id)
  );

  const interactions = activities.filter(
    (a) => a.type.includes("cmi.interaction")
  );

  return {
    courseActivityId: courseActivity.id,
    courseName: courseActivity.name,
    launchFile,
    modules,
    interactions,
    totalActivities: activities.length,
  };
}
