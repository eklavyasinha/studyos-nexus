import type { Item } from "./types";
import {
  CORE_STRUCTURE_KEYS,
  DP_PREREQUISITE_KEYS,
  PERSONAL_ROADMAP,
} from "../pages/personal-roadmap-data";

export type ReadinessPlatform = "leetcode" | "codeforces" | "icpc";
export type ReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
};
export type PlatformGateState = {
  manual: boolean;
  requirementsMet: boolean;
  unlocked: boolean;
  checks: ReadinessCheck[];
};

const platformLabels: Record<ReadinessPlatform, string> = {
  leetcode: "LeetCode",
  codeforces: "Codeforces / CP",
  icpc: "ICPC virtual contests",
};
const foundationKeys = [
  "java.arrays",
  "java.strings",
  "java.searching",
  "java.sorting",
];
const timestamp = (value?: string) => {
  const parsed = Date.parse(value || "");
  return Number.isNaN(parsed) ? 0 : parsed;
};
function latest(records: Item[]) {
  return records.reduce<Item | undefined>((winner, record) => {
    if (!winner) return record;
    const difference =
      timestamp(record.updatedAt) - timestamp(winner.updatedAt);
    if (difference) return difference > 0 ? record : winner;
    // Equal timestamps can occur in a batch. Prefer a canonical record, then
    // the later input record, without changing or migrating either record.
    const canonical = (item: Item) =>
      item.course === "roadmap-readiness" &&
      item.sourceType === "strategy-gate";
    return canonical(winner) && !canonical(record) ? winner : record;
  }, undefined);
}

/** Stable identity only: title text, order and task/problem text are not keys. */
export function moduleForKey(items: Item[], key: string): Item | undefined {
  return latest(
    items.filter(
      (item) =>
        item.kind === "topic" &&
        !item.archived &&
        (item.moduleKey || item.collection) === key,
    ),
  );
}

export function isModuleComplete(item?: Partial<Item>) {
  return Boolean(
    item &&
    !item.archived &&
    (item.status === "completed" || item.status === "mastered"),
  );
}

/** Both original pages' goal shapes are read; the latest acknowledgement wins. */
export function platformReadinessRecord(
  items: Item[],
  platform: ReadinessPlatform,
): Item | undefined {
  return latest(
    items.filter(
      (item) =>
        item.kind === "goal" &&
        !item.archived &&
        ((item.course === "roadmap-readiness" && item.stage === platform) ||
          (item.sourceType === "strategy-gate" &&
            item.roadmapPhase === "strategy-gates" &&
            item.milestone === platform)),
    ),
  );
}

/** Pure defaults: acknowledgement dates/timestamps are supplied by the caller. */
export function readinessValues(
  platform: ReadinessPlatform,
  ready: boolean,
): Partial<Item> {
  return {
    title: `Manual readiness · ${platformLabels[platform]}`,
    course: "roadmap-readiness",
    stage: platform,
    sourceType: "strategy-gate",
    milestone: platform,
    roadmapPhase: "strategy-gates",
    category: "readiness gate",
    status: ready ? "ready" : "not ready",
    description:
      platform === "icpc"
        ? "Explicit self-assessment of readiness for ICPC virtual practice."
        : "Explicit self-assessment: I solve 70–80% of basic exercises independently, without hints or editorials.",
    official: false,
    tags: ["personal-roadmap", "strategy-roadmap", "readiness-gate"],
  };
}

const templateForReference = (reference: string, course?: string) =>
  PERSONAL_ROADMAP.find(
    (template) =>
      (!course || template.course === course) &&
      (template.key === reference || template.title === reference),
  );

/** Exact legacy titles are resolved to their original key, even after a rename. */
export function modulePrerequisiteKey(
  reference: string,
  items: Item[],
  course?: string,
): string {
  const template = templateForReference(reference, course);
  if (template) return template.key;
  const record = latest(
    items.filter(
      (item) =>
        item.kind === "topic" &&
        !item.archived &&
        (!course || item.course === course) &&
        item.title === reference,
    ),
  );
  return record?.moduleKey || record?.collection || reference;
}

export function modulePrerequisiteKeys(item: Partial<Item>): string[] {
  const key = item.moduleKey || item.collection;
  const template = key
    ? templateForReference(key, item.course)
    : item.course && item.roadmapPhase === "scaffold"
      ? templateForReference(item.title || "", item.course)
      : undefined;
  const references = [
    ...(template?.prerequisites || []),
    ...(item.prerequisites || []),
  ].map(
    (reference) =>
      templateForReference(reference, item.course)?.key || reference,
  );
  // DP always requires the actual preceding knowledge, including for adopted
  // legacy DP records that only named DFS. Scaffold predecessors cannot be
  // waived by clearing an editor field; prior knowledge is recorded in topics.
  // Passing a calendar date is irrelevant.
  return [
    ...new Set([
      ...references,
      ...(template?.key === "java.dp" ? DP_PREREQUISITE_KEYS : []),
    ]),
  ];
}

