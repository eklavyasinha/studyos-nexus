import type { FieldDef } from "../components/ui";
import type { Item, Settings } from "../lib/types";
import { addDays, isDone, today } from "../lib/utils";

export const taskStatuses = ["todo", "in-progress", "done"];
export const projectStatuses = [
  "planned",
  "in-progress",
  "paused",
  "completed",
];
export const statusOptions = (values: string[]) =>
  values.map((value) => ({
    value,
    label: value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase()),
  }));
export const recordOptions = (items: Item[], kind: Item["kind"]) =>
  items
    .filter((item) => item.kind === kind && !item.archived)
    .map((item) => ({ value: item.id, label: item.title }));

export function taskFields(items: Item[], settings: Settings): FieldDef[] {
  return [
    { key: "description", label: "Description", type: "textarea", full: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions(taskStatuses),
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: statusOptions(settings.priorities),
    },
    { key: "dueDate", label: "Scheduled / due date", type: "date" },
    {
      key: "recurrence",
      label: "Repeat after completion",
      type: "select",
      options: statusOptions(["none", "daily", "weekly", "monthly"]),
    },
    { key: "startTime", label: "Block starts", type: "time" },
    { key: "endTime", label: "Block ends", type: "time" },
    {
      key: "duration",
      label: "Estimated minutes",
      type: "number",
      min: 0,
      max: 1440,
    },
    { key: "actualMinutes", label: "Actual minutes", type: "number", min: 0 },
    {
      key: "subjectId",
      label: "Subject",
      type: "select",
      options: recordOptions(items, "subject"),
    },
    {
      key: "projectId",
      label: "Project",
      type: "select",
      options: recordOptions(items, "project"),
    },
    {
      key: "noteId",
      label: "Reference note",
      type: "select",
      options: recordOptions(items, "note"),
    },
    {
      key: "cardId",
      label: "Revision card",
      type: "select",
      options: recordOptions(items, "card"),
    },
    {
      key: "topicId",
      label: "Learning topic",
      type: "select",
      options: recordOptions(items, "topic"),
    },
    {
      key: "category",
      label: "Category",
      type: "select",
      options: statusOptions(settings.categories),
    },
    { key: "tags", label: "Tags", type: "tags" },
    { key: "url", label: "Reference URL", type: "url", full: true },
  ];
}

export function eventFields(items: Item[]): FieldDef[] {
  return [
    {
      key: "description",
      label: "Description / location",
      type: "textarea",
      full: true,
    },
    { key: "date", label: "First occurrence", type: "date", required: true },
    {
      key: "recurrence",
      label: "Repeat schedule",
      type: "select",
      options: statusOptions(["none", "daily", "weekly", "monthly"]),
    },
    { key: "startTime", label: "Start time", type: "time" },
    { key: "endTime", label: "End time", type: "time" },
    {
      key: "duration",
      label: "Estimated minutes",
      type: "number",
      min: 0,
      max: 1440,
    },
    {
      key: "actualMinutes",
      label: "Actual minutes (whole record)",
      type: "number",
      min: 0,
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: statusOptions(["scheduled", "completed", "cancelled"]),
    },
    {
      key: "category",
      label: "Event type",
      type: "select",
      options: statusOptions([
        "event",
        "time-block",
        "class",
        "meeting",
        "deadline",
      ]),
    },
    {
      key: "subjectId",
      label: "Subject",
      type: "select",
      options: recordOptions(items, "subject"),
    },
    {
      key: "projectId",
      label: "Project",
      type: "select",
      options: recordOptions(items, "project"),
    },
    {
      key: "noteId",
      label: "Reference note",
      type: "select",
      options: recordOptions(items, "note"),
    },
    { key: "url", label: "Meeting / reference URL", type: "url", full: true },
    { key: "tags", label: "Tags", type: "tags" },
  ];
}

export const reviewFields: FieldDef[] = [
  { key: "date", label: "Review period starts", type: "date", required: true },
  {
    key: "period",
    label: "Review period",
    type: "select",
    options: statusOptions(["daily", "weekly"]),
    required: true,
  },
  { key: "body", label: "What went well?", type: "textarea", full: true },
  {
    key: "reflection",
    label: "What got in the way? What did you learn?",
    type: "textarea",
    full: true,
  },
  {
    key: "goals",
    label: "What will you focus on next?",
    type: "textarea",
    full: true,
  },
];

export function weekStart(day: string, firstDay = 1) {
  return addDays(
    day,
    -((new Date(`${day}T12:00:00`).getDay() - firstDay + 7) % 7),
  );
}

export function shiftMonth(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  const number = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(number, lastDay));
  return today(date);
}

