import type {
  Item,
  Kind,
  Settings,
  Snapshot,
  TimerState,
  WidgetConfig,
} from "./types";
import { addDays, isDone, today } from "./utils";
import {
  START_DATE,
  isScheduleItem,
  scheduleDate,
  scheduleWeekFor,
  weekStartFor,
} from "../pages/study-schedule-data";
import {
  freeStudySlots,
  lastIncompleteScheduleTopic,
  linkedScheduleModule,
  missingSchedulePrerequisites,
  scheduleTimingError,
  timeValue,
} from "../pages/study-schedule-helpers";
import {
  CUSTOM_COURSE_CATEGORY,
  CUSTOM_COURSE_DOMAIN,
  CUSTOM_COURSE_ROADMAP_PHASE,
  CUSTOM_COURSE_SOURCE_TYPE,
  CUSTOM_COURSE_STATUS,
  CUSTOM_COURSE_TOPIC_STATUS,
  courseNameMatches,
  getCustomCourseProgress,
  getCustomCourseTopics,
  getCustomCourses,
  getTopicLabel,
  isCustomCourse,
  isCustomCourseTopic,
  slugify,
  topicStatusLabel,
} from "./course-customization";

/** This label is deliberately visible in the assistant UI. */
export const ASSISTANT_LABEL = "Local study assistant · rule-based fallback";

export const ASSISTANT_EXAMPLES = [
  "What’s my plan today?",
  "Complete today’s Java tasks",
  "Reschedule Java arrays to tomorrow",
  "Missed 3 days — recovery",
  "Balance next week’s workload",
  "Sort pending tasks by priority",
  "Add a revision note about binary search",
  "Start a focus session",
  "Change theme to light",
  "Change accent to blue",
  "Use compact workspace density",
  "Hide the focus widget",
  "Move the goals widget before agenda",
  "Set daily goal to 90 minutes",
] as const;

export const ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE =
  "I’m the in-app local assistant: I can change saved settings and dashboard widgets, but I cannot access or edit project files or source code. Use the OmniRush coding-agent session for source edits and validation; no source edit was made.";

export const ASSISTANT_SUPPORTED_VALUES = {
  themes: ["dark", "light", "system"],
  accents: ["lime", "blue", "violet"],
  densities: ["comfortable", "compact"],
  motion: ["on", "off"],
  widgetVisibility: ["show", "hide"],
  widgetSizes: ["normal", "wide"],
  dailyGoalMinutes: { min: 1, max: 1440 },
  focusDurationMinutes: { min: 1, max: 180 },
} as const;

export const ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS = [
  {
    id: "agenda",
    label: "Your schedule",
    aliases: [
      "agenda",
      "schedule",
      "your day",
      "your schedule",
      "एजेंडा",
      "शेड्यूल",
      "कार्यसूची",
    ],
  },
  {
    id: "tracks",
    label: "Learning paths",
    aliases: [
      "tracks",
      "learning path",
      "learning paths",
      "learning track",
      "learning tracks",
      "ट्रैक",
      "लर्निंग पाथ",
    ],
  },
  {
    id: "focus",
    label: "Focus room",
    aliases: ["focus room", "focus widget", "focus", "pomodoro", "फोकस"],
  },
  {
    id: "goals",
    label: "Goals & revision",
    aliases: ["goals", "goal", "goals and revision", "revision", "लक्ष्य"],
  },
  {
    id: "activity",
    label: "Consistency",
    aliases: ["activity", "consistency", "streak", "गतिविधि"],
  },
  {
    id: "review",
    label: "Daily reflection",
    aliases: ["review", "reflection", "daily reflection", "समीक्षा", "चिंतन"],
  },
] as const satisfies ReadonlyArray<
  Pick<WidgetConfig, "id"> & { label: string; aliases: readonly string[] }
>;

export const ASSISTANT_CAPABILITIES = {
  settings: ASSISTANT_SUPPORTED_VALUES,
  widgets: ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS,
  sourceCodeBoundary: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
} as const;

export type SupportedDashboardWidgetId =
  (typeof ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS)[number]["id"];

export type AssistantActionId =
  | "today-plan"
  | "progress-summary"
  | "complete-java-today"
  | "reschedule-task"
  | "delete-task"
  | "replace-maths-with-dsa"
  | "recovery"
  | "balance-next-week"
  | "priority-sort"
  | "add-revision"
  | "start-focus"
  | "change-theme"
  | "change-accent"
  | "change-density"
  | "change-reduced-motion"
  | "change-daily-goal"
  | "change-focus-duration"
  | "set-widget-visibility"
  | "set-widget-size"
  | "move-widget"
  | "list-custom-courses"
  | "create-custom-course"
  | "rename-custom-course"
  | "archive-custom-course"
  | "add-custom-topic"
  | "rename-custom-topic"
  | "archive-custom-topic"
  | "move-custom-topic";

export type AssistantActionArgs = Record<
  string,
  string | number | boolean | string[]
>;

export type AssistantSource = Pick<Snapshot, "items" | "settings" | "timer">;

/** Only these existing Store methods are reachable from a validated action. */
export type AssistantStore = {
  items: Item[];
  settings: Settings;
  timer: TimerState;
  ready: boolean;
  readOnly: boolean;
  create: (kind: Kind, values: Partial<Item>) => Item;
  update: (id: string, patch: Partial<Item>) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setTimer: (patch: Partial<TimerState>) => void;
  completeTask: (id: string) => void;
  remove: (id: string) => void;
  notify: (message: string, tone?: "success" | "error" | "info") => void;
  snapshot: () => Snapshot;
};

export type AssistantConfirmation = {
  required: boolean;
  message?: string;
};

export type AssistantExecution = {
  ok: boolean;
  message: string;
  details?: string[];
  changed?: number;
  summary?: ProgressSummary;
};

/** Intermediate model: parser output is always one of these registered actions. */
export type AssistantAction = {
  id: AssistantActionId;
  label: string;
  args: AssistantActionArgs;
  confirmation: AssistantConfirmation;
  execute: (store: AssistantStore) => AssistantExecution;
};

export type AssistantParseResult =
  | { kind: "action"; action: AssistantAction }
  | { kind: "message"; message: string; tone: "info" | "error" };

export type ProgressSummary = {
  date: string;
  taskTotal: number;
  taskDone: number;
  pendingTasks: number;
  overdueTasks: number;
  plannedMinutes: number;
  focusedMinutes: number;
  sessionsToday: number;
};

const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/;
const DAY_WORDS = /\b(today|aaj)\b|आज/i;
const WRITE_WORDS =
  /\b(add|create|make|log|save|start|change|switch|set|complete|finish|mark|move|reschedule|shift|postpone|replace|balance|sort)\b|जोड़|बनाओ|शुरू|बदल|पूरा|खत्म|करो|करना/i;

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function itemsFrom(source: AssistantSource | Item[]) {
  return Array.isArray(source) ? source : source.items;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(+date) && today(date) === value;
}

type DateToken = { value?: string; error?: string };

function dateToken(input: string, defaultValue?: string): DateToken {
  const explicit = input.match(DATE_PATTERN)?.[0];
  if (explicit)
    return isValidDate(explicit)
      ? { value: explicit }
      : { error: `“${explicit}” is not a real calendar date.` };
  if (/\b(tomorrow|tmrw|kal)\b|कल/i.test(input))
    return { value: addDays(today(), 1) };
  if (DAY_WORDS.test(input)) return { value: today() };
  return { value: defaultValue };
}

function datedValue(item: Item) {
  return scheduleDate(item) || item.dueDate || item.date;
}

function pendingTask(item: Item) {
  return (
    item.kind === "task" &&
    !item.archived &&
    item.status !== "cancelled" &&
    !isDone(item)
  );
}

function activeScheduleTask(item: Item) {
  return pendingTask(item) && isScheduleItem(item) && Boolean(datedValue(item));
}

function priorityRank(value: string | undefined, settings: Settings) {
  const configured = value ? settings.priorities.indexOf(value) : -1;
  if (configured >= 0) return configured;
  return { high: 0, medium: 1, low: 2 }[value?.toLocaleLowerCase() || ""] ?? 3;
}

function minutesLabel(minutes: number) {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded}m`;
  return `${Math.floor(rounded / 60)}h${rounded % 60 ? ` ${rounded % 60}m` : ""}`;
}

export function buildProgressSummary(
  source: AssistantSource | Item[],
  day = today(),
): ProgressSummary {
  const items = itemsFrom(source);
  const tasks = items.filter(
    (item) =>
      item.kind === "task" &&
      !item.archived &&
      item.status !== "cancelled" &&
      Boolean(datedValue(item)),
  );
  const dayTasks = tasks.filter((item) => datedValue(item) === day);
  const sessionsToday = items.filter(
    (item) =>
      item.kind === "session" &&
      (item.date?.slice(0, 10) ||
        today(new Date(item.completedAt || item.createdAt))) === day,
  );
  return {
    date: day,
    taskTotal: dayTasks.length,
    taskDone: dayTasks.filter(isDone).length,
    pendingTasks: tasks.filter((item) => !isDone(item)).length,
    overdueTasks: tasks.filter(
      (item) =>
        !isDone(item) && Boolean(datedValue(item)) && datedValue(item)! < day,
    ).length,
    plannedMinutes: dayTasks.reduce(
      (sum, item) => sum + (item.duration || 0),
      0,
    ),
    focusedMinutes: sessionsToday.reduce(
      (sum, item) => sum + (item.actualMinutes || 0),
      0,
    ),
    sessionsToday: sessionsToday.length,
  };
}

function todayPlan(source: AssistantSource | Item[], day = today()) {
  return itemsFrom(source)
    .filter(
      (item) =>
        !item.archived &&
        item.status !== "cancelled" &&
        ["task", "event", "exam", "assignment", "practice", "contest"].includes(
          item.kind,
        ) &&
        datedValue(item) === day,
    )
    .sort(
      (a, b) =>
        (a.startTime || "99:99").localeCompare(b.startTime || "99:99") ||
        a.title.localeCompare(b.title),
    );
}

function planDetails(records: Item[]) {
  return records.map((item) => {
    const state = isDone(item) ? "done" : "pending";
    const time = item.startTime
      ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}`
      : "";
    return `${state} · ${item.title}${time}`;
  });
}

function unsupported(message?: string): AssistantParseResult {
  return {
    kind: "message",
    tone: "info",
    message:
      message ||
      "I’m a local rule-based fallback, not a general LLM. I can only read your saved workspace and run the listed local actions; I do not call an external API or answer arbitrary questions. Try “What’s my plan today?”, “reschedule Java arrays tomorrow”, or “start a focus session.”",
  };
}

function errorMessage(message: string): AssistantParseResult {
  return { kind: "message", tone: "error", message };
}

function ensureWritable(store: AssistantStore) {
  if (!store.ready) throw new Error("Your local workspace is still opening.");
  if (store.readOnly)
    throw new Error(
      "This tab is read-only. Switch to the active editing tab before running a change.",
    );
}

function makeAction(
  id: AssistantActionId,
  label: string,
  args: AssistantActionArgs,
  execute: (store: AssistantStore) => AssistantExecution,
  confirmation: AssistantConfirmation = { required: false },
): AssistantAction {
  return { id, label, args, confirmation, execute };
}

function idsMatch(expected: string[], actual: string[]) {
  if (expected.length !== actual.length) return false;
  const left = [...expected].sort();
  const right = [...actual].sort();
  return left.every((id, index) => id === right[index]);
}

function completeJavaTodayAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const taskIds = Array.isArray(args.taskIds) ? args.taskIds : [];
  const titles = Array.isArray(args.titles) ? args.titles : [];
  const count = taskIds.length;
  return makeAction(
    "complete-java-today",
    count > 1
      ? `Complete ${count} Java tasks today`
      : "Complete today’s Java task",
    args,
    (store) => {
      ensureWritable(store);
      const completed: string[] = [];
      const blocked: string[] = [];
      for (const id of taskIds) {
        const current = store.snapshot().items.find((item) => item.id === id);
        if (!current || !pendingTask(current)) continue;
        if (
          isScheduleItem(current) &&
          missingSchedulePrerequisites(current, store.snapshot().items).length
        ) {
          blocked.push(current.title);
          continue;
        }
        store.completeTask(id);
        const after = store.snapshot().items.find((item) => item.id === id);
        if (after && isDone(after)) completed.push(after.title);
        else blocked.push(current.title);
      }
      if (completed.length) {
        const message = `${completed.length} Java task${completed.length === 1 ? "" : "s"} marked complete in your local workspace.`;
        store.notify(message, "success");
        return {
          ok: true,
          message,
          changed: completed.length,
          details: [
            ...completed.map((title) => `done · ${title}`),
            ...blocked.map(
              (title) => `not changed · ${title} (saved validation blocked it)`,
            ),
          ],
        };
      }
      return {
        ok: false,
        message:
          blocked.length > 0
            ? "No Java task was completed because saved prerequisite validation blocked it."
            : "Those Java tasks are no longer pending, so nothing changed.",
        details: blocked.length
          ? blocked.map((title) => `not changed · ${title}`)
          : titles,
      };
    },
    {
      required: count > 1,
      message:
        count > 1
          ? `This will mark these ${count} saved tasks complete: ${titles.join(", ")}. Completed work is not touched. Continue?`
          : undefined,
    },
  );
}