export function modulePrerequisiteLabel(
  reference: string,
  items: Item[],
  course?: string,
): string {
  const key = modulePrerequisiteKey(reference, items, course);
  return (
    moduleForKey(items, key)?.title ||
    templateForReference(key, course)?.title ||
    reference
  );
}

export function missingModulePrerequisites(
  item: Partial<Item>,
  items: Item[],
): string[] {
  const candidates = items.filter(
    (candidate) => candidate.id !== item.id && !candidate.archived,
  );
  return modulePrerequisiteKeys(item).filter((reference) => {
    const key = modulePrerequisiteKey(reference, candidates, item.course);
    const keyed = moduleForKey(candidates, key);
    // Only prerequisite compatibility uses exact titles. Readiness gates below
    // deliberately require an explicit stable-key topic record.
    const legacy = !keyed
      ? latest(
          candidates.filter(
            (candidate) =>
              candidate.kind === "topic" &&
              (!item.course || candidate.course === item.course) &&
              (candidate.title === reference ||
                candidate.title === templateForReference(key)?.title),
          ),
        )
      : undefined;
    return !isModuleComplete(keyed || legacy);
  });
}

function validPracticeDay(value?: string) {
  const day = value?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const date = new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === day
    ? day
    : undefined;
}

function practiceDates(items: Item[]) {
  const completedStatuses = new Set([
    "completed",
    "done",
    "solved",
    "solved-independent",
    "solved-with-hints",
    "solved-with-editorial",
    "solved-hints",
    "solved-editorial",
    "reviewed",
  ]);
  return new Set(
    items.flatMap((item) => {
      if (
        item.archived ||
        !["problem", "contest", "practice"].includes(item.kind) ||
        !completedStatuses.has(item.status || "")
      )
        return [];
      // A due date or edit timestamp is not evidence of a day actually practiced.
      const date =
        validPracticeDay(item.date) || validPracticeDay(item.completedAt);
      return date ? [date] : [];
    }),
  );
}

export function platformGateState(
  items: Item[],
  platform: ReadinessPlatform,
): PlatformGateState {
  const manual = platformReadinessRecord(items, platform)?.status === "ready";
  const topicCheck = (key: string): ReadinessCheck => ({
    id: key.slice("java.".length),
    label: templateForReference(key)?.title || key,
    detail: `A non-archived topic with moduleKey or legacy collection “${key}” is completed or mastered. Revised/revising does not count.`,
    complete: isModuleComplete(moduleForKey(items, key)),
  });
  const requirements: ReadinessCheck[] = [];
  if (platform === "leetcode" || platform === "codeforces") {
    requirements.push(...foundationKeys.map(topicCheck));
    if (platform === "codeforces")
      requirements.push(
        topicCheck("java.complexity"),
        topicCheck("java.recursion"),
      );
  } else {
    const dates = practiceDates(items);
    requirements.push(
      {
        id: "core-dsa",
        label: "Core-structure mastery",
        detail: `Every non-archived topic is completed or mastered: ${CORE_STRUCTURE_KEYS.map((key) => `${templateForReference(key)?.title || key} (${key})`).join(", ")}.`,
        complete: CORE_STRUCTURE_KEYS.every((key) =>
          isModuleComplete(moduleForKey(items, key)),
        ),
      },
      topicCheck("java.graphs"),
      topicCheck("java.bfs"),
      topicCheck("java.dfs"),
      {
        id: "regular-practice",
        label: "Practice on at least three different dates",
        detail: `${dates.size}/3 distinct actual practice dates from completed/reviewed contests, problems or practice logs. Independent, hints and editorial solves all count as practice; they do not grant topic mastery. Planned dates and edit timestamps do not count.`,
        complete: dates.size >= 3,
      },
    );
  }
  const acknowledgement: ReadinessCheck = {
    id: platform === "icpc" ? "manual" : "independence",
    label:
      platform === "icpc"
        ? "Explicit manual ICPC readiness"
        : "Manual 70–80% basic-independence acknowledgement",
    detail:
      platform === "icpc"
        ? "Your latest manual ICPC acknowledgement is ready. You make the final call."
        : "You explicitly assess that you solve 70–80% of basic exercises independently, without hints or editorials. No solve count infers this.",
    complete: manual,
  };
  const requirementsMet = requirements.every((check) => check.complete);
  return {
    manual,
    requirementsMet,
    unlocked: requirementsMet && manual,
    checks: [...requirements, acknowledgement],
  };
}

/** Guard the same progress transition from planner, dashboard and course editors. */
export function progressionError(item: Partial<Item>, items: Item[]) {
  const missing = missingModulePrerequisites(item, items);
  const gate = item.requiresGate;
  const gated =
    (gate === "leetcode" || gate === "codeforces" || gate === "icpc") &&
    !platformGateState(items, gate).unlocked;
  if (!missing.length && !gated) return "";
  return [
    missing.length
      ? `Prerequisites incomplete: ${missing.map((key) => modulePrerequisiteLabel(key, items, item.course)).join(", ")}. Revise the last incomplete topic instead.`
      : "",
    gated ? `The ${gate} readiness gate is not yet satisfied.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
