import type { Item } from "./types";
export const uid = () => crypto.randomUUID();
export function today(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, days: number) {
  const d = new Date(`${day.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return today(d);
}
export function formatDate(value?: string, long?: boolean) {
  if (!value) return "No date";
  const d = new Date(value.length === 10 ? value + "T12:00:00" : value);
  const full =
    long ??
    (typeof document !== "undefined" &&
      document.documentElement.dataset.dateFormat === "long");
  return Number.isNaN(+d)
    ? "Invalid date"
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: full ? "long" : "short",
      });
}
export const percent = (n: number, total: number) =>
  total ? Math.round((n / total) * 100) : 0;
export const isDone = (item: Item) =>
  ["done", "completed", "mastered", "solved", "revised", "submitted"].includes(
    item.status || "",
  );
export const cx = (...values: (string | false | undefined | null)[]) =>
  values.filter(Boolean).join(" ");
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(items: Item[], fields: (keyof Item)[]) {
  const escape = (v: unknown) => {
    let s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    fields.map(escape).join(","),
    ...items.map((i) => fields.map((f) => escape(i[f])).join(",")),
  ].join("\r\n");
}
export const safeUrl = (value?: string) => {
  try {
    const u = new URL(value || "");
    return ["http:", "https:"].includes(u.protocol) ? u.href : null;
  } catch {
    return null;
  }
};
export function nextRecurrence(date: string, recurrence: string) {
  if (recurrence === "daily") return addDays(date, 1);
  if (recurrence === "weekly") return addDays(date, 7);
  const d = new Date(date + "T12:00:00");
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(
    Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()),
  );
  return today(d);
}
export const routeFor = (item: Item) => {
  if (
    item.sourceType === "schedule-installation" ||
    item.scheduleId?.startsWith("study-schedule-")
  )
    return "schedule";
  if (
    item.sourceType?.startsWith("strategy-") ||
    item.course === "roadmap-readiness"
  )
    return "strategy";
  if (
    item.kind === "topic" &&
    (item.course === "java-dsa" || item.course === "sigma-8")
  )
    return "roadmap";
  return {
    task: "planner",
    event: "planner",
    topic:
      item.domain === "college"
        ? "college"
        : item.domain === "java"
          ? "java"
          : item.domain === "web"
            ? "web"
            : item.domain === "cp"
              ? "competitive"
              : "dsa",
    snippet: item.domain === "java" ? "java" : "web",
    problem: "dsa",
    contest: "competitive",
    project: "projects",
    note: "notes",
    session: "focus",
    card: "cards",
    subject: "college",
    assignment: "college",
    exam: "college",
    attendance: "college",
    grade: "college",
    goal:
      item.domain === "cp"
        ? "competitive"
        : item.domain === "focus"
          ? "focus"
          : "dashboard",
    review: item.domain === "cards" ? "cards" : "planner",
    practice: item.domain === "java" ? "java" : "competitive",
    milestone: "projects",
  }[item.kind];
};
export function navigate(page: string, id?: string) {
  window.location.hash = id ? `${page}/${id}` : page;
}
