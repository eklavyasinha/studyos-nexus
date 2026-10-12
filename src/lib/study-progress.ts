import type { Item } from "./types";
import { addDays, isDone, today } from "./utils";

export const activeRecord = (item: Item) =>
  !item.archived &&
  item.status !== "cancelled" &&
  item.sourceType !== "schedule-installation";
export const plannedDay = (item: Item) => item.dueDate || item.date;

/** Focus logs win for linked tasks; otherwise manual effort is attributed to the completion/planned day. */
export function actualMinutesBetween(items: Item[], from: string, to = from) {
  const sessions = items.filter(
    (item) => item.kind === "session" && activeRecord(item),
  );
  const linkedTasks = new Set(
    sessions.filter((item) => item.taskId).map((item) => item.taskId),
  );
  const logs = sessions.reduce(
    (sum, item) =>
      item.date && item.date >= from && item.date <= to
        ? sum + (item.actualMinutes || 0)
        : sum,
    0,
  );
  const manual = items
    .filter(
      (item) =>
        item.kind === "task" && activeRecord(item) && !linkedTasks.has(item.id),
    )
    .reduce((sum, item) => {
      const day = item.completedAt
        ? today(new Date(item.completedAt))
        : plannedDay(item);
      return day && day >= from && day <= to
        ? sum + (item.actualMinutes || 0)
        : sum;
    }, 0);
  return logs + manual;
}

export function progressBetween(items: Item[], from: string, to = from) {
  const tasks = items.filter(
    (item) =>
      item.kind === "task" &&
      activeRecord(item) &&
      plannedDay(item) &&
      plannedDay(item)! >= from &&
      plannedDay(item)! <= to,
  );
  return {
    tasks,
    complete: tasks.filter(isDone).length,
    total: tasks.length,
    planned: tasks.reduce((sum, item) => sum + (item.duration || 0), 0),
    actual: actualMinutesBetween(items, from, to),
  };
}

export function dashboardProgress(items: Item[], day: string, firstDay = 1) {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  const weekStart = addDays(day, -((weekday - firstDay + 7) % 7));
  const monthStart = `${day.slice(0, 7)}-01`;
  const date = new Date(`${monthStart}T12:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  const daily = progressBetween(items, day);
  const sorted = (records: Item[]) =>
    records.sort((a, b) =>
      `${plannedDay(a) || "9999"} ${a.startTime || "99:99"}`.localeCompare(
        `${plannedDay(b) || "9999"} ${b.startTime || "99:99"}`,
      ),
    );
  return {
    ...daily,
    remaining: daily.tasks.filter((item) => !isDone(item)),
    overdue: sorted(
      items.filter(
        (item) =>
          item.kind === "task" &&
          activeRecord(item) &&
          !item.sessionType?.startsWith("optional") &&
          !isDone(item) &&
          !!plannedDay(item) &&
          plannedDay(item)! < day,
      ),
    ),
    rescheduled: sorted(
      items.filter(
        (item) =>
          item.kind === "task" &&
          activeRecord(item) &&
          !!item.originalDate &&
          !!plannedDay(item) &&
          item.originalDate !== plannedDay(item),
      ),
    ),
    assignments: sorted(
      items.filter(
        (item) =>
          item.kind === "assignment" &&
          activeRecord(item) &&
          !isDone(item) &&
          !!plannedDay(item),
      ),
    ),
    weekly: progressBetween(items, weekStart, addDays(weekStart, 6)),
    monthly: progressBetween(items, monthStart, today(date)),
  };
}
