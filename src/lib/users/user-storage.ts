import { v4 as uuidv4 } from "uuid";
import { getTableClient } from "@/lib/azure/table-client";

// Escape single quotes in OData filter values
function escapeOData(value: string): string {
  return value.replace(/'/g, "''");
}

// ── User Entity ──
export interface UserEntity {
  partitionKey: string; // facility slug
  rowKey: string;       // userId
  name: string;
  email: string;
  employeeId: string;
  facility: string;
  department: string;
  position: string;
  status: string;       // "active" | "pending" | "inactive"
  tags: string;         // comma-separated: "department-nursing,position-cna"
  createdAt: string;
  updatedAt: string;
}

// ── Enrollment Entity ──
export interface EnrollmentEntity {
  partitionKey: string; // userId
  rowKey: string;       // courseId
  userId: string;
  courseId: string;
  courseTitle: string;
  assignedDate: string;
  dueDate: string;
  completedDate: string;
  score: number;
  timeSpent: number;    // minutes
  status: string;       // "assigned" | "in_progress" | "completed"
  completedOnTime: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Users CRUD ──

export async function createUser(data: Omit<UserEntity, "partitionKey" | "rowKey" | "createdAt" | "updatedAt">): Promise<UserEntity> {
  const table = await getTableClient("users");
  const userId = uuidv4().slice(0, 8);
  const facilitySlug = data.facility.toLowerCase().replace(/\s+/g, "-");
  const tags = `department-${data.department.toLowerCase().replace(/\s+/g, "-")},position-${data.position.toLowerCase().replace(/\s+/g, "-")}`;
  const now = new Date().toISOString();

  const entity: UserEntity = {
    partitionKey: facilitySlug,
    rowKey: userId,
    name: data.name,
    email: data.email,
    employeeId: data.employeeId,
    facility: data.facility,
    department: data.department,
    position: data.position,
    status: data.status || "active",
    tags,
    createdAt: now,
    updatedAt: now,
  };

  await table.createEntity(entity);
  return entity;
}

export async function listUsers(facility?: string): Promise<UserEntity[]> {
  const table = await getTableClient("users");
  const users: UserEntity[] = [];

  const filter = facility
    ? `PartitionKey eq '${escapeOData(facility.toLowerCase().replace(/\s+/g, "-"))}'`
    : undefined;

  const iter = table.listEntities<UserEntity>({
    queryOptions: filter ? { filter } : undefined,
  });

  for await (const entity of iter) {
    users.push(entity);
  }

  return users;
}

export async function getUser(userId: string): Promise<UserEntity | null> {
  const table = await getTableClient("users");
  // We need to scan since we don't know the partition key
  const iter = table.listEntities<UserEntity>({
    queryOptions: { filter: `RowKey eq '${escapeOData(userId)}'` },
  });

  for await (const entity of iter) {
    return entity;
  }
  return null;
}

// ── Enrollments CRUD ──

export async function createEnrollment(data: {
  userId: string;
  courseId: string;
  courseTitle: string;
  assignedDate: string;
  dueDate: string;
}): Promise<EnrollmentEntity> {
  const table = await getTableClient("enrollments");
  const now = new Date().toISOString();

  const entity: EnrollmentEntity = {
    partitionKey: data.userId,
    rowKey: data.courseId,
    userId: data.userId,
    courseId: data.courseId,
    courseTitle: data.courseTitle,
    assignedDate: data.assignedDate,
    dueDate: data.dueDate,
    completedDate: "",
    score: 0,
    timeSpent: 0,
    status: "assigned",
    completedOnTime: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await table.createEntity(entity);
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    if (err.statusCode === 409) {
      // Already enrolled — update
      await table.updateEntity(entity, "Replace");
    } else throw e;
  }

  return entity;
}

export async function bulkEnroll(data: {
  userIds: string[];
  courseId: string;
  courseTitle: string;
  assignedDate: string;
  dueDate: string;
}): Promise<number> {
  let count = 0;
  for (const userId of data.userIds) {
    await createEnrollment({
      userId,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      assignedDate: data.assignedDate,
      dueDate: data.dueDate,
    });
    count++;
  }
  return count;
}

export async function getUserEnrollments(userId: string): Promise<EnrollmentEntity[]> {
  const table = await getTableClient("enrollments");
  const enrollments: EnrollmentEntity[] = [];

  const iter = table.listEntities<EnrollmentEntity>({
    queryOptions: { filter: `PartitionKey eq '${escapeOData(userId)}'` },
  });

  for await (const entity of iter) {
    enrollments.push(entity);
  }

  return enrollments;
}

export async function getAllEnrollments(): Promise<EnrollmentEntity[]> {
  const table = await getTableClient("enrollments");
  const enrollments: EnrollmentEntity[] = [];

  const iter = table.listEntities<EnrollmentEntity>();
  for await (const entity of iter) {
    enrollments.push(entity);
  }

  return enrollments;
}

export async function updateEnrollment(
  userId: string,
  courseId: string,
  updates: Partial<EnrollmentEntity>
): Promise<void> {
  const table = await getTableClient("enrollments");
  await table.updateEntity(
    { partitionKey: userId, rowKey: courseId, ...updates, updatedAt: new Date().toISOString() },
    "Merge"
  );
}

/**
 * Mark an enrollment as completed.
 * Calculates completedOnTime based on completedDate vs dueDate.
 */
export async function markEnrollmentCompleted(
  userId: string,
  courseId: string,
  completedDate: string,
  score: number,
  timeSpent: number
): Promise<void> {
  // Get the enrollment to check due date
  const table = await getTableClient("enrollments");
  let enrollment: EnrollmentEntity | null = null;

  try {
    enrollment = await table.getEntity<EnrollmentEntity>(userId, courseId);
  } catch {
    return; // No enrollment found
  }

  const completedOnTime = new Date(completedDate) <= new Date(enrollment.dueDate);

  await table.updateEntity(
    {
      partitionKey: userId,
      rowKey: courseId,
      status: "completed",
      completedDate,
      score,
      timeSpent,
      completedOnTime,
      updatedAt: new Date().toISOString(),
    },
    "Merge"
  );
}
