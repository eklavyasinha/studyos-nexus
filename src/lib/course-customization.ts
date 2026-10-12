import type { Item } from "./types";

/** Marker values used only by courses created through the local assistant. */
export const CUSTOM_COURSE_MARKER = "custom-course" as const;
export const CUSTOM_COURSE = CUSTOM_COURSE_MARKER;
export const CUSTOM_COURSE_DOMAIN = CUSTOM_COURSE_MARKER;
export const CUSTOM_COURSE_CATEGORY = "chatbot-course" as const;
export const CUSTOM_COURSE_SOURCE_TYPE = CUSTOM_COURSE_CATEGORY;
export const CUSTOM_COURSE_ROADMAP_PHASE = CUSTOM_COURSE_CATEGORY;
export const CUSTOM_COURSE_STATUS = "active" as const;
export const CUSTOM_COURSE_TOPIC_STATUS = "not started" as const;

export type TopicProgress = {
  status: string;
  label: string;
  percent: number;
  completed: boolean;
};

export type CustomCourseProgress = {
  courseId?: string;
  course: string;
  slug: string;
  total: number;
  completed: number;
  /** Alias useful to small UI summaries that use a verb for the count. */
  complete: number;
  inProgress: number;
  notStarted: number;
  percent: number;
  progress: number;
};

function normalizedText(value: string) {
  return value.trim().toLocaleLowerCase();
}

/** Convert a user-facing course name into a stable, URL-safe course identity. */
export function slugify(value: string) {
  const slug = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
  return slug || CUSTOM_COURSE_MARKER;
}

/** True only for assistant-created subject records, never for canonical tracks. */
export function isCustomCourse(item: Item) {
  return (
    item.kind === "subject" &&
    item.domain === CUSTOM_COURSE_DOMAIN &&
    item.category === CUSTOM_COURSE_CATEGORY &&
    item.sourceType === CUSTOM_COURSE_SOURCE_TYPE &&
    typeof item.course === "string" &&
    item.course.length > 0
  );
}

/** True only for assistant-created topics carrying the custom-course marker set. */
export function isCustomCourseTopic(item: Item) {
  return (
    item.kind === "topic" &&
    item.domain === CUSTOM_COURSE_DOMAIN &&
    item.roadmapPhase === CUSTOM_COURSE_ROADMAP_PHASE &&
    item.sourceType === CUSTOM_COURSE_SOURCE_TYPE &&
    typeof item.course === "string" &&
    item.course.length > 0 &&
    typeof item.subjectId === "string" &&
    item.subjectId.length > 0
  );
}

/** Return active custom courses by default; pass true when archived records are needed. */
export function getCustomCourses(items: Item[], includeArchived = false) {
  return items.filter(
    (item) => isCustomCourse(item) && (includeArchived || !item.archived),
  );
}

/**
 * Return topics in saved order. A course record also checks subjectId so a stale
 * or malformed record with a reused slug cannot be treated as linked progress.
 */
export function getCustomCourseTopics(
  items: Item[],
  course?: Item | string,
  includeArchived = false,
) {
  const selectedCourse =
    typeof course === "string"
      ? getCustomCourses(items, true).find(
          (item) => item.course === course || item.id === course,
        )
      : course;
  const courseSlug =
    typeof course === "string"
      ? selectedCourse?.course || course
      : course?.course;
  const courseId = selectedCourse?.id;
  return items
    .filter(
      (item) =>
        isCustomCourseTopic(item) &&
        (courseSlug === undefined || item.course === courseSlug) &&
        (courseId === undefined || item.subjectId === courseId) &&
        (includeArchived || !item.archived),
    )
    .sort(
      (left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) -
          (right.order ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id),
    );
}

export function getTopicLabel(topic: Item) {
  return topic.title.trim() || "Untitled topic";
}

/** Short alias for UI code that already uses label helpers. */
export const topicLabel = getTopicLabel;
export const customTopicLabel = getTopicLabel;
export const getCustomTopicLabel = getTopicLabel;

export function topicStatusLabel(status?: string) {
  switch (status) {
    case "completed":
    case "mastered":
    case "done":
      return "Completed";
    case "learning":
      return "Learning";
    case "practicing":
      return "Practicing";
    case "revising":
      return "Revising";
    case "in-progress":
      return "In progress";
    default:
      return "Not started";
  }
}

export function topicProgressPercent(topic: Item) {
  switch (topic.status) {
    case "completed":
    case "mastered":
    case "done":
      return 100;
    case "revising":
      return 75;
    case "practicing":
      return 50;
    case "learning":
    case "in-progress":
      return 25;
    default:
      return 0;
  }
}

export function getTopicProgress(topic: Item): TopicProgress {
  const completed = topicProgressPercent(topic) === 100;
  return {
    status: topic.status || CUSTOM_COURSE_TOPIC_STATUS,
    label: topicStatusLabel(topic.status),
    percent: topicProgressPercent(topic),
    completed,
  };
}

/** Numeric progress helper for compact progress bars. */
export function topicProgress(topic: Item) {
  return getTopicProgress(topic).percent;
}

export const getTopicProgressPercent = topicProgressPercent;
export const topicProgressValue = topicProgressPercent;
export const customTopicProgress = getTopicProgress;
export const getCustomTopicProgress = getTopicProgress;

function progressFor(
  course: Item | undefined,
  topics: Item[],
): CustomCourseProgress {
  const completed = topics.filter(
    (topic) => getTopicProgress(topic).completed,
  ).length;
  const inProgress = topics.filter(
    (topic) =>
      !getTopicProgress(topic).completed &&
      (topic.status || CUSTOM_COURSE_TOPIC_STATUS) !==
        CUSTOM_COURSE_TOPIC_STATUS,
  ).length;
  const total = topics.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  return {
    courseId: course?.id,
    course: course?.title || "Custom course",
    slug: course?.course || "",
    total,
    completed,
    complete: completed,
    inProgress,
    notStarted: total - completed - inProgress,
    percent,
    progress: percent,
  };
}

/**
 * Summarize one custom course. The second overload accepts the complete item
 * list plus a course record/slug, which is convenient for UI selectors.
 */
export function getCustomCourseProgress(
  course: Item,
  topics: Item[],
): CustomCourseProgress;
export function getCustomCourseProgress(
  items: Item[],
  course: Item | string,
): CustomCourseProgress;
export function getCustomCourseProgress(
  courseOrItems: Item | Item[],
  topicsOrCourse: Item[] | Item | string,
) {
  if (Array.isArray(courseOrItems)) {
    const items = courseOrItems;
    const course =
      typeof topicsOrCourse === "string"
        ? getCustomCourses(items, true).find(
            (item) =>
              item.course === topicsOrCourse || item.id === topicsOrCourse,
          )
        : Array.isArray(topicsOrCourse)
          ? undefined
          : topicsOrCourse;
    return progressFor(course, getCustomCourseTopics(items, course));
  }
  return progressFor(
    courseOrItems,
    Array.isArray(topicsOrCourse) ? topicsOrCourse : [],
  );
}

export const courseProgress = getCustomCourseProgress;
export const customCourseProgress = getCustomCourseProgress;

/** Case-insensitive comparison helper shared by deterministic assistant actions. */
export function courseNameMatches(course: Item, value: string) {
  const target = normalizedText(value);
  return (
    normalizedText(course.title) === target ||
    normalizedText(course.course || "") === target
  );
}