export function calendarDays(day: string, firstDay = 1) {
  const start = weekStart(`${day.slice(0, 7)}-01`, firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export const scheduledDate = (item: Item) =>
  ["event", "exam", "contest"].includes(item.kind) ? item.date : item.dueDate;
export const minuteOfDay = (time?: string) => {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
};
export const minutesLabel = (minutes: number) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;
export function timeLabel(
  time: string | undefined,
  format: Settings["timeFormat"],
) {
  if (!time) return "Any time";
  if (format === "24") return time;
  const minute = minuteOfDay(time);
  if (minute === null) return time;
  const hour = Math.floor(minute / 60);
  return `${hour % 12 || 12}:${String(minute % 60).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

// Calendar arithmetic compares local calendar dates, so daylight-saving changes
// never cause a weekly event to drift to a different weekday.
function dayNumber(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}

export function eventOccursOn(item: Item, day: string) {
  const first = item.date;
  if (!first || day < first) return false;
  if (day === first) return true;
  if (isDone(item) || item.status === "cancelled") return false;
  if (item.recurrence === "daily") return true;
  if (item.recurrence === "weekly")
    return (dayNumber(day) - dayNumber(first)) % 7 === 0;
  if (item.recurrence === "monthly") {
    const date = new Date(`${day}T12:00:00`);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() === Math.min(Number(first.slice(8, 10)), last);
  }
  return false;
}

export type Occurrence = {
  record: Item;
  day: string;
  key: string;
  repeated: boolean;
};
export function occurrencesFor(items: Item[], days: string[]): Occurrence[] {
  return items
    .flatMap((record) => {
      if (record.kind === "event")
        return days
          .filter((day) => eventOccursOn(record, day))
          .map((day) => ({
            record,
            day,
            key: `${record.id}:${day}`,
            repeated: day !== record.date,
          }));
      const day = scheduledDate(record);
      return day && days.includes(day)
        ? [{ record, day, key: `${record.id}:${day}`, repeated: false }]
        : [];
    })
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (a.record.startTime || "99:99").localeCompare(
          b.record.startTime || "99:99",
        ) ||
        a.record.title.localeCompare(b.record.title),
    );
}

export function blockRange(item: Item): [number, number] | null {
  const start = minuteOfDay(item.startTime);
  if (start === null) return null;
  const explicitEnd = minuteOfDay(item.endTime);
  const end =
    explicitEnd ??
    (item.duration ? Math.min(start + item.duration, 1440) : start);
  return end > start ? [start, end] : null;
}

export function findConflicts(occurrences: Occurrence[]) {
  const conflicts: { first: Occurrence; second: Occurrence }[] = [];
  const active = occurrences.filter(
    ({ record }) =>
      !isDone(record) && record.status !== "cancelled" && blockRange(record),
  );
  for (let a = 0; a < active.length; a++) {
    for (let b = a + 1; b < active.length; b++) {
      if (active[a].day !== active[b].day) continue;
      const first = blockRange(active[a].record)!;
      const second = blockRange(active[b].record)!;
      if (first[0] < second[1] && second[0] < first[1])
        conflicts.push({ first: active[a], second: active[b] });
    }
  }
  return conflicts;
}

export function linkedRoute(item: Item) {
  if (item.kind === "project" || item.kind === "milestone") return "projects";
  if (
    ["subject", "assignment", "exam", "attendance", "grade"].includes(
      item.kind,
    ) ||
    item.domain === "college"
  )
    return "college";
  if (item.kind === "note") return "notes";
  if (item.kind === "topic")
    return item.domain === "java"
      ? "java"
      : item.domain === "web"
        ? "web"
        : item.domain === "cp"
          ? "competitive"
          : "dsa";
  return "planner";
}

export function attendanceSummary(items: Item[]) {
  const attended = items.reduce((sum, item) => sum + (item.attended || 0), 0);
  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
  return {
    attended,
    total,
    percentage: total ? Math.round((attended / total) * 1000) / 10 : null,
  };
}

export function marksSummary(items: Item[]) {
  const marks = items.reduce((sum, item) => sum + (item.marks || 0), 0);
  const maximum = items.reduce((sum, item) => sum + (item.maxMarks || 0), 0);
  return {
    marks,
    maximum,
    percentage: maximum ? Math.round((marks / maximum) * 1000) / 10 : null,
  };
}

export function classesNeeded(attended: number, total: number, target: number) {
  if (!total || target <= 0 || attended / total >= target / 100) return 0;
  if (target >= 100) return Infinity;
  return Math.max(
    0,
    Math.ceil((target * total - 100 * attended) / (100 - target)),
  );
}
