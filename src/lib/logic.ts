import {
  DEFAULT_SETTINGS,
  DEFAULT_TIMER,
  KINDS,
  type Item,
  type Settings,
  type Snapshot,
  type TimerState,
} from "./types";
import { addDays, isDone, nextRecurrence, today, uid } from "./utils";

export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    items: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    timer: { ...DEFAULT_TIMER },
    savedAt: new Date().toISOString(),
  };
}
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const strings = new Set(
  "id kind title createdAt updatedAt status body description category subjectId projectId noteId topicId cardId taskId problemId dueDate date startDate targetDate startTime endTime priority recurrence seriesId scheduleId completedAt url repository localPath technologies goals difficulty platform solveMethod language approach complexity mistakes nextRevision code reflection checklist domain notebook collection question answer cardType mode period html css javascript examples explanation completionCriteria course moduleKey stage sourceType sourceUrl sourceDate readinessGate requiresGate roadmapPhase milestone evidence sessionType originalDate rescheduledAt".split(
    " ",
  ),
);
const numbers = new Set(
  "duration actualMinutes postponed attempts rank penalty attempted solved order interval ease reviews attended total marks maxMarks credits interruptions target value courseOrder estimatedHours scheduleWeek rescheduleCount".split(
    " ",
  ),
);
const booleans = new Set(["pinned", "favorite", "archived", "official"]);
const arrays = new Set(["prerequisites"]);
const dateFields = new Set([
  "dueDate",
  "date",
  "startDate",
  "targetDate",
  "nextRevision",
  "originalDate",
  "sourceDate",
]);
export function validDay(x: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(`${x}T12:00:00`);
  return !Number.isNaN(+d) && today(d) === x;
}
export function validateItem(input: unknown): Item {
  if (
    !record(input) ||
    typeof input.id !== "string" ||
    !input.id ||
    input.id.length > 200 ||
    !KINDS.includes(input.kind as Item["kind"]) ||
    typeof input.title !== "string" ||
    input.title.length > 2400
  )
    throw new Error("A record is missing a valid id, kind, or title.");
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (strings.has(key)) {
      if (typeof value !== "string" || value.length > 1000000)
        throw new Error(`Invalid text field: ${key}.`);
      if (dateFields.has(key) && value && !validDay(value))
        throw new Error(`Invalid date: ${key}.`);
      if (
        ["createdAt", "updatedAt", "completedAt", "rescheduledAt"].includes(
          key,
        ) &&
        value &&
        Number.isNaN(Date.parse(value))
      )
        throw new Error(`Invalid timestamp: ${key}.`);
      if (
        ["startTime", "endTime"].includes(key) &&
        value &&
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(value) &&
        !(
          input.kind === "session" &&
          /^\d{4}-\d{2}-\d{2}T/.test(value) &&
          !Number.isNaN(Date.parse(value))
        )
      )
        throw new Error(`Invalid time: ${key}.`);
      if (
        key === "solveMethod" &&
        value &&
        !["independent", "hints", "editorial", "unrecorded"].includes(value)
      )
        throw new Error("Invalid solution assistance.");
      if (["url", "repository", "sourceUrl"].includes(key) && value) {
        try {
          if (!["http:", "https:"].includes(new URL(value).protocol))
            throw new Error();
        } catch {
          throw new Error(`Only http and https links are allowed: ${key}.`);
        }
      }
      output[key] = value;
    } else if (numbers.has(key)) {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 1e10
      )
        throw new Error(`Invalid non-negative number: ${key}.`);
      if (
        [
          "attempts",
          "rank",
          "attempted",
          "solved",
          "order",
          "reviews",
          "attended",
          "total",
          "interruptions",
          "postponed",
          "courseOrder",
          "scheduleWeek",
          "rescheduleCount",
        ].includes(key) &&
        !Number.isInteger(value)
      )
        throw new Error(`Use a whole number for ${key}.`);
      output[key] = value;
    } else if (booleans.has(key)) {
      if (typeof value !== "boolean") throw new Error(`Invalid ${key} flag.`);
      output[key] = value;
    } else if (arrays.has(key)) {
      if (
        !Array.isArray(value) ||
        value.length > 50 ||
        value.some((v) => typeof v !== "string" || v.length > 300)
      )
        throw new Error(`Invalid ${key}.`);
      output[key] = value;
    } else if (key === "tags") {
      if (
        !Array.isArray(value) ||
        value.length > 200 ||
        value.some((t) => typeof t !== "string" || t.length > 200)
      )
        throw new Error("Invalid tags.");
      output[key] = value;
    } else if (key === "reviewHistory") {
      if (
        !Array.isArray(value) ||
        value.length > 100000 ||
        value.some(
          (r) =>
            !record(r) ||
            typeof r.date !== "string" ||
            Number.isNaN(Date.parse(r.date)) ||
            !["again", "hard", "good", "easy"].includes(r.rating as string) ||
            typeof r.interval !== "number" ||
            r.interval < 0 ||
            !Number.isFinite(r.interval),
        )
      )
        throw new Error("Invalid review history.");
      output[key] = value.map((r) => ({
        date: r.date,
        rating: r.rating,
        interval: r.interval,
      }));
    } else
      throw new Error(
        `Unknown record field: ${key}. This backup may require a newer app.`,
      );
  }
  if (!output.createdAt || !output.updatedAt)
    throw new Error("Record timestamps are required.");
  if (
    typeof output.attended === "number" &&
    typeof output.total === "number" &&
    output.attended > output.total
  )
    throw new Error("Attended classes cannot exceed total classes.");
  if (
    typeof output.marks === "number" &&
    typeof output.maxMarks === "number" &&
    output.marks > output.maxMarks
  )
    throw new Error("Marks cannot exceed maximum marks.");
  if (
    typeof output.solved === "number" &&
    typeof output.attempted === "number" &&
    output.solved > output.attempted
  )
    throw new Error("Solved problems cannot exceed attempted problems.");
  return output as Item;
}

