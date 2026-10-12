import { describe, expect, it } from "vitest";
import {
  emptySnapshot,
  mergeSnapshots,
  parseBackup,
  serializeBackup,
  validateItem,
  validateSnapshot,
  toggleTask,
  removeRecord,
  streak,
  dailySeries,
  updateRecord,
  pauseTimerAt,
} from "../lib/logic";
import { addDays, csv, nextRecurrence, safeUrl, today } from "../lib/utils";
import { DEFAULT_SETTINGS, DEFAULT_TIMER, type Item } from "../lib/types";
import { scheduleCard } from "../pages/repetition";
import {
  remainingTimerSeconds,
  elapsedTimerSeconds,
  timerDisplay,
} from "../pages/focus-timer";
import {
  attendanceSummary,
  blockRange,
  calendarDays,
  classesNeeded,
  eventOccursOn,
  findConflicts,
  marksSummary,
  occurrencesFor,
  shiftMonth,
} from "../pages/planningHelpers";
import { problemMetrics, tokenizeCode } from "../pages/learning-helpers";

const item = (patch: Partial<Item> = {}): Item => ({
  id: "test-1",
  kind: "task",
  title: "A real task",
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-01T09:00:00Z",
  ...patch,
});
describe("versioned data ownership", () => {
  it("round trips every stored field without losing record associations", () => {
    const s = emptySnapshot();
    s.items = [
      item({
        projectId: "p",
        tags: ["java"],
        body: "<script>not HTML</script>",
      }),
    ];
    expect(parseBackup(serializeBackup(s)).items).toEqual(s.items);
  });
  it("accepts optional undefined values from IndexedDB structured clones", () =>
    expect(
      validateItem(item({ language: undefined })).language,
    ).toBeUndefined());
  it("rejects unrelated JSON", () =>
    expect(() => parseBackup('{"items":[]}')).toThrow("StudyOS"));
  it("rejects newer versions safely", () =>
    expect(() => validateSnapshot({ ...emptySnapshot(), version: 2 })).toThrow(
      "version",
    ));
  it("rejects duplicate IDs", () =>
    expect(() =>
      validateSnapshot({ ...emptySnapshot(), items: [item(), item()] }),
    ).toThrow("duplicate"));
  it.each([
    { duration: NaN },
    { actualMinutes: -1 },
    { url: "javascript:alert(1)" },
    { dueDate: "2026-02-31" },
    { marks: 80, maxMarks: 50 },
    { attended: 21, total: 20 },
    { solved: 4, attempted: 2 },
  ])("rejects invalid records: %j", (patch) =>
    expect(() => validateItem(item(patch))).toThrow(),
  );
  it("rejects unsafe object properties before constructing a snapshot", () =>
    expect(() => parseBackup('{"__proto__":{}}')).toThrow("Unsafe"));
  it("rejects unknown fields rather than silently dropping future data", () =>
    expect(() => validateItem({ ...item(), extra: "data" })).toThrow(
      "Unknown",
    ));
  it("rejects malformed timer and preferences", () => {
    expect(() =>
      validateSnapshot({
        ...emptySnapshot(),
        settings: { ...DEFAULT_SETTINGS, dailyGoal: 0 },
      }),
    ).toThrow();
    expect(() =>
      validateSnapshot({
        ...emptySnapshot(),
        timer: { ...DEFAULT_TIMER, running: true },
      }),
    ).toThrow();
  });
  it("rejects invalid snapshot timestamps and fractional class counts", () => {
    expect(() =>
      validateSnapshot({ ...emptySnapshot(), savedAt: "not-a-date" }),
    ).toThrow("timestamp");
    expect(() => validateItem(item({ attended: 2.5, total: 3 }))).toThrow(
      "whole number",
    );
  });
  it("merges newer matching IDs and preserves local preferences", () => {
    const a = emptySnapshot(),
      b = emptySnapshot();
    a.items = [item()];
    a.settings.name = "Local";
    b.items = [
      item({ title: "Newer", updatedAt: "2026-10-02T09:00:00Z" }),
      item({ id: "second" }),
    ];
    expect(mergeSnapshots(a, b).items).toHaveLength(2);
    expect(mergeSnapshots(a, b).items[0].title).toBe("Newer");
    expect(mergeSnapshots(a, b).settings.name).toBe("Local");
  });
  it("removes incoming associations, not unrelated notes and tasks", () => {
    const output = removeRecord(
      [
        item({ id: "p", kind: "project" }),
        item({ projectId: "p" }),
        item({ id: "note", kind: "note", projectId: "p" }),
      ],
      "p",
    );
    expect(output).toHaveLength(2);
    expect(output.every((i) => !i.projectId)).toBe(true);
  });
  it("neutralizes spreadsheet formulas and escapes quotes in CSV", () => {
    const output = csv(
      [item({ title: "=SUM(A1:A2)", body: 'A "quoted" line' })],
      ["title", "body"],
    );
    expect(output).toContain("'=SUM");
    expect(output).toContain('""quoted""');
  });
});
describe("calendar and recurring work", () => {
  it("uses local calendar arithmetic across boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(nextRecurrence("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(shiftMonth("2024-01-31", 1)).toBe("2024-02-29");
  });
  it("completes a recurring task and creates exactly one next task", () => {
    const original = item({
      recurrence: "weekly",
      dueDate: "2026-10-03",
      status: "todo",
    });
    const once = toggleTask([original], original.id);
    expect(once).toHaveLength(2);
    expect(once[1].dueDate).toBe("2026-10-10");
    const reopened = toggleTask(once, original.id);
    expect(toggleTask(reopened, original.id)).toHaveLength(2);
  });
  it("editing task status has the same recurrence behavior as checking it", () => {
    const next = updateRecord(
      [item({ status: "todo", recurrence: "daily", dueDate: "2026-10-03" })],
      "test-1",
      { status: "done" },
    );
    expect(next).toHaveLength(2);
    expect(next[0].completedAt).toBeTruthy();
    expect(next[1].dueDate).toBe("2026-10-04");
  });
  it("preserves completion timestamps when editing completed task notes", () => {
    const time = "2026-10-02T09:00:00Z";
    const result = updateRecord(
      [item({ status: "done", completedAt: time })],
      "test-1",
      { body: "an edit" },
    );
    expect(result[0].completedAt).toBe(time);
  });
  it("does not invent recurrence for one-off tasks", () =>
    expect(
      toggleTask(
        [item({ dueDate: "2026-10-03", recurrence: "none" })],
        "test-1",
      ),
    ).toHaveLength(1));
  it("keeps independent recurring tasks separate even when their titles match", () => {
    const originals = [
      item({ id: "morning", recurrence: "daily", dueDate: "2026-10-03" }),
      item({ id: "evening", recurrence: "daily", dueDate: "2026-10-03" }),
    ];
    const result = toggleTask(toggleTask(originals, "morning"), "evening");
    expect(result).toHaveLength(4);
    expect(new Set(result.slice(2).map((i) => i.seriesId)).size).toBe(2);
  });
  it("projects monthly events into short months without duplicating records", () => {
    const e = item({
      kind: "event",
      date: "2026-01-31",
      recurrence: "monthly",
    });
    expect(eventOccursOn(e, "2026-02-28")).toBe(true);
    expect(eventOccursOn(e, "2026-02-27")).toBe(false);
    expect(occurrencesFor([e], ["2026-01-31", "2026-02-28"])).toHaveLength(2);
  });
  it("detects overlap but not adjacent time blocks", () => {
    const a = item({
        id: "a",
        dueDate: "2026-10-03",
        startTime: "09:00",
        endTime: "10:00",
      }),
      b = item({
        id: "b",
        dueDate: "2026-10-03",
        startTime: "09:30",
        endTime: "10:30",
      }),
      c = item({
        id: "c",
        dueDate: "2026-10-03",
        startTime: "10:30",
        endTime: "11:00",
      });
    expect(
      findConflicts(occurrencesFor([a, b, c], ["2026-10-03"])),
    ).toHaveLength(1);
    expect(blockRange({ ...a, startTime: "99:00" })).toBeNull();
  });
  it("uses six calendar weeks and configurable week start", () => {
    const days = calendarDays("2026-10-03", 1);
    expect(days).toHaveLength(42);
    expect(new Date(days[0] + "T12:00:00").getDay()).toBe(1);
  });
  it("brings exams and contests into the dashboard agenda", () =>
    expect(
      occurrencesFor(
        [
          item({ kind: "exam", date: "2026-10-03" }),
          item({ id: "c", kind: "contest", date: "2026-10-03" }),
        ],
        ["2026-10-03"],
      ),
    ).toHaveLength(2));
});
describe("transparent spaced repetition", () => {
  const now = new Date("2026-10-03T12:00:00");
  it.each([
    ["again", 0],
    ["hard", 1],
    ["good", 1],
    ["easy", 4],
  ] as const)("new card %s schedules %i days", (rating, interval) => {
    const result = scheduleCard({}, rating, now);
    expect(result.interval).toBe(interval);
    expect(result.dueDate).toBe(addDays(today(now), interval));
    expect(result.reviews).toBe(1);
  });
  it("keeps history immutable and bounds interval growth", () => {
    const card = {
      interval: 3000,
      reviewHistory: [
        { date: now.toISOString(), rating: "good", interval: 3000 },
      ],
    };
    const result = scheduleCard(card, "easy", now);
    expect(result.interval).toBe(3650);
    expect(card.reviewHistory).toHaveLength(1);
    expect(result.reviewHistory).toHaveLength(2);
  });
  it("again resets a previously learned card to today", () =>
    expect(scheduleCard({ interval: 40 }, "again", now).interval).toBe(0));
});
describe("real elapsed focus, never fabricated minutes", () => {
  const now = Date.parse("2026-10-03T12:00:00Z");
  const timer = {
    ...DEFAULT_TIMER,
    startedAt: new Date(now).toISOString(),
    running: true,
    endAt: now + 1500000,
  };
  it("derives remaining time from wall clock", () => {
    expect(remainingTimerSeconds(timer, now + 120000)).toBe(1380);
    expect(elapsedTimerSeconds(timer, now + 120000)).toBe(120);
  });
  it("caps logged time at duration after a suspended tab returns", () => {
    expect(elapsedTimerSeconds(timer, now + 9999999)).toBe(1500);
    expect(remainingTimerSeconds(timer, now + 9999999)).toBe(0);
  });
  it("does not count pauses", () => {
    const paused = pauseTimerAt(timer, now + 120000);
    expect(paused.elapsed).toBe(120);
    expect(elapsedTimerSeconds(paused, now + 600000)).toBe(120);
  });
  it("counts resumed segments without double counting", () => {
    const paused = pauseTimerAt(timer, now + 120000);
    const resumed = {
      ...paused,
      running: true,
      endAt: now + 600000 + paused.remaining * 1000,
    };
    expect(elapsedTimerSeconds(resumed, now + 660000)).toBe(180);
  });
  it("keeps a fresh block at zero and rounds display upward", () => {
    expect(elapsedTimerSeconds(DEFAULT_TIMER)).toBe(0);
    expect(timerDisplay(59.5)).toBe("01:00");
  });
});
describe("honest analytics and local references", () => {
  it("handles empty records without fake success rates", () => {
    expect(problemMetrics([]).successRate).toBeNull();
    expect(streak([], "2026-10-03")).toBe(0);
    expect(
      dailySeries([], "2026-10-03", 7).every(
        (d) => d.minutes === 0 && d.tasks === 0,
      ),
    ).toBe(true);
    expect(attendanceSummary([]).percentage).toBeNull();
  });
  it("counts solved and revised problems consistently", () =>
    expect(
      problemMetrics([
        item({ kind: "problem", status: "solved" }),
        item({ id: "b", kind: "problem", status: "revised" }),
        item({ id: "c", kind: "problem", status: "attempted" }),
      ]).successRate,
    ).toBe(67));
  it("counts actual sessions and completed tasks by local day", () => {
    const data = [
      item({ kind: "session", date: "2026-10-02", actualMinutes: 25 }),
      item({
        id: "t",
        status: "done",
        completedAt: "2026-10-03T12:00:00",
        date: "2026-10-03",
      }),
    ];
    expect(dailySeries(data, "2026-10-02", 2).map((d) => d.minutes)).toEqual([
      25, 0,
    ]);
    expect(streak(data, "2026-10-03")).toBe(2);
  });
  it("calculates weighted marks and attendance from actual entries", () => {
    expect(
      marksSummary([
        item({ marks: 40, maxMarks: 50 }),
        item({ marks: 70, maxMarks: 100 }),
      ]).percentage,
    ).toBe(73.3);
    expect(
      attendanceSummary([item({ attended: 7, total: 10 })]).percentage,
    ).toBe(70);
    expect(classesNeeded(7, 10, 75)).toBe(2);
  });
  it("allows only explicit safe external links", () => {
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
    expect(safeUrl("file:///etc/passwd")).toBeNull();
    expect(safeUrl("javascript:alert(1)")).toBeNull();
  });
  it("syntax-highlights as text without changing or executing code", () => {
    const code = 'class Main { String value = "<script>"; } // comment';
    const tokens = tokenizeCode(code);
    expect(tokens.map((t) => t.text).join("")).toBe(code);
    expect(tokens.some((t) => t.kind === "keyword" && t.text === "class")).toBe(
      true,
    );
  });
});