function appendRescheduleHistory(
  body: string | undefined,
  from: string,
  to: string,
) {
  const marker = "Reschedule history:";
  const existing = body || "";
  if (existing.includes(marker))
    return `${existing.trim()}\n${from} → ${to}`.trim();
  return `${existing.trim()}${existing.trim() ? "\n\n" : ""}${marker}\n${from} → ${to}`.trim();
}

type ScheduleSlot = Pick<Item, "startTime" | "endTime" | "duration">;

function scheduleMovePatch(
  item: Item,
  targetDate: string,
  slot?: ScheduleSlot,
): Partial<Item> {
  const currentDate = scheduleDate(item) || item.originalDate;
  const movedDate = Boolean(currentDate && currentDate !== targetDate);
  const patch: Partial<Item> = slot
    ? {
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration,
      }
    : {};
  if (isScheduleItem(item)) {
    patch.dueDate = targetDate;
    patch.date = targetDate;
    patch.scheduleWeek = scheduleWeekFor(targetDate);
    if (movedDate) {
      const originalDate = item.originalDate || currentDate;
      patch.originalDate = originalDate;
      patch.rescheduledAt = new Date().toISOString();
      patch.rescheduleCount = (item.rescheduleCount || 0) + 1;
      if (currentDate)
        patch.body = appendRescheduleHistory(
          item.body,
          currentDate,
          targetDate,
        );
    }
  } else {
    if (item.dueDate || !item.date) patch.dueDate = targetDate;
    if (item.date) patch.date = targetDate;
    if (currentDate && targetDate > currentDate)
      patch.postponed = (item.postponed || 0) + 1;
  }
  return patch;
}

function validateScheduleMove(
  item: Item,
  targetDate: string,
  patch: Partial<Item>,
  items: Item[],
) {
  if (!isScheduleItem(item)) return;
  const error = scheduleTimingError(
    targetDate,
    patch.startTime || item.startTime || "",
    patch.endTime || item.endTime || "",
    patch.duration ?? item.duration ?? NaN,
    items,
    item.id,
  );
  if (error) throw new Error(error);
}

function rescheduleTaskAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const id = String(args.taskId);
  const targetDate = String(args.targetDate);
  const item = snapshot.items.find((entry) => entry.id === id);
  return makeAction(
    "reschedule-task",
    `Reschedule “${item?.title || "saved task"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const currentSnapshot = store.snapshot();
      const current = currentSnapshot.items.find((entry) => entry.id === id);
      if (!current || !pendingTask(current))
        return {
          ok: false,
          message: "That task is no longer pending, so it was not changed.",
        };
      const from = scheduleDate(current) || current.date || current.dueDate;
      if (from === targetDate)
        return {
          ok: true,
          message: `“${current.title}” is already scheduled for ${targetDate}.`,
          changed: 0,
        };
      const patch = scheduleMovePatch(current, targetDate);
      validateScheduleMove(current, targetDate, patch, currentSnapshot.items);
      store.update(current.id, patch);
      const message = `“${current.title}” moved to ${targetDate}; its original date and local history stay saved.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function deleteTaskAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const id = String(args.taskId);
  const item = snapshot.items.find((entry) => entry.id === id);
  return makeAction(
    "delete-task",
    `Delete “${item?.title || "saved task"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot().items.find((entry) => entry.id === id);
      if (!current || current.kind !== "task")
        return { ok: false, message: "That saved task no longer exists." };
      store.remove(id);
      const message = `“${current.title}” was deleted from the local workspace.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
    {
      required: true,
      message: `This permanently removes “${item?.title || "the saved task"}” and its direct links. Completed work is not recoverable from the assistant. Continue?`,
    },
  );
}

function mathsRecord(item: Item) {
  const text = normalize(
    [item.title, item.course, item.stage, ...(item.tags || [])].join(" "),
  );
  return item.course === "maths-ml" || /\bmaths?\b/.test(text);
}

function dsaRecord(item: Item) {
  const text = normalize(
    [
      item.title,
      item.course,
      item.stage,
      item.moduleKey,
      ...(item.tags || []),
    ].join(" "),
  );
  return item.course === "java-dsa" || /\bdsa\b/.test(text);
}

type SwapPair = { maths: Item; dsa: Item };

function replacementPairs(source: AssistantSource, day = today()): SwapPair[] {
  const schedule = source.items
    .filter(activeScheduleTask)
    .sort(
      (a, b) =>
        (datedValue(a) || "").localeCompare(datedValue(b) || "") ||
        (a.startTime || "99:99").localeCompare(b.startTime || "99:99"),
    );
  const maths = schedule.filter(
    (item) => datedValue(item) === day && mathsRecord(item),
  );
  const todayDsa = schedule.filter(
    (item) => datedValue(item) === day && dsaRecord(item),
  );
  const laterDsa = schedule.filter(
    (item) => (datedValue(item) || "") > day && dsaRecord(item),
  );
  const dsa = [...todayDsa, ...laterDsa];
  return maths.slice(0, dsa.length).map((mathsItem, index) => ({
    maths: mathsItem,
    dsa: dsa[index],
  }));
}

function slotConflict(
  items: Item[],
  date: string,
  slot: ScheduleSlot,
  ignored: Set<string>,
) {
  const start = timeValue(slot.startTime);
  const end = timeValue(slot.endTime);
  if (start === null || end === null) return true;
  return items.some((item) => {
    if (
      ignored.has(item.id) ||
      item.archived ||
      item.status === "cancelled" ||
      datedValue(item) !== date
    )
      return false;
    const otherStart = timeValue(item.startTime);
    const otherEnd = timeValue(item.endTime);
    return (
      otherStart !== null &&
      otherEnd !== null &&
      start < otherEnd &&
      otherStart < end
    );
  });
}

function replaceMathsAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const pairs = replacementPairs(snapshot);
  const expectedPairIds = Array.isArray(args.pairIds)
    ? args.pairIds
    : pairs.flatMap(({ maths, dsa }) => [maths.id, dsa.id]);
  const titles = pairs.flatMap(({ maths, dsa }) => [
    `Maths: ${maths.title}`,
    `DSA: ${dsa.title}`,
  ]);
  return makeAction(
    "replace-maths-with-dsa",
    "Replace today’s Maths slot with DSA",
    args,
    (store) => {
      ensureWritable(store);
      const currentSnapshot = store.snapshot();
      const currentPairs = replacementPairs(currentSnapshot);
      if (!currentPairs.length)
        return {
          ok: false,
          message:
            "No pair of uncompleted Maths and Java/DSA schedule records is available today. Completed work was left untouched.",
        };
      if (
        !idsMatch(
          expectedPairIds,
          currentPairs.flatMap(({ maths, dsa }) => [maths.id, dsa.id]),
        )
      )
        throw new Error(
          "The schedule changed while this swap was waiting for confirmation. Nothing was changed; run the replacement request again.",
        );
      const planned: { id: string; patch: Partial<Item> }[] = [];
      for (const { maths, dsa } of currentPairs) {
        const mathsDate = datedValue(maths) || today();
        const dsaDate = datedValue(dsa) || today();
        const mathsSlot: ScheduleSlot = {
          startTime: maths.startTime,
          endTime: maths.endTime,
          duration: maths.duration,
        };
        const dsaSlot: ScheduleSlot = {
          startTime: dsa.startTime,
          endTime: dsa.endTime,
          duration: dsa.duration,
        };
        const ignored = new Set([maths.id, dsa.id]);
        if (
          slotConflict(currentSnapshot.items, mathsDate, dsaSlot, ignored) ||
          slotConflict(currentSnapshot.items, dsaDate, mathsSlot, ignored)
        )
          throw new Error(
            `The Maths/DSA swap for “${maths.title}” has a timed conflict. No records were changed.`,
          );
        planned.push(
          { id: dsa.id, patch: scheduleMovePatch(dsa, mathsDate, mathsSlot) },
          { id: maths.id, patch: scheduleMovePatch(maths, dsaDate, dsaSlot) },
        );
      }
      for (const move of planned) store.update(move.id, move.patch);
      const message = `Today’s uncompleted Maths slot${currentPairs.length === 1 ? "" : "s"} was replaced with Java/DSA by moving only uncompleted schedule records.`;
      store.notify(message, "success");
      return {
        ok: true,
        message,
        changed: planned.length,
        details: currentPairs.flatMap(({ maths, dsa }) => [
          `DSA today · ${dsa.title}`,
          `Maths moved/reordered · ${maths.title}`,
        ]),
      };
    },
    {
      required: pairs.length > 0,
      message:
        pairs.length > 0
          ? `This swaps only uncompleted schedule records: ${titles.join(" · ")}. Completed work will not be edited. Continue?`
          : undefined,
    },
  );
}

function recoveryTopic(items: Item[]) {
  const candidates = items
    .filter(activeScheduleTask)
    .sort((a, b) => (datedValue(a) || "").localeCompare(datedValue(b) || ""));
  for (const candidate of candidates) {
    const revision = lastIncompleteScheduleTopic(candidate, items);
    if (revision?.module?.title) return revision.module.title;
    if (revision?.template?.title) return revision.template.title;
    const linked = linkedScheduleModule(candidate, items);
    if (linked && !isDone(linked)) return linked.title;
  }
  return (
    candidates[0]?.stage ||
    candidates[0]?.title ||
    "the first incomplete saved task"
  );
}

function recoveryOptionalItems(source: AssistantSource, days: number) {
  const start = addDays(today(), -days);
  const end = addDays(today(), days);
  return source.items
    .filter(
      (item) =>
        activeScheduleTask(item) &&
        item.sessionType?.startsWith("optional") &&
        Boolean(datedValue(item)) &&
        datedValue(item)! >= start &&
        datedValue(item)! <= end,
    )
    .sort((a, b) => (datedValue(a) || "").localeCompare(datedValue(b) || ""));
}

function recoveryAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const days = Number(args.days);
  const optional = recoveryOptionalItems(snapshot, days);
  const expectedOptionalIds = Array.isArray(args.optionalIds)
    ? args.optionalIds
    : optional.map((item) => item.id);
  const topic = recoveryTopic(snapshot.items);
  return makeAction(
    "recovery",
    `${days}-day recovery`,
    args,
    (store) => {
      ensureWritable(store);
      const candidates = recoveryOptionalItems(store.snapshot(), days);
      if (
        !idsMatch(
          expectedOptionalIds,
          candidates.map((item) => item.id),
        )
      )
        throw new Error(
          "The recovery window changed while this action was waiting for confirmation. Nothing was changed; run recovery again.",
        );
      const changed: string[] = [];
      for (const item of candidates) {
        store.update(item.id, {
          status: "cancelled",
          body: `${item.body?.trim() ? `${item.body.trim()}\n\n` : ""}Recovery mode: optional work reduced after a ${days}-day miss. This record was kept and can be restored manually if needed.`,
        });
        changed.push(item.title);
      }
      const currentTopic = recoveryTopic(store.snapshot().items);
      const message = changed.length
        ? `Recovery applied: ${changed.length} optional item${changed.length === 1 ? "" : "s"} reduced. Start with ${currentTopic}.`
        : `Recovery check complete. No uncompleted optional item was in the ${days}-day recovery window. Start with ${currentTopic}.`;
      store.notify(message, "success");
      return {
        ok: true,
        message,
        changed: changed.length,
        details: [
          ...changed.map((title) => `reduced · ${title}`),
          `last incomplete topic · ${currentTopic}`,
        ],
      };
    },
    {
      required: optional.length > 0,
      message:
        optional.length > 0
          ? `This keeps the records but marks ${optional.length} uncompleted optional item${optional.length === 1 ? "" : "s"} cancelled in the recovery window. It does not touch completed work. The last incomplete topic is ${topic}. Continue?`
          : undefined,
    },
  );
}

function nextWeekStart(day = today()) {
  return addDays(weekStartFor(day), 7);
}

function balanceCandidates(source: AssistantSource) {
  const start = nextWeekStart();
  const end = addDays(start, 6);
  return source.items.filter((item) => {
    const date = datedValue(item);
    return (
      activeScheduleTask(item) &&
      Boolean(date) &&
      date! >= start &&
      date! <= end &&
      item.sessionType !== "daily-review" &&
      (item.sessionType?.startsWith("optional") ||
        item.priority?.toLocaleLowerCase() === "low")
    );
  });
}

