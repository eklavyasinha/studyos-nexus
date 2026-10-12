import type { Item } from "../lib/types";
import { today } from "../lib/utils";
import {
  missingModulePrerequisites,
  moduleForKey,
  modulePrerequisiteKey,
} from "../lib/readiness";
import { PERSONAL_ROADMAP } from "./personal-roadmap-data";
import {
  END_DATE,
  INSTALLATION_ID,
  SCHEDULE_VERSION,
  START_DATE,
  isScheduleItem,
  scheduleDate,
} from "./study-schedule-data";

export function validScheduleDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(+date) && today(date) === value;
}

export function timeValue(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const overlap = (
  a: { start: number; end: number },
  b: { start: number; end: number },
) => a.start < b.end && b.start < a.end;

export function studyRangesFor(date: string) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return [
    {
      start: weekday === 0 || weekday === 6 ? 16 * 60 + 45 : 17 * 60 + 30,
      end: weekday === 0 || weekday === 6 ? 20 * 60 : 19 * 60 + 30,
    },
    // A short, bounded gate/recovery slot before dinner. It is never used to
    // extend the regular core blocks or to double a missed session.
    { start: 19 * 60 + 35, end: 19 * 60 + 55 },
    { start: 21 * 60, end: 22 * 60 + 45 },
  ];
}

function occupiedOn(items: Item[], date: string, exceptId?: string) {
  return items.flatMap((item) => {
    if (
      (exceptId && (item.id === exceptId || item.taskId === exceptId)) ||
      item.archived ||
      item.status === "cancelled" ||
      scheduleDate(item) !== date
    )
      return [];
    if (
      ![
        "task",
        "event",
        "exam",
        "assignment",
        "contest",
        "practice",
        "session",
      ].includes(item.kind)
    )
      return [];
    const start = timeValue(item.startTime);
    const end =
      timeValue(item.endTime) ??
      (start !== null && item.duration ? start + item.duration : null);
    return start !== null && end !== null && end > start
      ? [{ start, end, item }]
      : [];
  });
}

export function scheduleTimingError(
  date: string,
  startTime: string,
  endTime: string,
  duration: number,
  items: Item[] = [],
  exceptId?: string,
) {
  if (!validScheduleDay(date) || date < START_DATE || date > "2099-12-31")
    return `Use a real schedule date from ${START_DATE} through 31 December 2099.`;
  const start = timeValue(startTime);
  const end = timeValue(endTime);
  if (start === null || end === null)
    return "Supply valid start and end times for this study task.";
  if (end <= start) return "End time must be after start time on the same day.";
  if (!Number.isInteger(duration) || duration <= 0 || duration !== end - start)
    return "Planned minutes must equal the elapsed start/end time.";
  if (
    !studyRangesFor(date).some(
      (range) => start >= range.start && end <= range.end,
    )
  )
    return "Use weekday 17:30–19:30, the bounded 19:35–19:55 gate/recovery slot, or 21:00–22:45; weekends also allow 16:45–20:00. College, meals and sleep stay protected every day.";
  const conflict = occupiedOn(items, date, exceptId).find((block) =>
    overlap({ start, end }, block),
  );
  if (conflict)
    return `This block overlaps “${conflict.item.title}”. Choose another time or explicitly reschedule that record first.`;
  return "";
}

export function freeStudySlots(items: Item[], date: string, duration: number) {
  if (
    !validScheduleDay(date) ||
    date < START_DATE ||
    date > "2099-12-31" ||
    !Number.isInteger(duration) ||
    duration <= 0
  )
    return [];
  const occupied = occupiedOn(items, date);
  const slots: { startTime: string; endTime: string }[] = [];
  // Leave the dinner transition and daily-review boundary clear even on dates
  // beyond the initial scaffold. The user chooses a real, bounded free slot.
  const ranges = studyRangesFor(date).map((range) => ({
    ...range,
    end:
      range.start === 21 * 60
        ? 22 * 60 + 15
        : Math.min(range.end, 19 * 60 + 55),
  }));
  for (const range of ranges) {
    for (let start = range.start; start + duration <= range.end; start += 5) {
      const end = start + duration;
      if (!occupied.some((block) => overlap({ start, end }, block)))
        slots.push({ startTime: formatTime(start), endTime: formatTime(end) });
    }
  }
  return slots;
}

export const installationMarker = (items: Item[]) =>
  items.find(
    (item) =>
      item.scheduleId === INSTALLATION_ID ||
      item.sourceType === "schedule-installation-v2" ||
      (item.sourceType === "schedule-installation" &&
        item.tags?.includes("study-plan-v2")),
  );
export const hasScheduleInstallation = (items: Item[]) =>
  Boolean(installationMarker(items) || items.some(isScheduleItem));
export const installationValues = (legacy = false): Partial<Item> => ({
  title: `Study-plan installation · ${START_DATE} → ${END_DATE}`,
  scheduleId: INSTALLATION_ID,
  sourceType: "schedule-installation-v2",
  date: START_DATE,
  official: false,
  roadmapPhase: "schedule-installation-v2",
  body: legacy
    ? "An existing current-version study schedule was recognized. Only this installation marker was added; existing tasks, dates, status, notes and settings were retained. Deleted tasks are not regenerated."
    : "The dated 11 October 2026–31 March 2027 scaffold was installed explicitly once. This is installation metadata, not study progress. The earlier October 4 scaffold has a different identity and remains untouched. Deleted tasks are not regenerated.",
  tags: ["study-plan-metadata", "study-plan-v2", SCHEDULE_VERSION],
});

// The schedule uses the same readiness decisions as both roadmap surfaces.
// Only actual course topic records can satisfy a prerequisite.
export function moduleForScheduleKey(items: Item[], key?: string) {
  if (!key) return undefined;
  return moduleForKey(items, modulePrerequisiteKey(key, items));
}

export function missingSchedulePrerequisites(
  item: Partial<Item>,
  items: Item[],
) {
  return missingModulePrerequisites(item, items);
}

export const canonicalSchedulePrerequisite = modulePrerequisiteKey;

export function linkedScheduleModule(item: Partial<Item>, items: Item[]) {
  return (
    items.find(
      (entry) =>
        entry.id === item.topicId && entry.kind === "topic" && !entry.archived,
    ) || moduleForScheduleKey(items, item.moduleKey)
  );
}

export const moduleLabel = (key: string) =>
  PERSONAL_ROADMAP.find((entry) => entry.key === key || entry.title === key)
    ?.title || key;

export function lastIncompleteScheduleTopic(
  item: Partial<Item>,
  items: Item[],
) {
  const missing = missingSchedulePrerequisites(item, items);
  const candidates = missing.map((reference) => {
    const key = modulePrerequisiteKey(reference, items, item.course);
    return {
      key,
      module: moduleForScheduleKey(items, key),
      template: PERSONAL_ROADMAP.find((entry) => entry.key === key),
    };
  });
  return candidates.sort(
    (a, b) =>
      (b.module?.courseOrder || b.template?.courseOrder || 0) -
      (a.module?.courseOrder || a.template?.courseOrder || 0),
  )[0];
}