function validateSettings(input: unknown): Settings {
  if (!record(input)) throw new Error("Settings must be an object.");
  const out = structuredClone(DEFAULT_SETTINGS);
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (!(key in DEFAULT_SETTINGS) && key !== "problemOfDay")
      throw new Error(`Unknown preference: ${key}.`);
    if (["name", "problemOfDay"].includes(key)) {
      if (typeof value !== "string" || value.length > 500)
        throw new Error(`Invalid ${key}.`);
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (
      ["theme", "accent", "density", "dateFormat", "timeFormat"].includes(key)
    ) {
      const opts: Record<string, string[]> = {
        theme: ["dark", "light", "system"],
        accent: ["lime", "blue", "violet"],
        density: ["compact", "comfortable"],
        dateFormat: ["short", "long"],
        timeFormat: ["12", "24"],
      };
      if (!opts[key].includes(value as string))
        throw new Error(`Invalid ${key}.`);
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (
      [
        "weekStart",
        "focusMinutes",
        "shortBreak",
        "longBreak",
        "dailyGoal",
      ].includes(key)
    ) {
      const max = key === "weekStart" ? 6 : key === "dailyGoal" ? 1440 : 180;
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < (key === "weekStart" ? 0 : 1) ||
        value > max
      )
        throw new Error(`Invalid ${key}.`);
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (
      [
        "reducedMotion",
        "sound",
        "welcomed",
        "sidebarCollapsed",
        "demo",
      ].includes(key)
    ) {
      if (typeof value !== "boolean") throw new Error(`Invalid ${key}.`);
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (["categories", "priorities", "recent"].includes(key)) {
      if (
        !Array.isArray(value) ||
        value.length > 200 ||
        value.some((v) => typeof v !== "string" || v.length > 200)
      )
        throw new Error(`Invalid ${key} list.`);
      (out as unknown as Record<string, unknown>)[key] = value;
    } else if (key === "widgets") {
      if (
        !Array.isArray(value) ||
        value.length > 6 ||
        new Set(value.map((w) => (record(w) ? w.id : undefined))).size !==
          value.length ||
        value.some(
          (w) =>
            !record(w) ||
            ![
              "agenda",
              "tracks",
              "focus",
              "goals",
              "activity",
              "review",
            ].includes(w.id as string) ||
            typeof w.visible !== "boolean" ||
            !["normal", "wide"].includes(w.size as string),
        )
      )
        throw new Error("Invalid dashboard configuration.");
      out.widgets = value as Settings["widgets"];
    }
  }
  return out;
}
function validateTimer(input: unknown): TimerState {
  if (!record(input)) throw new Error("Timer must be an object.");
  const t = { ...DEFAULT_TIMER, ...input };
  if (
    Object.keys(input).some((k) => !(k in DEFAULT_TIMER)) ||
    !["focus", "short", "long"].includes(t.mode) ||
    typeof t.running !== "boolean" ||
    typeof t.linkedId !== "string" ||
    ![t.duration, t.remaining, t.elapsed, t.interruptions, t.cycles].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    ) ||
    t.duration < 1 ||
    t.duration > 10800 ||
    t.remaining > t.duration ||
    t.elapsed > t.duration ||
    (t.endAt !== null &&
      (typeof t.endAt !== "number" || !Number.isFinite(t.endAt))) ||
    (t.startedAt !== null &&
      (typeof t.startedAt !== "string" ||
        Number.isNaN(Date.parse(t.startedAt)))) ||
    (t.running && (!t.startedAt || t.endAt === null))
  )
    throw new Error("Invalid timer state.");
  return t;
}
export function validateSnapshot(input: unknown): Snapshot {
  if (!record(input) || input.version !== 1)
    throw new Error(
      "Unsupported backup version. StudyOS Nexus currently supports version 1.",
    );
  if (
    typeof input.savedAt !== "string" ||
    !Number.isFinite(Date.parse(input.savedAt))
  )
    throw new Error("Backup has an invalid saved-at timestamp.");
  if (!Array.isArray(input.items) || input.items.length > 50000)
    throw new Error("Backup must contain a records array (maximum 50,000).");
  const items = input.items.map(validateItem);
  if (new Set(items.map((i) => i.id)).size !== items.length)
    throw new Error("Backup contains duplicate record IDs.");
  return {
    version: 1,
    items,
    settings: validateSettings(input.settings),
    timer: validateTimer(input.timer),
    savedAt:
      typeof input.savedAt === "string"
        ? input.savedAt
        : new Date().toISOString(),
  };
}
export function parseBackup(text: string): Snapshot {
  if (text.length > 30 * 1024 * 1024)
    throw new Error("Backup exceeds the 30 MB import limit.");
  const input = JSON.parse(text, (key, value) => {
    if (["__proto__", "prototype", "constructor"].includes(key))
      throw new Error("Unsafe property in backup.");
    return value;
  });
  if (!record(input) || input.app !== "studyos-nexus")
    throw new Error("Choose a StudyOS Nexus JSON backup.");
  return validateSnapshot(input.data);
}
export function pauseTimerAt(timer: TimerState, at: number): TimerState {
  if (!timer.running || timer.endAt === null)
    return { ...timer, running: false, endAt: null };
  const remaining = Math.max(
    0,
    Math.min(timer.remaining, (timer.endAt - at) / 1000),
  );
  return {
    ...timer,
    remaining,
    elapsed: Math.min(
      timer.duration,
      timer.elapsed + timer.remaining - remaining,
    ),
    running: false,
    endAt: null,
  };
}
export const serializeBackup = (snapshot: Snapshot) =>
  JSON.stringify(
    {
      app: "studyos-nexus",
      exportedAt: new Date().toISOString(),
      data: {
        ...snapshot,
        savedAt: new Date().toISOString(),
        timer: pauseTimerAt(snapshot.timer, Date.now()),
      },
    },
    null,
    2,
  );
export function mergeSnapshots(
  current: Snapshot,
  incoming: Snapshot,
): Snapshot {
  const map = new Map(current.items.map((i) => [i.id, i]));
  for (const i of incoming.items) {
    const old = map.get(i.id);
    if (!old || Date.parse(i.updatedAt) > Date.parse(old.updatedAt))
      map.set(i.id, i);
  }
  return {
    ...current,
    items: [...map.values()],
    savedAt: new Date().toISOString(),
  };
}
export function removeRecord(items: Item[], id: string): Item[] {
  return items
    .filter((i) => i.id !== id)
    .map((item) => {
      const copy = { ...item };
      for (const key of [
        "subjectId",
        "projectId",
        "noteId",
        "topicId",
        "cardId",
        "taskId",
        "problemId",
      ] as const)
        if (copy[key] === id) delete copy[key];
      if (copy.kind === "practice" && copy.collection === id)
        delete copy.collection;
      return copy;
    });
}
export function toggleTask(
  items: Item[],
  id: string,
  now = new Date(),
): Item[] {
  const task = items.find((i) => i.id === id);
  if (!task) return items;
  const wasDone = isDone(task);
  const next = items.map((i) =>
    i.id === id
      ? {
          ...i,
          status: wasDone ? "todo" : "done",
          completedAt: wasDone ? undefined : now.toISOString(),
          updatedAt: now.toISOString(),
        }
      : i,
  );
  if (
    !wasDone &&
    task.dueDate &&
    ["daily", "weekly", "monthly"].includes(task.recurrence || "")
  ) {
    const dueDate = nextRecurrence(task.dueDate, task.recurrence!);
    const seriesId = task.seriesId || task.id;
    if (
      !items.some(
        (i) =>
          i.kind === "task" &&
          (i.seriesId || i.id) === seriesId &&
          i.dueDate === dueDate,
      )
    ) {
      next.push({
        ...task,
        id: uid(),
        seriesId,
        status: "todo",
        dueDate,
        completedAt: undefined,
        actualMinutes: 0,
        postponed: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }
  return next;
}
export function activityDate(item: Item) {
  if (item.kind === "task")
    return today(new Date(item.completedAt || item.updatedAt));
  return item.date || today(new Date(item.completedAt || item.updatedAt));
}
export function streak(items: Item[], day = today()) {
  const days = new Set(
    items
      .filter(
        (i) =>
          (i.kind === "session" && (i.actualMinutes || 0) > 0) ||
          (i.kind === "task" && isDone(i)) ||
          i.kind === "review",
      )
      .map(activityDate),
  );
  let count = 0;
  let cursor = days.has(day) ? day : addDays(day, -1);
  while (days.has(cursor) && count < 36600) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
export function dailySeries(items: Item[], start: string, length: number) {
  return Array.from({ length }, (_, n) => {
    const date = addDays(start, n),
      inDay = items.filter((i) => activityDate(i) === date);
    return {
      date,
      minutes: inDay
        .filter((i) => i.kind === "session")
        .reduce((s, i) => s + (i.actualMinutes || 0), 0),
      tasks: inDay.filter((i) => i.kind === "task" && isDone(i)).length,
      problems: inDay.filter(
        (i) =>
          i.kind === "problem" &&
          ["solved", "revised"].includes(i.status || ""),
      ).length,
    };
  });
}
export function updateRecord(
  items: Item[],
  id: string,
  patch: Partial<Item>,
  now = new Date(),
): Item[] {
  const old = items.find((i) => i.id === id);
  if (!old) return items;
  const updated = {
    ...old,
    ...patch,
    id: old.id,
    kind: old.kind,
    createdAt: old.createdAt,
    updatedAt: now.toISOString(),
  };
  if (
    old.kind === "task" &&
    old.dueDate &&
    updated.dueDate &&
    updated.dueDate !== old.dueDate
  ) {
    updated.originalDate = old.originalDate || old.dueDate;
    updated.rescheduledAt = patch.rescheduledAt || now.toISOString();
    updated.rescheduleCount = (old.rescheduleCount || 0) + 1;
    if (old.scheduleId) updated.date = updated.dueDate;
    if (!patch.rescheduledAt) {
      const entry = `${now.toISOString()} · ${old.dueDate} ${old.startTime || ""} → ${updated.dueDate} ${updated.startTime || ""}`;
      updated.body =
        `${updated.body || ""}${updated.body?.includes("Reschedule history:") ? "\n" : "\n\nReschedule history:\n"}${entry}`.trim();
    }
  }
  const changedCompletion =
    patch.status !== undefined && isDone(updated) !== isDone(old);
  if (changedCompletion)
    updated.completedAt = isDone(updated) ? now.toISOString() : undefined;
  const next = items.map((i) => (i.id === id ? updated : i));
  if (old.kind === "task" && changedCompletion) {
    return toggleTask(
      next.map((i) => (i.id === id ? { ...i, status: old.status } : i)),
      id,
      now,
    );
  }
  return next;
}