function balanceNextWeekAction(
  snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const candidates = balanceCandidates(snapshot);
  const expectedCandidateIds = Array.isArray(args.candidateIds)
    ? args.candidateIds
    : candidates.map((item) => item.id);
  const start = nextWeekStart();
  const end = addDays(start, 6);
  return makeAction(
    "balance-next-week",
    "Balance next week’s workload",
    args,
    (store) => {
      ensureWritable(store);
      let current = store.snapshot().items;
      if (
        !idsMatch(
          expectedCandidateIds,
          balanceCandidates({
            items: current,
            settings: store.settings,
            timer: store.timer,
          }).map((item) => item.id),
        )
      )
        throw new Error(
          "Next week’s workload changed while this action was waiting for confirmation. Nothing was changed; run balance again.",
        );
      const dates = Array.from({ length: 7 }, (_, index) =>
        addDays(start, index),
      );
      const loadFor = (day: string) =>
        current
          .filter(
            (item) => activeScheduleTask(item) && datedValue(item) === day,
          )
          .reduce((sum, item) => sum + (item.duration || 0), 0);
      const moved: string[] = [];
      const ordered = current
        .filter(
          (item) =>
            balanceCandidates({
              items: [item],
              settings: store.settings,
              timer: store.timer,
            }).length > 0,
        )
        .sort(
          (a, b) =>
            loadFor(datedValue(b) || "") - loadFor(datedValue(a) || "") ||
            (b.duration || 0) - (a.duration || 0) ||
            a.title.localeCompare(b.title),
        );
      for (const item of ordered) {
        const from = datedValue(item);
        if (!from || from < start || from > end) continue;
        const currentLoad = loadFor(from);
        const destination = dates
          .filter((day) => day !== from)
          .map((day) => ({ day, load: loadFor(day) }))
          .sort((a, b) => a.load - b.load || a.day.localeCompare(b.day))[0];
        if (!destination) continue;
        const duration = item.duration || 0;
        if (!duration || currentLoad - destination.load <= duration * 2)
          continue;
        const slot = freeStudySlots(current, destination.day, duration)[0];
        if (!slot) continue;
        const patch = scheduleMovePatch(item, destination.day, {
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration,
        });
        validateScheduleMove(item, destination.day, patch, current);
        store.update(item.id, patch);
        current = store.snapshot().items;
        moved.push(`${item.title} → ${destination.day}`);
      }
      const message = moved.length
        ? `Next week balanced by moving ${moved.length} unfinished optional/low-priority item${moved.length === 1 ? "" : "s"}; completed work was left alone.`
        : "No safe unfinished optional or low-priority move improved next week’s balance, so nothing changed.";
      if (moved.length) store.notify(message, "success");
      return { ok: true, message, changed: moved.length, details: moved };
    },
    {
      required: candidates.length > 0,
      message:
        candidates.length > 0
          ? `I can consider ${candidates.length} unfinished optional/low-priority record${candidates.length === 1 ? "" : "s"} from ${start} through ${end}. Only safe moves inside next week will be made, and completed work is protected. Continue?`
          : undefined,
    },
  );
}

function prioritySortAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  return makeAction(
    "priority-sort",
    "Priority-sort pending tasks",
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const pending = current.items
        .filter(pendingTask)
        .sort(
          (a, b) =>
            priorityRank(a.priority, current.settings) -
              priorityRank(b.priority, current.settings) ||
            (datedValue(a) || "9999-12-31").localeCompare(
              datedValue(b) || "9999-12-31",
            ) ||
            a.title.localeCompare(b.title),
        );
      let changed = 0;
      for (const [index, item] of pending.entries()) {
        const order = index + 1;
        if (item.order !== order) {
          store.update(item.id, { order });
          changed += 1;
        }
      }
      const message = changed
        ? `${changed} pending task${changed === 1 ? "" : "s"} priority-sorted in the saved workspace.`
        : "Pending tasks are already priority-sorted; nothing changed.";
      if (changed) store.notify(message, "success");
      return {
        ok: true,
        message,
        changed,
        details: pending
          .slice(0, 8)
          .map(
            (item, index) =>
              `${index + 1}. ${item.priority || "Unlabelled"} · ${item.title}`,
          ),
      };
    },
  );
}

function revisionAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const kind = String(args.kind) === "note" ? "note" : "session";
  const subject = String(args.subject || "your last incomplete topic");
  const date = String(args.date || today());
  return makeAction(
    "add-revision",
    kind === "note" ? "Add a revision note" : "Add a revision session",
    args,
    (store) => {
      ensureWritable(store);
      if (kind === "note") {
        const note = store.create("note", {
          title: `Revision note · ${subject}`.slice(0, 240),
          body: `# Revision note\n\nTopic: ${subject}\n\n## Recall\n\n## Mistake or question\n\n## Next check\n`,
          notebook: "Revision",
          collection: "",
          tags: ["revision"],
          pinned: false,
          favorite: false,
          archived: false,
        });
        const message = `Revision note created for ${subject}.`;
        store.notify(message, "success");
        return { ok: true, message, changed: 1, details: [note.title] };
      }
      const duration = Math.max(
        1,
        Math.min(180, Math.round(store.settings.focusMinutes)),
      );
      const task = store.create("task", {
        title: `Revision session · ${subject}`.slice(0, 240),
        description: `A bounded revision block for ${subject}. Recall first, record the first mistake, then choose one independent check.`,
        completionCriteria: `Save one recalled explanation, one mistake or question, and one next check for ${subject}.`,
        dueDate: date,
        status: "todo",
        priority: "Medium",
        duration,
        sessionType: "revision",
        category: "Learning",
        tags: ["revision"],
      });
      const message = `Revision session added for ${subject} on ${date}.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1, details: [task.title] };
    },
  );
}

function startFocusAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  return makeAction("start-focus", "Start a focus session", args, (store) => {
    ensureWritable(store);
    if (store.timer.running || store.timer.startedAt)
      throw new Error(
        "A timer is already active or paused. Finish or reset it in Focus before starting another session.",
      );
    const requestedMinutes =
      typeof args.durationMinutes === "number"
        ? args.durationMinutes
        : store.settings.focusMinutes;
    if (
      typeof args.durationMinutes === "number" &&
      !validBoundedMinutes(
        args.durationMinutes,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.min,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.max,
      )
    )
      throw new Error(
        "Focus sessions support whole-minute durations from 1 to 180 minutes.",
      );
    const duration = requestedMinutes * 60;
    const requestedId = typeof args.taskId === "string" ? args.taskId : "";
    const linked = requestedId
      ? store
          .snapshot()
          .items.find((item) => item.id === requestedId && pendingTask(item))
      : undefined;
    const startedAt = new Date().toISOString();
    store.setTimer({
      mode: "focus",
      running: true,
      duration,
      remaining: duration,
      endAt: Date.now() + duration * 1000,
      startedAt,
      elapsed: 0,
      interruptions: 0,
      ...(linked ? { linkedId: linked.id } : {}),
    });
    const message = linked
      ? `Focus session started for ${linked.title} (${Math.round(duration / 60)} min).`
      : `Focus session started for ${Math.round(duration / 60)} min.`;
    store.notify(message, "success");
    return { ok: true, message, changed: 1 };
  });
}

function themeAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const theme = args.theme;
  return makeAction(
    "change-theme",
    `Change theme to ${theme}`,
    args,
    (store) => {
      ensureWritable(store);
      if (!includesString(ASSISTANT_SUPPORTED_VALUES.themes, theme))
        throw new Error("Theme supports only dark, light, or system.");
      store.setSettings({ theme });
      const message = `Theme changed to ${theme}.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function includesString<T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function settingChangeAction<K extends keyof Settings>(
  store: AssistantStore,
  key: K,
  value: Settings[K],
  message: string,
  unchangedMessage: string,
): AssistantExecution {
  ensureWritable(store);
  if (store.snapshot().settings[key] === value)
    return { ok: true, message: unchangedMessage, changed: 0 };
  store.setSettings({ [key]: value } as Partial<Settings>);
  store.notify(message, "success");
  return { ok: true, message, changed: 1 };
}

function validBoundedMinutes(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function accentAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const accent = args.accent;
  return makeAction(
    "change-accent",
    `Change accent to ${accent}`,
    args,
    (store) => {
      if (!includesString(ASSISTANT_SUPPORTED_VALUES.accents, accent))
        throw new Error("Accent supports only lime, blue, or violet.");
      return settingChangeAction(
        store,
        "accent",
        accent,
        `Accent changed to ${accent}.`,
        `Accent is already ${accent}.`,
      );
    },
  );
}

function densityAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const density = args.density;
  return makeAction(
    "change-density",
    `Change workspace density to ${density}`,
    args,
    (store) => {
      if (!includesString(ASSISTANT_SUPPORTED_VALUES.densities, density))
        throw new Error(
          "Workspace density supports only comfortable or compact.",
        );
      return settingChangeAction(
        store,
        "density",
        density,
        `Workspace density changed to ${density}.`,
        `Workspace density is already ${density}.`,
      );
    },
  );
}

function reducedMotionAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const enabled = args.enabled;
  const state = enabled === true ? "on" : enabled === false ? "off" : "unknown";
  return makeAction(
    "change-reduced-motion",
    `Turn reduced motion ${state}`,
    args,
    (store) => {
      if (typeof enabled !== "boolean")
        throw new Error("Reduced motion must be set to on or off.");
      return settingChangeAction(
        store,
        "reducedMotion",
        enabled,
        `Reduced-motion preference turned ${enabled ? "on" : "off"}.${enabled ? "" : " Your system’s motion preference still applies."}`,
        `Reduced motion is already ${enabled ? "on" : "off"}.`,
      );
    },
  );
}

function dailyGoalAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const minutes = typeof args.minutes === "number" ? args.minutes : undefined;
  return makeAction(
    "change-daily-goal",
    `Set daily goal to ${typeof minutes === "number" ? `${minutes} minutes` : "the requested minutes"}`,
    args,
    (store) => {
      if (
        !validBoundedMinutes(
          minutes,
          ASSISTANT_SUPPORTED_VALUES.dailyGoalMinutes.min,
          ASSISTANT_SUPPORTED_VALUES.dailyGoalMinutes.max,
        )
      )
        throw new Error("Daily goals support whole minutes from 1 to 1440.");
      return settingChangeAction(
        store,
        "dailyGoal",
        minutes,
        `Daily focus goal set to ${minutes} minutes.`,
        `Daily focus goal is already ${minutes} minutes.`,
      );
    },
  );
}

function focusDurationAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const minutes = typeof args.minutes === "number" ? args.minutes : undefined;
  return makeAction(
    "change-focus-duration",
    `Set focus duration to ${typeof minutes === "number" ? `${minutes} minutes` : "the requested minutes"}`,
    args,
    (store) => {
      if (
        !validBoundedMinutes(
          minutes,
          ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.min,
          ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.max,
        )
      )
        throw new Error("Focus durations support whole minutes from 1 to 180.");
      return settingChangeAction(
        store,
        "focusMinutes",
        minutes,
        `Default focus duration set to ${minutes} minutes for future sessions.`,
        `Focus duration is already ${minutes} minutes.`,
      );
    },
  );
}

function supportedWidget(value: unknown): value is SupportedDashboardWidgetId {
  return ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS.some(
    (widget) => widget.id === value,
  );
}

function widgetDefinition(id: string) {
  return ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS.find(
    (widget) => widget.id === id,
  );
}

function widgetLabel(id: string) {
  return widgetDefinition(id)?.label || id || "that widget";
}

function widgetUnavailableMessage(id: string) {
  return `${widgetLabel(id)} is not a supported saved dashboard widget. Supported widgets: ${ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS.map((widget) => widget.id).join(", ")}.`;
}

function widgetVisibilityAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const widgetId = typeof args.widgetId === "string" ? args.widgetId : "";
  const visible = args.visible;
  return makeAction(
    "set-widget-visibility",
    `${visible === false ? "Hide" : "Show"} ${widgetLabel(widgetId)}`,
    args,
    (store) => {
      ensureWritable(store);
      if (!supportedWidget(widgetId))
        throw new Error(widgetUnavailableMessage(widgetId));
      if (typeof visible !== "boolean")
        throw new Error("Widget visibility must be show or hide.");
      const current = store.snapshot().settings.widgets;
      const index = current.findIndex((widget) => widget.id === widgetId);
      if (index < 0)
        return { ok: false, message: widgetUnavailableMessage(widgetId) };
      if (current[index].visible === visible)
        return {
          ok: true,
          message: `${widgetLabel(widgetId)} is already ${visible ? "shown" : "hidden"}.`,
          changed: 0,
        };
      const widgets = current.map((widget, currentIndex) =>
        currentIndex === index ? { ...widget, visible } : widget,
      );
      store.setSettings({ widgets });
      const message = `${widgetLabel(widgetId)} is now ${visible ? "shown" : "hidden"}.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function widgetSizeAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const widgetId = typeof args.widgetId === "string" ? args.widgetId : "";
  const size = args.size;
  return makeAction(
    "set-widget-size",
    `Set ${widgetLabel(widgetId)} widget size to ${size}`,
    args,
    (store) => {
      ensureWritable(store);
      if (!supportedWidget(widgetId))
        throw new Error(widgetUnavailableMessage(widgetId));
      if (!includesString(ASSISTANT_SUPPORTED_VALUES.widgetSizes, size))
        throw new Error("Widget size supports only normal or wide.");
      const current = store.snapshot().settings.widgets;
      const index = current.findIndex((widget) => widget.id === widgetId);
      if (index < 0)
        return { ok: false, message: widgetUnavailableMessage(widgetId) };
      if (current[index].size === size)
        return {
          ok: true,
          message: `${widgetLabel(widgetId)} is already ${size}.`,
          changed: 0,
        };
      const widgets = current.map((widget, currentIndex) =>
        currentIndex === index ? { ...widget, size } : widget,
      );
      store.setSettings({ widgets });
      const message = `${widgetLabel(widgetId)} is now ${size}.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function moveWidgetAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const widgetId =
    typeof args.widgetId === "string"
      ? args.widgetId
      : typeof args.fromWidgetId === "string"
        ? args.fromWidgetId
        : "";
  const beforeWidgetId =
    typeof args.beforeWidgetId === "string"
      ? args.beforeWidgetId
      : typeof args.targetWidgetId === "string"
        ? args.targetWidgetId
        : "";
  return makeAction(
    "move-widget",
    `Move ${widgetLabel(widgetId)} before ${widgetLabel(beforeWidgetId)}`,
    args,
    (store) => {
      ensureWritable(store);
      if (!supportedWidget(widgetId))
        throw new Error(widgetUnavailableMessage(widgetId));
      if (!supportedWidget(beforeWidgetId))
        throw new Error(widgetUnavailableMessage(beforeWidgetId));
      if (widgetId === beforeWidgetId)
        throw new Error("Choose two different dashboard widgets to reorder.");
      const current = store.snapshot().settings.widgets;
      const sourceIndex = current.findIndex((widget) => widget.id === widgetId);
      const targetIndex = current.findIndex(
        (widget) => widget.id === beforeWidgetId,
      );
      if (sourceIndex < 0 || targetIndex < 0)
        return {
          ok: false,
          message: `Both widgets must be present in the saved dashboard layout. ${widgetUnavailableMessage(sourceIndex < 0 ? widgetId : beforeWidgetId)}`,
        };
      if (sourceIndex + 1 === targetIndex)
        return {
          ok: true,
          message: `${widgetLabel(widgetId)} is already before ${widgetLabel(beforeWidgetId)}.`,
          changed: 0,
        };
      const source = current[sourceIndex];
      const widgets = current.filter((widget) => widget.id !== widgetId);
      const nextTargetIndex = widgets.findIndex(
        (widget) => widget.id === beforeWidgetId,
      );
      widgets.splice(nextTargetIndex, 0, source);
      store.setSettings({ widgets });
      const message = `${widgetLabel(widgetId)} moved before ${widgetLabel(beforeWidgetId)}.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function argumentString(args: AssistantActionArgs, ...keys: string[]) {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function customTitle(value: string | undefined, label: string) {
  const title = value?.trim() || "";
  if (!title) throw new Error(`Name the ${label}.`);
  if (title.length > 240)
    throw new Error(`Keep the ${label} name under 240 characters.`);
  return title;
}

function customCourseMatches(
  items: Item[],
  name: string,
  includeArchived = false,
) {
  const courses = getCustomCourses(items, includeArchived).filter((course) =>
    courseNameMatches(course, name),
  );
  return courses;
}

function resolveCustomCourse(
  items: Item[],
  args: AssistantActionArgs,
  allowArchived = false,
) {
  const courseId = argumentString(args, "courseId");
  if (courseId) {
    const course = items.find(
      (item) =>
        isCustomCourse(item) &&
        item.id === courseId &&
        (allowArchived || !item.archived),
    );
    if (!course)
      throw new Error(
        allowArchived
          ? "That custom course no longer exists."
          : "That custom course is missing or archived.",
      );
    return course;
  }
  const name = argumentString(args, "courseName", "course", "name");
  if (!name) throw new Error("Name one custom course.");
  const matches = customCourseMatches(items, name, allowArchived);
  if (matches.length > 1)
    throw new Error(
      `More than one custom course matches “${name}”. Use its exact name or slug.`,
    );
  if (!matches.length)
    throw new Error(`I could not find one custom course named “${name}”.`);
  return matches[0];
}

function customTopicsForCourse(
  items: Item[],
  course: Item,
  includeArchived = false,
) {
  return getCustomCourseTopics(items, course, includeArchived);
}

function resolveCustomTopic(
  items: Item[],
  args: AssistantActionArgs,
  topicKeys: string[],
  course?: Item,
  includeArchived = false,
) {
  const topicId = argumentString(args, ...topicKeys);
  if (topicId) {
    const topic = items.find(
      (item) =>
        isCustomCourseTopic(item) &&
        item.id === topicId &&
        (includeArchived || !item.archived),
    );
    if (!topic)
      throw new Error(
        includeArchived
          ? "That custom topic no longer exists."
          : "That custom topic is missing or archived.",
      );
    if (
      course &&
      (topic.course !== course.course || topic.subjectId !== course.id)
    )
      throw new Error(`That topic is not in the “${course.title}” course.`);
    return topic;
  }
  const name = argumentString(args, "topicName", "topic", "name");
  if (!name) throw new Error("Name one custom topic.");
  const candidates = course
    ? customTopicsForCourse(items, course, includeArchived)
    : items.filter(
        (item) =>
          isCustomCourseTopic(item) && (includeArchived || !item.archived),
      );
  const matches = candidates.filter(
    (item) => normalize(item.title) === normalize(name),
  );
  if (matches.length > 1)
    throw new Error(
      `More than one custom topic matches “${name}”. Name its course and use a more specific topic title.`,
    );
  if (!matches.length)
    throw new Error(`I could not find one custom topic named “${name}”.`);
  return matches[0];
}

function applyCustomTopicOrder(store: AssistantStore, ordered: Item[]) {
  let changed = 0;
  ordered.forEach((topic, index) => {
    const order = index + 1;
    if (topic.order !== order) {
      store.update(topic.id, { order });
      changed += 1;
    }
  });
  return changed;
}

function listCustomCoursesAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  return makeAction(
    "list-custom-courses",
    "Show custom courses and progress",
    args,
    (store) => {
      const courses = getCustomCourses(store.snapshot().items);
      if (!courses.length)
        return {
          ok: true,
          message: "No custom courses are saved in this local workspace.",
          details: [],
        };
      const details = courses.flatMap((course) => {
        const topics = customTopicsForCourse(store.snapshot().items, course);
        const progress = getCustomCourseProgress(course, topics);
        return [
          `${course.title} · ${progress.completed}/${progress.total} complete (${progress.percent}%)`,
          ...topics.map(
            (topic, index) =>
              `  ${index + 1}. ${getTopicLabel(topic)} · ${topicStatusLabel(topic.status)}`,
          ),
        ];
      });
      return {
        ok: true,
        message: `Your custom courses: ${courses.length} saved course${courses.length === 1 ? "" : "s"}.`,
        details,
      };
    },
  );
}

function createCustomCourseAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "title", "courseName", "name");
  return makeAction(
    "create-custom-course",
    `Create course “${requested || "the requested course"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const title = customTitle(requested, "course");
      const slug = slugify(title);
      const collision = getCustomCourses(store.snapshot().items, true).find(
        (course) => course.course === slug,
      );
      if (collision)
        throw new Error(
          `A custom course already uses the stable slug “${slug}”. Choose a different course name.`,
        );
      const course = store.create("subject", {
        title,
        course: slug,
        domain: CUSTOM_COURSE_DOMAIN,
        category: CUSTOM_COURSE_CATEGORY,
        sourceType: CUSTOM_COURSE_SOURCE_TYPE,
        archived: false,
        status: CUSTOM_COURSE_STATUS,
      });
      const message = `Custom course “${course.title}” created.`;
      store.notify(message, "success");
      return {
        ok: true,
        message,
        changed: 1,
        details: [`${course.title} · 0/0 topics complete`],
      };
    },
  );
}

function renameCustomCourseAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "newTitle", "title");
  return makeAction(
    "rename-custom-course",
    `Rename custom course to “${requested || "the requested name"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const course = resolveCustomCourse(current.items, args);
      const title = customTitle(requested, "course");
      const slug = slugify(title);
      const collision = getCustomCourses(current.items, true).find(
        (candidate) => candidate.id !== course.id && candidate.course === slug,
      );
      if (collision)
        throw new Error(
          `Another custom course already uses the stable slug “${slug}”. Choose a different name.`,
        );
      if (course.title === title)
        return {
          ok: true,
          message: `Custom course “${course.title}” already has that name.`,
          changed: 0,
        };
      store.update(course.id, { title });
      const message = `Custom course renamed to “${title}”; its stable slug and linked topic progress were preserved.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function archiveCustomCourseAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "courseName", "course", "name");
  return makeAction(
    "archive-custom-course",
    `Archive custom course “${requested || "the requested course"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const course = resolveCustomCourse(current.items, args);
      const linked = customTopicsForCourse(current.items, course, true);
      store.update(course.id, { archived: true });
      for (const topic of linked)
        if (!topic.archived) store.update(topic.id, { archived: true });
      const message = `Custom course “${course.title}” was archived with ${linked.length} linked topic${linked.length === 1 ? "" : "s"}; saved progress was kept.`;
      store.notify(message, "success");
      return {
        ok: true,
        message,
        changed: 1 + linked.filter((topic) => !topic.archived).length,
      };
    },
    {
      required: true,
      message: `This archives the named custom course and all linked topics without deleting their saved progress. Continue?`,
    },
  );
}

function addCustomTopicAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "title", "topicName", "name");
  return makeAction(
    "add-custom-topic",
    `Add topic “${requested || "the requested topic"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const course = resolveCustomCourse(current.items, args);
      const title = customTitle(requested, "topic");
      const topics = customTopicsForCourse(current.items, course);
      if (topics.some((topic) => normalize(topic.title) === normalize(title)))
        throw new Error(
          `A topic named “${title}” already exists in the “${course.title}” course.`,
        );
      const afterId = argumentString(args, "afterTopicId", "afterId");
      const afterName = argumentString(args, "afterTopicName", "after");
      const after = afterId
        ? topics.find((topic) => topic.id === afterId)
        : afterName
          ? resolveCustomTopic(
              current.items,
              { topicName: afterName },
              ["topicId"],
              course,
            )
          : undefined;
      if ((afterId || afterName) && !after)
        throw new Error(
          `I could not find one active topic to place “${title}” after in the “${course.title}” course.`,
        );
      const created = store.create("topic", {
        title,
        course: course.course,
        subjectId: course.id,
        domain: CUSTOM_COURSE_DOMAIN,
        roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
        sourceType: CUSTOM_COURSE_SOURCE_TYPE,
        order: topics.length + 1,
        status: CUSTOM_COURSE_TOPIC_STATUS,
        archived: false,
      });
      const ordered = [...topics, created];
      if (after) {
        const createdIndex = ordered.findIndex(
          (topic) => topic.id === created.id,
        );
        ordered.splice(createdIndex, 1);
        const afterIndex = ordered.findIndex((topic) => topic.id === after.id);
        ordered.splice(afterIndex + 1, 0, created);
      }
      const orderChanges = applyCustomTopicOrder(store, ordered);
      const message = `Topic “${created.title}” added to “${course.title}”.`;
      store.notify(message, "success");
      return {
        ok: true,
        message,
        changed: 1 + orderChanges,
        details: ordered.map(
          (topic, index) => `${index + 1}. ${getTopicLabel(topic)}`,
        ),
      };
    },
  );
}

function renameCustomTopicAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "newTitle", "title");
  return makeAction(
    "rename-custom-topic",
    `Rename custom topic to “${requested || "the requested name"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const courseSelector = argumentString(
        args,
        "courseId",
        "courseName",
        "course",
      );
      const course = courseSelector
        ? resolveCustomCourse(current.items, args)
        : undefined;
      const topic = resolveCustomTopic(
        current.items,
        args,
        ["topicId"],
        course,
      );
      const topicCourse =
        course ||
        getCustomCourses(current.items).find(
          (candidate) =>
            candidate.id === topic.subjectId &&
            candidate.course === topic.course,
        );
      if (!topicCourse)
        throw new Error("That custom topic is not linked to an active course.");
      const title = customTitle(requested, "topic");
      const duplicate = customTopicsForCourse(current.items, topicCourse).some(
        (candidate) =>
          candidate.id !== topic.id &&
          normalize(candidate.title) === normalize(title),
      );
      if (duplicate)
        throw new Error(
          `A topic named “${title}” already exists in the “${topicCourse.title}” course.`,
        );
      if (topic.title === title)
        return {
          ok: true,
          message: `Topic “${topic.title}” already has that name.`,
          changed: 0,
        };
      store.update(topic.id, { title });
      const message = `Topic renamed to “${title}”; its status, notes, evidence, links and ID were preserved.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
  );
}

function archiveCustomTopicAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const requested = argumentString(args, "topicName", "topic", "name");
  return makeAction(
    "archive-custom-topic",
    `Archive custom topic “${requested || "the requested topic"}”`,
    args,
    (store) => {
      ensureWritable(store);
      const current = store.snapshot();
      const courseSelector = argumentString(
        args,
        "courseId",
        "courseName",
        "course",
      );
      const course = courseSelector
        ? resolveCustomCourse(current.items, args)
        : undefined;
      const topic = resolveCustomTopic(
        current.items,
        args,
        ["topicId"],
        course,
      );
      store.update(topic.id, { archived: true });
      const message = `Topic “${topic.title}” was archived; its saved progress and links were kept.`;
      store.notify(message, "success");
      return { ok: true, message, changed: 1 };
    },
    {
      required: true,
      message:
        "This archives the named custom topic without deleting its saved progress or links. Continue?",
    },
  );
}

function moveCustomTopicAction(
  _snapshot: AssistantSource,
  args: AssistantActionArgs,
): AssistantAction {
  const position = argumentString(args, "position") || "before";
  return makeAction(
    "move-custom-topic",
    `Move custom topic ${position} its target`,
    args,
    (store) => {
      ensureWritable(store);
      if (position !== "before" && position !== "after")
        throw new Error(
          "Topic order supports only before or after a named topic.",
        );
      const current = store.snapshot();
      const courseSelector = argumentString(
        args,
        "courseId",
        "courseName",
        "course",
      );
      const course = courseSelector
        ? resolveCustomCourse(current.items, args)
        : undefined;
      const sourceName = argumentString(args, "topicName", "fromTopicName");
      const targetName = argumentString(
        args,
        "targetTopicName",
        "beforeTopicName",
        "afterTopicName",
      );
      const source = resolveCustomTopic(
        current.items,
        sourceName ? { ...args, topicName: sourceName } : args,
        ["topicId", "fromTopicId"],
        course,
      );
      const target = resolveCustomTopic(
        current.items,
        targetName ? { ...args, topicName: targetName } : args,
        ["targetTopicId", "beforeTopicId", "afterTopicId"],
        course,
      );
      if (source.id === target.id)
        throw new Error("Choose two different topics to reorder.");
      if (
        source.course !== target.course ||
        source.subjectId !== target.subjectId
      )
        throw new Error(
          "Source and target topics must be in the same custom course.",
        );
      const topicCourse =
        course ||
        current.items.find(
          (item) =>
            isCustomCourse(item) &&
            item.id === source.subjectId &&
            item.course === source.course,
        );
      if (!topicCourse)
        throw new Error(
          "Source and target topics are not linked to an active course.",
        );
      const ordered = customTopicsForCourse(current.items, topicCourse);
      const sourceIndex = ordered.findIndex((topic) => topic.id === source.id);
      ordered.splice(sourceIndex, 1);
      const targetIndex = ordered.findIndex((topic) => topic.id === target.id);
      const insertion = position === "after" ? targetIndex + 1 : targetIndex;
      ordered.splice(insertion, 0, source);
      const changed = applyCustomTopicOrder(store, ordered);
      const message = changed
        ? `Topic “${source.title}” moved ${position} “${target.title}”; its saved fields and ID were preserved.`
        : `Topic “${source.title}” is already ${position} “${target.title}”.`;
      if (changed) store.notify(message, "success");
      return {
        ok: true,
        message,
        changed,
        details: ordered.map(
          (topic, index) => `${index + 1}. ${getTopicLabel(topic)}`,
        ),
      };
    },
  );
}

type ActionFactory = (
  snapshot: AssistantSource,
  args: AssistantActionArgs,
) => AssistantAction;

/** The parser may only resolve one of these registered local action factories. */
export const ASSISTANT_ACTION_REGISTRY: Readonly<
  Record<AssistantActionId, ActionFactory>
> = {
  "today-plan": (_snapshot, args) =>
    makeAction("today-plan", "Show today’s plan", args, (store) => {
      const current = store.snapshot();
      const records = todayPlan(current);
      const summary = buildProgressSummary(current);
      return {
        ok: true,
        message: records.length
          ? `Today has ${records.length} saved plan item${records.length === 1 ? "" : "s"}; ${summary.taskDone}/${summary.taskTotal} dated tasks are complete.`
          : "There are no saved dated plan items for today.",
        details: planDetails(records),
        summary,
      };
    }),
  "progress-summary": (_snapshot, args) =>
    makeAction("progress-summary", "Show progress summary", args, (store) => {
      const summary = buildProgressSummary(store.snapshot());
      return {
        ok: true,
        message: `Today: ${summary.taskDone}/${summary.taskTotal} tasks complete, ${minutesLabel(summary.focusedMinutes)} focused, and ${summary.overdueTasks} overdue pending task${summary.overdueTasks === 1 ? "" : "s"}.`,
        summary,
      };
    }),
  "complete-java-today": completeJavaTodayAction,
  "reschedule-task": rescheduleTaskAction,
  "delete-task": deleteTaskAction,
  "replace-maths-with-dsa": replaceMathsAction,
  recovery: recoveryAction,
  "balance-next-week": balanceNextWeekAction,
  "priority-sort": prioritySortAction,
  "add-revision": revisionAction,
  "start-focus": startFocusAction,
  "change-theme": themeAction,
  "change-accent": accentAction,
  "change-density": densityAction,
  "change-reduced-motion": reducedMotionAction,
  "change-daily-goal": dailyGoalAction,
  "change-focus-duration": focusDurationAction,
  "set-widget-visibility": widgetVisibilityAction,
  "set-widget-size": widgetSizeAction,
  "move-widget": moveWidgetAction,
  "list-custom-courses": listCustomCoursesAction,
  "create-custom-course": createCustomCourseAction,
  "rename-custom-course": renameCustomCourseAction,
  "archive-custom-course": archiveCustomCourseAction,
  "add-custom-topic": addCustomTopicAction,
  "rename-custom-topic": renameCustomTopicAction,
  "archive-custom-topic": archiveCustomTopicAction,
  "move-custom-topic": moveCustomTopicAction,
};

function quotedText(input: string) {
  return input.match(/[“"]([^”"]+)[”"]/u)?.[1]?.trim();
}

const TASK_STOP_WORDS = new Set([
  "please",
  "the",
  "a",
  "an",
  "task",
  "tasks",
  "named",
  "to",
  "for",
  "on",
  "at",
  "tomorrow",
  "tmrw",
  "kal",
  "कल",
  "today",
  "aaj",
  "आज",
  "reschedule",
  "move",
  "shift",
  "postpone",
  "delete",
  "remove",
  "discard",
  "schedule",
  "को",
  "का",
  "की",
  "के",
  "करो",
  "karo",
]);

function taskNameFrom(input: string) {
  const quoted = quotedText(input);
  if (quoted) return quoted;
  return input
    .replace(DATE_PATTERN, " ")
    .split(/\s+/)
    .filter(
      (word) => !TASK_STOP_WORDS.has(normalize(word).replace(/[.,!?]/g, "")),
    )
    .join(" ")
    .replace(/[,:;.!?]+/g, " ")
    .trim();
}

function findNamedPendingTask(items: Item[], name: string) {
  const target = normalize(name);
  const records = items.filter(pendingTask);
  const exact = records.filter((item) => normalize(item.title) === target);
  if (exact.length === 1) return { item: exact[0], matches: exact };
  const matches = records.filter((item) => {
    const title = normalize(item.title);
    const haystack = normalize(
      [
        item.title,
        item.course,
        item.stage,
        item.description,
        ...(item.tags || []),
      ].join(" "),
    );
    const tokens = target.split(/\s+/).filter(Boolean);
    return (
      (target.length > 2 && title.includes(target)) ||
      (tokens.length > 0 && tokens.every((token) => haystack.includes(token)))
    );
  });
  return { item: matches.length === 1 ? matches[0] : undefined, matches };
}

function revisionSubjectFrom(input: string) {
  const quoted = quotedText(input);
  if (quoted) return quoted.slice(0, 150);
  const colon = input.split(":").slice(1).join(":").trim();
  if (colon) return colon.replace(DATE_PATTERN, "").trim().slice(0, 150);
  const match = input.match(
    /\b(?:about|for|on)\s+(.+?)(?:\s+(?:today|tomorrow|tmrw|kal|कल))?$/i,
  );
  if (match?.[1]) return match[1].trim().slice(0, 150);
  return "your last incomplete topic";
}

function focusTaskIdFrom(input: string, items: Item[]) {
  const match = input.match(/\b(?:for|on)\s+(.+)$/i);
  if (!match?.[1]) return undefined;
  const subject = match[1]
    .replace(/\b(today|tomorrow|tmrw|kal|कल)\b/gi, "")
    .trim();
  const found = findNamedPendingTask(items, subject);
  return found.matches.length === 1 ? found.matches[0].id : undefined;
}

function isPlanRequest(normalized: string) {
  if (
    /\b(?:hide|remove|delete|change|set|add|move|disable|enable)\b/i.test(
      normalized,
    ) &&
    !/^\s*(?:what|what's|what is|show)\b/i.test(normalized)
  )
    return false;
  return (
    (DAY_WORDS.test(normalized) &&
      /\b(plan|schedule|agenda|tasks?|study|padhna)\b|करना|क्या/i.test(
        normalized,
      )) ||
    /\b(what('?s| is) planned|what should i study)\b/i.test(normalized) ||
    /आज.*(प्लान|क्या पढ़)/i.test(normalized)
  );
}

function isProgressRequest(normalized: string) {
  return /\b(progress|summary|how am i doing|completed|done)\b|स्थिति|प्रगति|कितना किया/i.test(
    normalized,
  );
}

function isCompleteJavaRequest(normalized: string) {
  return (
    /\b(complete|finish|mark|done)\b|पूरा|पूरे|समाप्त|खत्म/i.test(normalized) &&
    /\bjava\b|जावा/i.test(normalized) &&
    (/\b(task|tasks)\b|काम|कार्य/i.test(normalized) ||
      /\b(today|aaj)\b|आज/i.test(normalized))
  );
}

function isReplacementRequest(normalized: string) {
  return (
    /\b(replace|swap|exchange)\b|बदल|स्थानांतरित/i.test(normalized) &&
    /\bmaths?\b/i.test(normalized) &&
    /\b(dsa|data structures?|algorithms?)\b/i.test(normalized) &&
    (/\b(today|aaj)\b|आज/i.test(normalized) || /\bslot\b/i.test(normalized))
  );
}

function isRecoveryRequest(normalized: string) {
  return /\b(missed|miss|recovery|recover)\b|छूट|रिकवरी|दिन/i.test(normalized);
}

function isBalanceRequest(normalized: string) {
  return (
    /\b(balance|spread|distribute)\b|हल्का/i.test(normalized) &&
    /\b(next week|next-week|agle hafte)\b|अगले हफ्ते/i.test(normalized)
  );
}

function isPrioritySortRequest(normalized: string) {
  return (
    /\b(sort|order|rank|priority)\b|क्रम/i.test(normalized) &&
    /\b(pending|unfinished|tasks?)\b|काम/i.test(normalized)
  );
}

function isRevisionRequest(normalized: string) {
  return (
    /\brevision\b|पुनरावृत्ति|रिविजन/i.test(normalized) &&
    WRITE_WORDS.test(normalized) &&
    /\b(note|session|study block)\b|नोट|सत्र/i.test(normalized)
  );
}

function isFocusRequest(normalized: string) {
  return (
    /\b(start|begin|launch)\b|शुरू/i.test(normalized) &&
    /\b(focus|pomodoro|deep work)\b|ध्यान/i.test(normalized)
  );
}

function isThemeRequest(normalized: string) {
  return /\b(theme|appearance|mode)\b|थीम/i.test(normalized);
}

function isSourceCodeRequest(normalized: string) {
  const sourceTarget =
    /\b(source(?:\s+code)?|css|react|file|files|project files?|component|components|repository|repo)\b|\b(?:src|app|lib|pages|components|scripts?)\/[\w./-]+|\b[\w.-]+\.(?:ts|tsx|js|jsx|css|html|json)\b|सोर्स|कोड|सीएसएस|रिएक्ट|फ़ाइल|फाइल|प्रोजेक्ट/i.test(
      normalized,
    );
  const directCodeEdit =
    /\b(?:edit|modify|change|update|add|create|write|fix|implement|build|refactor)\s+(?:the\s+)?code\b|\bcode\b\s+(?:in|for|to)\s+(?:the\s+)?(?:app|project|file|component)\b/i.test(
      normalized,
    );
  const editIntent =
    /\b(edit|modify|change|update|add|create|remove|delete|write|fix|implement|build|make|refactor|alter|touch)\b|बदल|संशो|जोड़|बना|लिख|ठीक|अपडेट|हटा/i.test(
      normalized,
    );
  return (
    /\b(?:add|build|create|implement|make)\s+(?:a\s+)?(?:new\s+)?feature\b/i.test(
      normalized,
    ) ||
    ((sourceTarget || directCodeEdit) && editIntent) ||
    /\b(?:change|update|edit|modify)\s+(?:the\s+)?(?:css|react|source|code|files?)\b/i.test(
      normalized,
    ) ||
    /(?:फीचर|सुविधा).*(?:जोड़|बना|बदल)|(?:सीएसएस|रिएक्ट|कोड|सोर्स|फ़ाइल|फाइल).*(?:बदल|संशो|अपडेट|ठीक|जोड़)/i.test(
      normalized,
    )
  );
}

function commandHead(normalized: string) {
  return normalized
    .split(/\b(?:about|regarding|on\s+the\s+topic\s+of)\b|;/i)[0]
    .trim();
}

function hasWidgetNoun(normalized: string) {
  return /\b(?:widget|widgets|section|sections|dashboard|layout)\b|विजेट|सेक्शन|डैशबोर्ड|लेआउट/i.test(
    normalized,
  );
}

function isStandaloneRevisionRequest(normalized: string) {
  return (
    isRevisionRequest(normalized) &&
    /^(?:please\s+)?(?:add|create|make|save)\s+(?:a\s+|an\s+)?revision\s+(?:note|session)\b/i.test(
      normalized,
    ) &&
    !/\b(?:and|then|also)\s+(?:edit|modify|change|update|add|remove|delete|fix|implement)\b/i.test(
      normalized,
    )
  );
}

function isTaskRecordRequest(normalized: string) {
  const command =
    /^(?:please\s+)?(?:reschedule|move|shift|postpone|delete|remove|discard)\b/i.test(
      normalized,
    );
  if (!command) return false;
  const head = commandHead(normalized);
  return (
    /\b(?:task|record)\b/i.test(head) ||
    (/[“"]/u.test(normalized) && !hasWidgetNoun(head))
  );
}

function isNonMutationRequest(normalized: string) {
  const negated =
    /^(?:please\s+)?(?:do\s+not|don't|dont|never)\b|^(?:कृपया\s*)?(?:मत|नहीं)\b|(?:^|\s)(?:मत|नहीं|mat)(?:\s|$)/i.test(
      normalized,
    );
  const question =
    /\?/.test(normalized) ||
    /^(?:what|why|how|is|are|can|could|should|do|does|would|tell\s+me)\b/i.test(
      normalized,
    );
  const descriptive =
    /^(?:the|my|i\b|this|that)\b.*\b(?:is|are|use|uses|has|have)\b/i.test(
      normalized,
    ) ||
    /^(?:theme|accent|density|reduced[-\s]+motion|daily\s+goal|focus\s+duration)\b.*\b(?:is|are)\b/i.test(
      normalized,
    );
  return negated || question || descriptive;
}

function hasExplicitWriteIntent(normalized: string) {
  return (
    /^(?:please\s+)?(?:change|switch|set|make|use|turn|enable|disable|reduce|choose|select|update)\b/i.test(
      normalized,
    ) ||
    /(?:करो|करना|कर दो|बदल|सेट|चालू|बंद|कम\s*कर|\bband\b|\bchalu\b)/i.test(
      normalized,
    ) ||
    /^(?:focus\s+(?:duration|block|time)|(?:दैनिक|रोज़?|रोज)\s*(?:का\s*)?(?:फोकस\s*)?लक्ष्य|(?:फोकस|ध्यान)\s*(?:की\s*)?(?:अवधि|समय|ब्लॉक))(?:\s|$).*\d/i.test(
      normalized,
    )
  );
}

function isCompoundMutationRequest(normalized: string) {
  if (
    isStandaloneRevisionRequest(normalized) ||
    isTaskRecordRequest(normalized)
  )
    return false;
  return (
    /\b(?:and|then|also|or)\b/i.test(normalized) ||
    /;\s*(?:please\s+)?(?:change|switch|set|make|use|turn|enable|disable|add|remove|delete|start|complete|hide|show|move)\b/i.test(
      normalized,
    ) ||
    /,\s*(?:please\s+)?(?:do\s+not|don't|dont|change|switch|set|make|use|turn|enable|disable|add|remove|delete|start|complete|hide|show|move)\b/i.test(
      normalized,
    )
  );
}

function isWidgetVisibilityCommand(normalized: string) {
  const head = commandHead(normalized);
  return (
    /^(?:please\s+)?(?:show|hide|display|enable|disable|add|remove)\b/i.test(
      head,
    ) ||
    /^(?:please\s+)?turn\s+(?:on|off)\b/i.test(head) ||
    /^(?:दिख|छुप|छिप|हटा|बंद|चालू|जोड़)/i.test(head) ||
    /(?:दिख|छुप|छिप|हटा|बंद|चालू|जोड़)\S*$/i.test(head)
  );
}

function isWidgetSizeCommand(normalized: string) {
  const head = commandHead(normalized);
  return /^(?:please\s+)?(?:make|set|resize|change|use|switch)\b/i.test(head);
}

function isUnsupportedWidgetOrLayoutRequest(normalized: string) {
  const head = commandHead(normalized);
  const mentions = widgetMentions(normalized);
  const layoutChange =
    /\b(?:layout|grid|columns?|rows?|responsive\s+layout)\b/i.test(head) &&
    /\b(?:change|set|make|build|add|remove|modify|update)\b/i.test(head);
  if (layoutChange) return true;
  if (hasWidgetNoun(head) && /^(?:please\s+)?(?:delete|discard)\b/i.test(head))
    return true;
  if (isWidgetMoveRequest(normalized) && mentions.length < 2) return true;
  if (!hasWidgetNoun(head)) return false;
  if (isWidgetVisibilityCommand(normalized) && !mentions.length) return true;
  if (
    isWidgetSizeCommand(normalized) &&
    (!mentions.length || !widgetSizeValue(head))
  )
    return true;
  return false;
}

function isAccentRequest(normalized: string) {
  return (
    /\b(?:accent|accent\s+color|highlight\s+color)\b|एक्सेंट|रंग/i.test(
      normalized,
    ) ||
    /^(?:please\s+)?(?:change|set|switch)\s+(?:the\s+)?color\b/i.test(
      normalized,
    )
  );
}

function accentValue(normalized: string) {
  if (/\blime\b|लाइम|हरा|हरी/i.test(normalized)) return "lime";
  if (/\bblue\b|नीला|नीली|नीले/i.test(normalized)) return "blue";
  if (/\bviolet\b|बैंगनी|जामुनी|वायलेट/i.test(normalized)) return "violet";
  return undefined;
}

function isDensityRequest(normalized: string) {
  return (
    /\b(?:density|spacing|workspace\s+density)\b|घनत्व|डेंसिटी|स्पेसिंग/i.test(
      normalized,
    ) || /\bworkspace\b.*\b(?:compact|comfortable)\b/i.test(normalized)
  );
}

function densityValue(normalized: string) {
  if (/\bcompact\b|सघन|कॉम्पैक्ट|कम्पैक्ट/i.test(normalized)) return "compact";
  if (/\bcomfortable\b|आरामदायक|कंफर्टेबल|सुविधाजनक/i.test(normalized))
    return "comfortable";
  return undefined;
}

function isReducedMotionRequest(normalized: string) {
  return /\b(?:reduced?[-\s]+motion|motion[-\s]+reduction|animations?|transitions?)\b|(?:कम\s*)?(?:गति|मोशन|एनीमेशन)/i.test(
    normalized,
  );
}

function reducedMotionValue(normalized: string): boolean | undefined {
  const animationTarget =
    /\b(?:animation|animations|transition|transitions)\b|एनीमेशन|ट्रांज़िशन/i.test(
      normalized,
    );
  const off =
    /\b(?:off|disable|disabled|turn\s+off|without|no)\b|बंद|अक्षम|निष्क्रिय|हटाओ|नहीं|\bband\b/i.test(
      normalized,
    );
  const on =
    /\b(?:on|enable|enabled|turn\s+on|reduce)\b|चालू|सक्रिय|कम\s*कर|हाँ|\bchalu\b/i.test(
      normalized,
    );
  if (off === on) return undefined;
  // “Reduced motion” names the preference directly. Animation/transition
  // language describes the inverse: disabling animation enables reduction.
  return animationTarget ? off : on;
}

function isDailyGoalRequest(normalized: string) {
  return (
    /\b(?:daily|day|today)\s+(?:focus\s+)?(?:goal|target)\b/i.test(
      normalized,
    ) ||
    /\b(?:daily|focus)\s+goal\b/i.test(normalized) ||
    /\bgoal\b.*\b(?:minutes?|mins?|min)\b/i.test(normalized) ||
    /(?:दैनिक|रोज़?|रोज)\s*(?:का\s*)?(?:फोकस\s*)?(?:लक्ष्य|टारगेट)/i.test(
      normalized,
    )
  );
}

function isFocusDurationRequest(normalized: string) {
  return (
    /\b(?:focus\s+(?:duration|block|time|minutes?)|pomodoro\s+(?:duration|length|time)|deep\s+work\s+(?:duration|block)|session\s+duration)\b/i.test(
      normalized,
    ) ||
    /\bfocus\b.*\b(?:minutes?|mins?|min)\b/i.test(normalized) ||
    /(?:फोकस|ध्यान)\s*(?:की\s*)?(?:अवधि|समय|ब्लॉक|मिनट)/i.test(normalized)
  );
}

function minutesValue(normalized: string) {
  // Never recover a plausible-looking positive prefix from a malformed value.
  // In particular, “-25”, “1/2”, “1e2”, and “1,000” must not become 25, 1,
  // 1, or 1 minute respectively.
  if (
    /\d[\d,]*,\d|\d+\s*\/\s*\d|\d+[eE][+\-]?\d+|[+\-−]\s*\d/u.test(normalized)
  )
    return Number.NaN;
  if (
    /(?<![\p{L}\p{N}])[+\-−]?\d+(?:\.\d+)?\s*(?:hours?|hrs?|hr|h|seconds?|secs?|sec|days?|day|weeks?|wks?|wk|milliseconds?|millisecond|ms|sessions?|blocks?|pomodoros?|घंटा|घंटे|घंटों|सेकंड|सेकण्ड|दिन|हफ्ते?)(?![\p{L}\p{N}])/iu.test(
      normalized,
    )
  )
    return Number.NaN;
  const withUnit = normalized.match(
    /(?<![\p{L}\p{N}/])([+\-−]?\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?|मिनट|मिनिट)(?![\p{L}\p{N}])/iu,
  );
  if (withUnit) return Number(withUnit[1]);
  const labelled = normalized.match(
    /(?:goal|target|duration|block|focus|अवधि|लक्ष्य|समय)[^\d+\-−]{0,24}([+\-−]?\d+(?:\.\d+)?)(?![\d.,])/iu,
  );
  if (labelled) return Number(labelled[1]);
  const assigned = normalized.match(
    /(?:\bto\b|\bfor\b|\bat\b|=|:|को|के|का)\s*([+\-−]?\d+(?:\.\d+)?)(?![\d.,])/iu,
  );
  return assigned ? Number(assigned[1]) : undefined;
}

function phraseIndex(input: string, phrase: string) {
  if (/^[\x00-\x7F]+$/.test(phrase)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return input.search(new RegExp(`\\b${escaped}\\b`, "i"));
  }
  return input.indexOf(phrase);
}

function widgetMentions(normalized: string) {
  return ASSISTANT_SUPPORTED_DASHBOARD_WIDGETS.map((widget) => {
    const indexes = widget.aliases
      .map((alias) => phraseIndex(normalized, alias))
      .filter((index) => index >= 0);
    return { id: widget.id, index: indexes.length ? Math.min(...indexes) : -1 };
  })
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index);
}

function isWidgetReference(normalized: string) {
  return (
    /\b(?:widget|dashboard|layout)\b|विजेट|डैशबोर्ड|लेआउट/i.test(normalized) ||
    widgetMentions(normalized).length > 0
  );
}

function isWidgetMoveRequest(normalized: string) {
  return (
    /^(?:please\s+)?(?:move|place|put|reorder|position)\b/i.test(normalized) &&
    /\b(?:before|above|ahead|prior)\b|से\s*पहले|के\s*आगे|आगे/i.test(
      normalized,
    ) &&
    isWidgetReference(normalized)
  );
}

function isWidgetSizeRequest(normalized: string) {
  return (
    isWidgetSizeCommand(normalized) &&
    /\b(?:size|resize|width|wide|normal|full\s+width|half\s+width)\b|आकार|चौड़ा|चौड़ी|सामान्य/i.test(
      normalized,
    ) &&
    hasWidgetNoun(commandHead(normalized)) &&
    widgetMentions(normalized).length > 0
  );
}

function isWidgetVisibilityRequest(normalized: string) {
  return (
    isWidgetVisibilityCommand(normalized) &&
    hasWidgetNoun(commandHead(normalized)) &&
    widgetMentions(commandHead(normalized)).length > 0
  );
}

function widgetVisibilityValue(normalized: string): boolean | undefined {
  const hide =
    /^(?:please\s+)?(?:hide|hidden|disable|invisible|remove|delete|discard|turn\s+off)\b|^(?:छिप|छुप|बंद|हटा)|(?:छिप|छुप|बंद|हटा)\S*$/i.test(
      commandHead(normalized),
    );
  const show =
    /^(?:please\s+)?(?:show|display|enable|visible|add|bring\s+back|turn\s+on)\b|^(?:दिख|दृश्य|चालू|जोड़)|(?:दिख|दृश्य|चालू|जोड़)\S*$/i.test(
      commandHead(normalized),
    );
  if (hide === show) return undefined;
  return show;
}

function widgetSizeValue(normalized: string) {
  if (/\b(?:wide|full\s+width|large)\b|चौड़ा|चौड़ी|बड़ा/i.test(normalized))
    return "wide";
  if (/\b(?:normal|half\s+width|standard)\b|सामान्य/i.test(normalized))
    return "normal";
  return undefined;
}

function parseDays(normalized: string): 1 | 3 | 7 | null {
  const match = normalized.match(
    /\b(1|3|7)\s*(?:-?day|days?)\b|([137])\s*दिन/i,
  );
  if (match) return Number(match[1] || match[2]) as 1 | 3 | 7;
  if (/\bone\b.*\bday\b|एक दिन/i.test(normalized)) return 1;
  if (/\bthree\b.*\bday\b|तीन दिन/i.test(normalized)) return 3;
  if (/\bseven\b.*\bday\b|सात दिन/i.test(normalized)) return 7;
  return null;
}

function customName(value: string | undefined) {
  const trimmed = value
    ?.trim()
    .replace(/^[“"]|[”"]$/gu, "")
    .replace(/[,:;.!?]+$/g, "")
    .trim();
  return trimmed || undefined;
}

function customActionError(cause: unknown): AssistantParseResult {
  return errorMessage(
    cause instanceof Error
      ? cause.message
      : "That custom-course request is not specific enough.",
  );
}

function isCustomCourseListRequest(normalized: string) {
  return (
    /\b(?:show|list|display|view|what|which|tell)\b/i.test(normalized) &&
    /\bcourses?\b/i.test(normalized) &&
    !/\b(?:create|make|add|rename|archive|remove|delete|move|change)\b/i.test(
      normalized,
    ) &&
    (/\b(?:progress|topics?|status|outline)\b/i.test(normalized) ||
      /\b(?:my|custom)\s+courses?\b/i.test(normalized))
  );
}

function isCustomCustomizationHint(normalized: string) {
  return (
    /\b(?:course|courses|topic|topics)\b/i.test(normalized) ||
    /^(?:please\s+)?add\b.*\b(?:after|to|in|for)\b/i.test(normalized)
  );
}

function looksLikeCustomRecordCommand(normalized: string) {
  const verb =
    /^(?:please\s+)?(?:create|make|rename|archive|remove|delete|add|move)\b/i.test(
      normalized,
    );
  const record =
    /\b(?:course|courses|topic|topics)\b/i.test(normalized) ||
    /^(?:please\s+)?add\b.*\bafter\b/i.test(normalized);
  const sourceWords =
    /\b(?:source|code|file|files|project|repository|repo|component|css|html|typescript|javascript)\b/i.test(
      normalized,
    );
  return verb && record && !sourceWords;
}

function customUnsupportedRequest(normalized: string) {
  if (
    /\bproper\s+sequence\b|\b(?:ideal|best|correct)\s+(?:course|topic)\s+sequence\b/i.test(
      normalized,
    ) &&
    !/\b(?:before|after)\b/i.test(normalized)
  )
    return "I can reorder custom topics only with a concrete source topic and target topic using “before” or “after”; no course data was changed.";
  if (
    /\b(?:backend|account|remote|server|database|api|subscription|billing)\b/i.test(
      normalized,
    )
  )
    return "I can only manage local custom course and topic records. Backend, account, and remote-service requests need the appropriate coding-agent or connected-service flow; no local course data was changed.";
  if (
    /\b(?:official|canonical|imported|college|university|provider|platform)\s+course\b/i.test(
      normalized,
    )
  )
    return "I can create and edit local custom courses only. Canonical, imported, college, and provider course changes need their existing app flow; no local course data was changed.";
  if (
    /\bcourse\b.*\b(?:from|for|on)\s+(?:an?\s+)?(?:college|university|provider|platform|coursera|udemy|backend|remote)\b/i.test(
      normalized,
    )
  )
    return "I can create and edit local custom courses only. External or provider course requests need their existing app flow; no local course data was changed.";
  return undefined;
}

function activeCourseForParser(
  items: Item[],
  name: string | undefined,
  inferWhenOne = false,
) {
  const courses = getCustomCourses(items);
  if (name) {
    const matches = customCourseMatches(items, name);
    if (matches.length > 1)
      throw new Error(
        `More than one custom course matches “${name}”. Use its exact name or slug.`,
      );
    if (!matches.length)
      throw new Error(`I could not find one custom course named “${name}”.`);
    return matches[0];
  }
  if (inferWhenOne && courses.length === 1) return courses[0];
  if (!courses.length)
    throw new Error("No active custom course is saved. Create one first.");
  throw new Error(
    `Name the custom course; ${courses.length} active custom course${courses.length === 1 ? " is" : "s are"} available.`,
  );
}

function activeTopicsForParser(items: Item[], course?: Item) {
  return course
    ? customTopicsForCourse(items, course)
    : items.filter((item) => isCustomCourseTopic(item) && !item.archived);
}

function topicMatchesForParser(items: Item[], name: string, course?: Item) {
  return activeTopicsForParser(items, course).filter(
    (topic) => normalize(topic.title) === normalize(name),
  );
}

function resolveTopicForParser(items: Item[], name: string, course?: Item) {
  const matches = topicMatchesForParser(items, name, course);
  if (matches.length > 1)
    throw new Error(
      `More than one active custom topic matches “${name}”. Name its course and use a more specific topic title.`,
    );
  if (!matches.length)
    throw new Error(
      `I could not find one active custom topic named “${name}”.`,
    );
  return matches[0];
}

function parseCustomCourseRequest(
  text: string,
  normalized: string,
  snapshot: AssistantSource,
): AssistantParseResult | null {
  if (!isCustomCustomizationHint(normalized)) return null;
  const unsupportedRequest = customUnsupportedRequest(normalized);
  if (unsupportedRequest) return unsupported(unsupportedRequest);

  if (isCustomCourseListRequest(normalized))
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["list-custom-courses"](snapshot, {}),
    };

  let match = text.match(
    /^(?:please\s+)?(?:create|make)\s+(?:(?:a|an)\s+)?(?:new\s+)?(.+?)\s+course\s*$/i,
  );
  if (!match)
    match = text.match(
      /^(?:please\s+)?(?:create|make)\s+(?:(?:a|an)\s+)?(?:new\s+)?course\s+(?:called\s+)?(.+?)\s*$/i,
    );
  if (match) {
    const title = customName(match[1]);
    if (!title) return errorMessage("Name the custom course to create.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["create-custom-course"](snapshot, {
        title,
      }),
    };
  }

  match = text.match(
    /^(?:please\s+)?rename\s+(?:my\s+)?(?:custom\s+)?course(?:\s+(.+?))?\s+to\s+(.+?)\s*$/i,
  );
  if (match) {
    try {
      const oldName = customName(match[1]);
      const title = customName(match[2]);
      if (!title) throw new Error("Name the new custom course title.");
      const course = oldName
        ? activeCourseForParser(snapshot.items, oldName)
        : activeCourseForParser(snapshot.items, undefined, true);
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["rename-custom-course"](snapshot, {
          courseId: course.id,
          newTitle: title,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?(?:archive|remove|delete)\s+(?:my\s+)?(?:custom\s+)?course(?:\s+(.+?))?\s*$/i,
  );
  if (match) {
    try {
      const course = activeCourseForParser(
        snapshot.items,
        customName(match[1]),
      );
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["archive-custom-course"](snapshot, {
          courseId: course.id,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?rename\s+(?:my\s+)?(?:custom\s+)?topic\s+(.+?)\s+to\s+(.+?)(?:\s+(?:in|within|for)\s+(?:the\s+)?(?:custom\s+)?course\s+(.+?))?\s*$/i,
  );
  if (match) {
    try {
      const topicName = customName(match[1]);
      const title = customName(match[2]);
      if (!topicName) throw new Error("Name the custom topic to rename.");
      if (!title) throw new Error("Name the new custom topic title.");
      const course = activeCourseForParser(
        snapshot.items,
        customName(match[3]),
        !match[3],
      );
      const topic = resolveTopicForParser(snapshot.items, topicName!, course);
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["rename-custom-topic"](snapshot, {
          courseId: course.id,
          topicId: topic.id,
          newTitle: title,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?(?:archive|remove|delete)\s+(?:my\s+)?(?:custom\s+)?topic\s+(.+?)(?:\s+(?:from|in|within|for)\s+(?:the\s+)?(?:custom\s+)?course\s+(.+?))?\s*$/i,
  );
  if (match) {
    try {
      const topicName = customName(match[1]);
      if (!topicName) throw new Error("Name the custom topic to archive.");
      const course = activeCourseForParser(
        snapshot.items,
        customName(match[2]),
        !match[2],
      );
      const topic = resolveTopicForParser(snapshot.items, topicName!, course);
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["archive-custom-topic"](snapshot, {
          courseId: course.id,
          topicId: topic.id,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?add\s+(?:(?:a|an)\s+|new\s+)?(?:topic\s+)?(.+?)\s+after\s+(?:topic\s+)?(.+?)(?:\s+(?:in|to|for)\s+(?:the\s+)?course\s+(.+?))?\s*$/i,
  );
  if (match) {
    try {
      const title = customName(match[1]);
      const afterName = customName(match[2]);
      if (!title) throw new Error("Name the custom topic to add.");
      if (!afterName) throw new Error("Name the topic to place it after.");
      const course = activeCourseForParser(
        snapshot.items,
        customName(match[3]),
        !match[3],
      );
      const after = resolveTopicForParser(snapshot.items, afterName!, course);
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["add-custom-topic"](snapshot, {
          courseId: course.id,
          title,
          afterTopicId: after.id,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?add\s+(?:(?:a|an)\s+|new\s+)?(?:topic\s+)(.+?)\s+(?:to|in|for)\s+(?:the\s+)?course\s+(.+?)\s*$/i,
  );
  if (!match)
    match = text.match(
      /^(?:please\s+)?add\s+(?:(?:a|an)\s+|new\s+)?(?:topic\s+)?(.+?)\s+(?:to|in|for)\s+(?:the\s+)?(?:course\s+)?(.+?)\s*$/i,
    );
  if (match) {
    try {
      const title = customName(match[1]);
      const course = activeCourseForParser(
        snapshot.items,
        customName(match[2]),
      );
      if (!title) throw new Error("Name the custom topic to add.");
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["add-custom-topic"](snapshot, {
          courseId: course.id,
          title,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  match = text.match(
    /^(?:please\s+)?move\s+(?:the\s+)?(?:topic\s+)?(.+?)\s+(before|after)\s+(?:the\s+)?(?:topic\s+)?(.+?)(?:\s+(?:in|within|for)\s+(?:the\s+)?course\s+(.+?))?\s*$/i,
  );
  if (match) {
    try {
      const sourceName = customName(match[1]);
      const position = match[2].toLocaleLowerCase();
      const targetName = customName(match[3]);
      if (!sourceName || !targetName)
        throw new Error("Name both the source topic and the target topic.");
      const course = match[4]
        ? activeCourseForParser(snapshot.items, customName(match[4]))
        : undefined;
      const source = resolveTopicForParser(snapshot.items, sourceName, course);
      const target = resolveTopicForParser(snapshot.items, targetName, course);
      const sourceCourse =
        course ||
        snapshot.items.find(
          (item) =>
            isCustomCourse(item) &&
            item.id === source.subjectId &&
            item.course === source.course,
        );
      if (!sourceCourse)
        throw new Error(
          "Those topics are not linked to one active custom course.",
        );
      if (
        source.course !== target.course ||
        source.subjectId !== target.subjectId
      )
        throw new Error(
          "Source and target topics must be in the same custom course.",
        );
      return {
        kind: "action",
        action: ASSISTANT_ACTION_REGISTRY["move-custom-topic"](snapshot, {
          courseId: sourceCourse.id,
          topicId: source.id,
          targetTopicId: target.id,
          position,
        }),
      };
    } catch (cause) {
      return customActionError(cause);
    }
  }

  if (
    /\b(?:create|make|rename|archive|remove|delete|add|move)\b/i.test(
      normalized,
    )
  )
    return errorMessage(
      "Name the custom course/topic and, for reordering, give a concrete source and target using “before” or “after”; nothing was changed.",
    );
  return null;
}

export function parseAssistantRequest(
  input: string,
  snapshot: AssistantSource,
): AssistantParseResult {
  const text = input.trim();
  if (!text)
    return unsupported("Type a request or choose one of the examples.");
  const normalized = normalize(text);
  const standaloneRevision = isStandaloneRevisionRequest(normalized);
  const taskRecordRequest = isTaskRecordRequest(normalized);

  if (
    (isSourceCodeRequest(normalized) ||
      isUnsupportedWidgetOrLayoutRequest(normalized)) &&
    !standaloneRevision &&
    !taskRecordRequest &&
    !looksLikeCustomRecordCommand(normalized)
  )
    return {
      kind: "message",
      tone: "info",
      message: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
    };

  if (
    isNonMutationRequest(normalized) &&
    !isPlanRequest(normalized) &&
    !isProgressRequest(normalized) &&
    !isCustomCourseListRequest(normalized)
  )
    return unsupported(
      "I only apply explicit local commands. Questions, descriptions, and negated requests do not change saved data.",
    );

  if (
    isCompoundMutationRequest(normalized) &&
    !isCustomCourseListRequest(normalized)
  )
    return unsupported(
      "That request contains more than one possible change. Send one explicit local command at a time; nothing was changed.",
    );

  if (!taskRecordRequest && standaloneRevision) {
    const date = dateToken(text, today());
    if (date.error) return errorMessage(date.error);
    const kind = /\b(note)\b|नोट/i.test(normalized) ? "note" : "session";
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["add-revision"](snapshot, {
        kind,
        subject: revisionSubjectFrom(text),
        date: date.value || today(),
      }),
    };
  }

  const customRequest = parseCustomCourseRequest(text, normalized, snapshot);
  if (customRequest) return customRequest;

  if (!taskRecordRequest && isWidgetMoveRequest(normalized)) {
    const mentions = widgetMentions(normalized);
    if (mentions.length < 2)
      return {
        kind: "message",
        tone: "info",
        message: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
      };
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["move-widget"](snapshot, {
        widgetId: mentions[0].id,
        beforeWidgetId: mentions[1].id,
      }),
    };
  }

  if (!taskRecordRequest && isWidgetSizeRequest(normalized)) {
    const widget = widgetMentions(normalized)[0];
    if (!widget)
      return errorMessage(
        "Name one supported dashboard widget to resize: agenda, tracks, focus, goals, activity, or review.",
      );
    const size = widgetSizeValue(normalized);
    if (!size)
      return {
        kind: "message",
        tone: "info",
        message: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
      };
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["set-widget-size"](snapshot, {
        widgetId: widget.id,
        size,
      }),
    };
  }

  if (!taskRecordRequest && isWidgetVisibilityRequest(normalized)) {
    const widget = widgetMentions(normalized)[0];
    if (!widget)
      return errorMessage(
        "Name one supported dashboard widget to show or hide: agenda, tracks, focus, goals, activity, or review.",
      );
    const visible = widgetVisibilityValue(normalized);
    if (visible === undefined)
      return errorMessage("Widget visibility supports only show or hide.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["set-widget-visibility"](snapshot, {
        widgetId: widget.id,
        visible,
      }),
    };
  }

  if (
    !taskRecordRequest &&
    hasExplicitWriteIntent(normalized) &&
    isAccentRequest(normalized)
  ) {
    const accent = accentValue(normalized);
    if (!accent)
      return errorMessage("Accent supports only lime, blue, or violet.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-accent"](snapshot, { accent }),
    };
  }

  if (
    !taskRecordRequest &&
    hasExplicitWriteIntent(normalized) &&
    isDensityRequest(normalized)
  ) {
    const density = densityValue(normalized);
    if (!density)
      return errorMessage(
        "Workspace density supports only comfortable or compact.",
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-density"](snapshot, {
        density,
      }),
    };
  }

  if (
    !taskRecordRequest &&
    hasExplicitWriteIntent(normalized) &&
    isReducedMotionRequest(normalized)
  ) {
    const enabled = reducedMotionValue(normalized);
    if (enabled === undefined)
      return errorMessage("Reduced motion must be set to on or off.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-reduced-motion"](snapshot, {
        enabled,
      }),
    };
  }

  if (
    !taskRecordRequest &&
    hasExplicitWriteIntent(normalized) &&
    isDailyGoalRequest(normalized)
  ) {
    const minutes = minutesValue(normalized);
    if (minutes === undefined)
      return errorMessage(
        "Tell me the daily goal in whole minutes, from 1 to 1440.",
      );
    if (
      !validBoundedMinutes(
        minutes,
        ASSISTANT_SUPPORTED_VALUES.dailyGoalMinutes.min,
        ASSISTANT_SUPPORTED_VALUES.dailyGoalMinutes.max,
      )
    )
      return errorMessage("Daily goals support whole minutes from 1 to 1440.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-daily-goal"](snapshot, {
        minutes,
      }),
    };
  }

  if (isReplacementRequest(normalized)) {
    return replacementPairs(snapshot).length
      ? {
          kind: "action",
          action: ASSISTANT_ACTION_REGISTRY["replace-maths-with-dsa"](
            snapshot,
            {
              pairIds: replacementPairs(snapshot).flatMap(({ maths, dsa }) => [
                maths.id,
                dsa.id,
              ]),
            },
          ),
        }
      : unsupported(
          "I can replace Maths with Java/DSA only when today has an uncompleted Maths schedule record and an uncompleted Java/DSA record to move. Completed work stays protected.",
        );
  }

  if (isCompleteJavaRequest(normalized)) {
    const day = today();
    const matches = snapshot.items.filter(
      (item) =>
        pendingTask(item) &&
        datedValue(item) === day &&
        /\bjava\b|जावा/i.test(
          normalize(
            [item.title, item.course, item.stage, ...(item.tags || [])].join(
              " ",
            ),
          ),
        ),
    );
    if (!matches.length)
      return unsupported(
        "No incomplete Java task is scheduled for today in your saved workspace.",
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["complete-java-today"](snapshot, {
        taskIds: matches.map((item) => item.id),
        titles: matches.map((item) => item.title),
      }),
    };
  }

  if (isRecoveryRequest(normalized)) {
    const days = parseDays(normalized);
    if (!days)
      return errorMessage(
        "Recovery supports exactly 1, 3, or 7 days. Try “missed 3 days — recovery.”",
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY.recovery(snapshot, {
        days,
        optionalIds: recoveryOptionalItems(snapshot, days).map(
          (item) => item.id,
        ),
      }),
    };
  }

  if (isBalanceRequest(normalized))
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["balance-next-week"](snapshot, {
        candidateIds: balanceCandidates(snapshot).map((item) => item.id),
      }),
    };

  if (isPrioritySortRequest(normalized))
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["priority-sort"](snapshot, {}),
    };

  if (
    /\b(replace|swap|exchange)\b|बदल/i.test(normalized) &&
    /\bmaths?\b/i.test(normalized)
  )
    return unsupported(
      "I only replace Maths with Java/DSA for today’s saved schedule. Include both “Maths” and “DSA” plus today/aaj.",
    );

  if (
    /\b(reschedule|move|shift|postpone)\b/i.test(normalized) ||
    /रीशेड्यूल|पुनर्निर्धारित|कल.*काम/i.test(normalized)
  ) {
    const target = dateToken(text);
    if (target.error) return errorMessage(target.error);
    if (!target.value)
      return errorMessage(
        "Tell me when to move the named task: use tomorrow/कल or a real YYYY-MM-DD date.",
      );
    const name = taskNameFrom(text);
    if (!name) return errorMessage("Name one pending task to reschedule.");
    const found = findNamedPendingTask(snapshot.items, name);
    if (found.matches.length > 1)
      return errorMessage(
        `I found ${found.matches.length} pending tasks matching “${name}”. Add a few more title words so I do not move the wrong record.`,
      );
    if (!found.item)
      return errorMessage(
        `I could not find one pending task named “${name}”. Use the saved task title as written.`,
      );
    if (isScheduleItem(found.item) && target.value < START_DATE)
      return errorMessage(
        `Saved study-schedule records cannot be moved before ${START_DATE}.`,
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["reschedule-task"](snapshot, {
        taskId: found.item.id,
        targetDate: target.value,
      }),
    };
  }

  if (/\b(delete|remove|discard)\b|हटाओ|मिटाओ/i.test(normalized)) {
    const name = taskNameFrom(text);
    if (!name) return errorMessage("Name one saved task to delete.");
    const found = findNamedPendingTask(snapshot.items, name);
    if (found.matches.length > 1)
      return errorMessage(
        `I found ${found.matches.length} pending tasks matching “${name}”. Add more title words so I do not delete the wrong record.`,
      );
    if (!found.item)
      return errorMessage(
        `I could not find one pending task named “${name}”. Completed work is protected from this fallback action.`,
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["delete-task"](snapshot, {
        taskId: found.item.id,
      }),
    };
  }

  if (isFocusRequest(normalized)) {
    const taskId = focusTaskIdFrom(text, snapshot.items);
    const hasDurationSyntax =
      /[+\-−]?\d+(?:\.\d+)?\s*(?:m|mins?|minutes?|hours?|hrs?|hr|h|seconds?|secs?|sec|मिनट|मिनिट|घंटा|घंटे|सेकंड)\b/iu.test(
        normalized,
      ) || /\bfor\b[^\p{L}\p{N}]{0,8}[+\-−]\s*\d/iu.test(normalized);
    const durationMinutes = hasDurationSyntax
      ? minutesValue(normalized)
      : undefined;
    if (Number.isNaN(durationMinutes))
      return errorMessage(
        "Focus sessions require whole-minute durations from 1 to 180; unsupported units are not converted.",
      );
    if (
      durationMinutes !== undefined &&
      !validBoundedMinutes(
        durationMinutes,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.min,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.max,
      )
    )
      return errorMessage(
        "Focus sessions support whole-minute durations from 1 to 180 minutes.",
      );
    const targetText = /\b(?:for|on)\s+(.+)$/i.exec(text)?.[1];
    const durationOnly = Boolean(
      targetText &&
      /^\d{1,3}\s*(?:min|mins|minute|minutes)$/i.test(targetText.trim()),
    );
    if (targetText && !durationOnly && !taskId) {
      const found = findNamedPendingTask(snapshot.items, targetText);
      if (found.matches.length > 1)
        return errorMessage(
          `I found more than one pending task matching “${targetText}”. Start focus without a task name, or add more title words.`,
        );
      if (!found.matches.length)
        return errorMessage(
          `I could not find a pending task named “${targetText.trim()}”.`,
        );
    }
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["start-focus"](snapshot, {
        ...(taskId ? { taskId } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      }),
    };
  }

  if (
    hasExplicitWriteIntent(normalized) &&
    isFocusDurationRequest(normalized)
  ) {
    const minutes = minutesValue(normalized);
    if (minutes === undefined)
      return errorMessage(
        "Tell me the focus duration in whole minutes, from 1 to 180.",
      );
    if (
      !validBoundedMinutes(
        minutes,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.min,
        ASSISTANT_SUPPORTED_VALUES.focusDurationMinutes.max,
      )
    )
      return errorMessage(
        "Focus durations support whole minutes from 1 to 180.",
      );
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-focus-duration"](snapshot, {
        minutes,
      }),
    };
  }

  if (
    !taskRecordRequest &&
    hasExplicitWriteIntent(normalized) &&
    isThemeRequest(normalized)
  ) {
    const match = normalized.match(
      /\b(dark|light|system)\b|अंधेरा|रोशनी|उजला|डार्क|लाइट|सिस्टम/i,
    );
    const value = match?.[1] || match?.[0];
    const theme =
      value === "अंधेरा" || value === "डार्क"
        ? "dark"
        : value === "रोशनी" || value === "उजला" || value === "लाइट"
          ? "light"
          : value === "सिस्टम"
            ? "system"
            : value;
    if (!theme || !includesString(ASSISTANT_SUPPORTED_VALUES.themes, theme))
      return errorMessage("Theme supports only dark, light, or system.");
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["change-theme"](snapshot, { theme }),
    };
  }

  if (isPlanRequest(normalized))
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["today-plan"](snapshot, {}),
    };

  if (isProgressRequest(normalized))
    return {
      kind: "action",
      action: ASSISTANT_ACTION_REGISTRY["progress-summary"](snapshot, {}),
    };

  return unsupported();
}
