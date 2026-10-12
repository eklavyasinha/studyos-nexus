import { describe, expect, it, vi } from "vitest";
import {
  emptySnapshot,
  parseBackup,
  serializeBackup,
  updateRecord,
  validateItem,
} from "../lib/logic";
import type { Item, Settings } from "../lib/types";
import { addDays, routeFor, today } from "../lib/utils";
import {
  missingModulePrerequisites,
  platformGateState,
  platformReadinessRecord,
  readinessValues,
} from "../lib/readiness";
import { dashboardProgress } from "../lib/study-progress";
import {
  PERSONAL_ROADMAP,
  templateValues,
} from "../pages/personal-roadmap-data";
import {
  STARTING_SCHEDULE,
  START_DATE,
  END_DATE,
} from "../pages/study-schedule-data";
import {
  freeStudySlots,
  hasScheduleInstallation,
  installationValues,
  scheduleTimingError,
} from "../pages/study-schedule-helpers";
import { problemMetrics } from "../pages/learning-helpers";
import {
  ASSISTANT_ACTION_REGISTRY,
  ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
  buildProgressSummary,
  parseAssistantRequest,
  type AssistantStore,
} from "../lib/assistant";
import {
  CUSTOM_COURSE_CATEGORY,
  CUSTOM_COURSE_DOMAIN,
  CUSTOM_COURSE_ROADMAP_PHASE,
  CUSTOM_COURSE_SOURCE_TYPE,
  getCustomCourseTopics,
  getCustomCourses,
  isCustomCourse,
  isCustomCourseTopic,
} from "../lib/course-customization";

const record = (patch: Partial<Item> = {}): Item => ({
  id: crypto.randomUUID(),
  kind: "task",
  title: "Test record",
  createdAt: "2026-10-03T10:00:00Z",
  updatedAt: "2026-10-03T10:00:00Z",
  ...patch,
});
const topic = (key: string, patch: Partial<Item> = {}) =>
  record({
    kind: "topic",
    ...templateValues(PERSONAL_ROADMAP.find((module) => module.key === key)!),
    status: "completed",
    ...patch,
  });

const customCourse = (patch: Partial<Item> = {}) =>
  record({
    kind: "subject",
    id: "custom-course-web",
    title: "Frontend Path",
    course: "frontend-path",
    domain: CUSTOM_COURSE_DOMAIN,
    category: CUSTOM_COURSE_CATEGORY,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
    status: "active",
    archived: false,
    ...patch,
  });
const customTopic = (
  id: string,
  title: string,
  order: number,
  patch: Partial<Item> = {},
) =>
  record({
    kind: "topic",
    id,
    title,
    course: "frontend-path",
    subjectId: "custom-course-web",
    domain: CUSTOM_COURSE_DOMAIN,
    roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
    order,
    status: "not started",
    archived: false,
    ...patch,
  });

describe("restartable 11 October 2026 to March 2027 plan", () => {
  it("has every date, no earlier backlog, unique versioned identities and actionable metadata", () => {
    expect(new Set(STARTING_SCHEDULE.map((item) => item.date)).size).toBe(172);
    expect(new Set(STARTING_SCHEDULE.map((item) => item.scheduleId)).size).toBe(
      STARTING_SCHEDULE.length,
    );
    for (const seed of STARTING_SCHEDULE) {
      expect(seed.date >= START_DATE && seed.date <= END_DATE).toBe(true);
      expect(seed.originalDate).toBe(seed.date);
      expect(seed.official).toBe(false);
      expect(seed.date >= START_DATE && seed.date <= END_DATE).toBe(true);
      expect(seed.scheduleId).toMatch(/^study-schedule-v2-/);
      expect(seed.roadmapPhase).toBeTruthy();
      expect(seed.description!.length).toBeGreaterThan(20);
      expect(seed.completionCriteria.length).toBeGreaterThan(20);
      expect(seed.milestone.length).toBeGreaterThan(10);
      expect(
        scheduleTimingError(
          seed.date,
          seed.startTime,
          seed.endTime,
          seed.duration,
        ),
      ).toBe("");
    }
  });
  it("does not overlap any of its protected or saved study blocks", () => {
    const records = STARTING_SCHEDULE.map((seed) => record(seed));
    for (const item of records)
      expect(
        scheduleTimingError(
          item.date!,
          item.startTime!,
          item.endTime!,
          item.duration!,
          records,
          item.id,
        ),
      ).toBe("");
  });
  it("keeps Maths practice, daily reviews, progression gates and optional participation visible", () => {
    const maths = STARTING_SCHEDULE.filter(
      (item) => item.course === "maths-ml",
    );
    expect(maths.length).toBeGreaterThan(90);
    expect(maths.every((item) => item.duration === 45)).toBe(true);
    expect(
      STARTING_SCHEDULE.filter((item) => item.sessionType === "daily-review"),
    ).toHaveLength(172);
    const gated = STARTING_SCHEDULE.filter((item) => item.requiresGate);
    expect(gated.length).toBeGreaterThan(0);
    expect(gated.every((item) => item.prerequisites.length > 0)).toBe(true);
    expect(
      STARTING_SCHEDULE.some(
        (item) => item.sessionType === "optional-hacktoberfest",
      ),
    ).toBe(true);
  });
  it("recognizes installation even if every task was deleted", () => {
    expect(hasScheduleInstallation([record(installationValues())])).toBe(true);
    expect(hasScheduleInstallation([])).toBe(false);
  });
  it("only offers free bounded catch-up slots on real dates from the start", () => {
    expect(freeStudySlots([], "2026-10-03", 30)).toEqual([]);
    expect(freeStudySlots([], "2026-02-31", 30)).toEqual([]);
    expect(scheduleTimingError("2026-10-12", "20:00", "20:30", 30)).toMatch(
      /protected/,
    );
    expect(scheduleTimingError("2026-10-12", "22:30", "23:00", 30)).toMatch(
      /protected/,
    );
    expect(freeStudySlots([], "2026-11-01", 30).length).toBeGreaterThan(0);
  });
});

describe("local fallback assistant", () => {
  const currentDay = today();
  const snapshot = () => ({
    ...emptySnapshot(),
    items: [
      record({
        id: "java-task",
        kind: "task",
        title: "Java arrays practice",
        course: "java-dsa",
        dueDate: currentDay,
        date: currentDay,
        status: "todo",
        duration: 60,
      }),
      record({
        id: "math-task",
        kind: "task",
        title: "Maths vectors",
        course: "maths-ml",
        dueDate: currentDay,
        date: currentDay,
        status: "todo",
        duration: 45,
      }),
    ],
  });
  const localAssistantStore = (initial = snapshot()) => {
    let state = structuredClone(initial);
    const notifications: string[] = [];
    const store: AssistantStore = {
      get items() {
        return state.items;
      },
      get settings() {
        return state.settings;
      },
      get timer() {
        return state.timer;
      },
      ready: true,
      readOnly: false,
      create: vi.fn((kind, values) => {
        const created = record({ ...values, kind });
        state = { ...state, items: [...state.items, created] };
        return created;
      }),
      update: vi.fn((id, patch) => {
        state = { ...state, items: updateRecord(state.items, id, patch) };
      }),
      setSettings: vi.fn((patch) => {
        state = { ...state, settings: { ...state.settings, ...patch } };
      }),
      setTimer: vi.fn((patch) => {
        state = { ...state, timer: { ...state.timer, ...patch } };
      }),
      completeTask: vi.fn((id) => {
        state = {
          ...state,
          items: updateRecord(state.items, id, { status: "done" }),
        };
      }),
      remove: vi.fn((id) => {
        state = {
          ...state,
          items: state.items.filter((item) => item.id !== id),
        };
      }),
      notify: (message) => {
        notifications.push(message);
      },
      snapshot: () => state,
    };
    return { store, state: () => state, notifications };
  };
  const executeRequest = (request: string, harness = localAssistantStore()) => {
    const parsed = parseAssistantRequest(request, harness.state());
    if (parsed.kind !== "action")
      throw new Error(`${request}: ${parsed.message}`);
    expect(parsed.action.execute(harness.store).ok).toBe(true);
    return { harness, action: parsed.action };
  };
  const expectNoWrites = (request: string, sourceBoundary = false) => {
    const harness = localAssistantStore();
    const before = structuredClone(harness.state());
    const parsed = parseAssistantRequest(request, harness.state());
    expect(parsed.kind, request).toBe("message");
    if (sourceBoundary)
      expect(parsed).toEqual({
        kind: "message",
        tone: "info",
        message: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
      });
    // Parsing a denied request must not change or expose an executable mutation.
    expect(harness.state()).toEqual(before);
    for (const method of [
      "create",
      "update",
      "remove",
      "completeTask",
      "setSettings",
      "setTimer",
    ] as const)
      expect(harness.store[method]).not.toHaveBeenCalled();
  };
  it.each([
    ["What’s my plan today?", "today-plan"],
    ["Aaj ke Java tasks complete mark kar do", "complete-java-today"],
    ["Reschedule Java arrays practice to tomorrow", "reschedule-task"],
    ["Missed 3 days — recovery", "recovery"],
    ["Balance next week’s workload", "balance-next-week"],
    ["Sort pending tasks by priority", "priority-sort"],
    ["Add a revision note about binary search", "add-revision"],
    ["Start a focus session for 25 minutes", "start-focus"],
    ["Change theme to light", "change-theme"],
    ["Change accent to blue", "change-accent"],
    ["Use compact workspace density", "change-density"],
    ["Make the workspace comfortable", "change-density"],
    ["Turn reduced motion on", "change-reduced-motion"],
    ["Set my daily goal to 90 minutes", "change-daily-goal"],
    ["Set focus duration to 45 minutes", "change-focus-duration"],
    ["Hide the focus widget", "set-widget-visibility"],
    ["Make the agenda widget wide", "set-widget-size"],
    ["Move the goals widget before agenda", "move-widget"],
    ["Move the goals widget above agenda", "move-widget"],
    ["रोज़ का लक्ष्य 75 मिनट कर दो", "change-daily-goal"],
    ["फोकस अवधि 40 मिनट", "change-focus-duration"],
    ["फोकस विजेट छुपाओ", "set-widget-visibility"],
    ["Delete Java arrays practice", "delete-task"],
  ])("maps %s to a registered local action", (input, id) => {
    const parsed = parseAssistantRequest(input, snapshot());
    expect(parsed.kind).toBe("action");
    if (parsed.kind === "action") expect(parsed.action.id).toBe(id);
  });
  it("applies bounded settings through the existing local Store methods", () => {
    const harness = localAssistantStore();
    const requests = [
      "Change theme to light",
      "Change accent to violet",
      "Use compact workspace density",
      "Turn reduced motion on",
      "Set my daily goal to 90 minutes",
      "Set focus duration to 45 minutes",
    ];
    for (const request of requests) {
      const parsed = parseAssistantRequest(request, harness.state());
      expect(parsed.kind).toBe("action");
      if (parsed.kind === "action")
        expect(parsed.action.execute(harness.store).ok).toBe(true);
    }
    expect(harness.state().settings).toMatchObject({
      theme: "light",
      accent: "violet",
      density: "compact",
      reducedMotion: true,
      dailyGoal: 90,
      focusMinutes: 45,
    });
    expect(harness.notifications).toHaveLength(6);
  });
  it("validates and persists supported widget visibility, size, and order", () => {
    const harness = localAssistantStore();
    const requests = [
      "Hide the focus widget",
      "Make the agenda widget wide",
      "Move the goals widget before agenda",
    ];
    for (const request of requests) {
      const parsed = parseAssistantRequest(request, harness.state());
      expect(parsed.kind).toBe("action");
      if (parsed.kind === "action")
        expect(parsed.action.execute(harness.store).ok).toBe(true);
    }
    const widgets = harness.state().settings.widgets;
    expect(widgets.find((widget) => widget.id === "focus")?.visible).toBe(
      false,
    );
    expect(widgets.find((widget) => widget.id === "agenda")?.size).toBe("wide");
    expect(widgets.map((widget) => widget.id).slice(0, 2)).toEqual([
      "goals",
      "agenda",
    ]);
    expect(widgets).toHaveLength(6);
  });
  it("rejects invalid local setting values without creating an action", () => {
    for (const request of [
      "Change accent to orange",
      "Set daily goal to 0 minutes",
      "Set focus duration to 181 minutes",
    ]) {
      const parsed = parseAssistantRequest(request, snapshot());
      expect(parsed.kind).toBe("message");
      if (parsed.kind === "message") expect(parsed.tone).toBe("error");
    }
  });
  it("declines source-code and file-edit requests with the coding-agent boundary", () => {
    for (const request of [
      "Edit the source code to add a feature",
      "Edit src/App.tsx to add a feature",
      "Change the CSS for the dashboard",
      "Modify project files to add a React feature",
      "कोड में एक फीचर जोड़ो",
    ]) {
      const parsed = parseAssistantRequest(request, snapshot());
      expect(parsed).toEqual({
        kind: "message",
        tone: "info",
        message: ASSISTANT_SOURCE_CODE_BOUNDARY_MESSAGE,
      });
    }
  });
  it.each([
    ["Turn reduced motion on", true],
    ["Turn reduced motion off", false],
    ["Enable reduced-motion", true],
    ["Disable reduced-motion", false],
    ["Disable animations", true],
    ["Enable animations", false],
    ["Turn animations off", true],
    ["Turn animations on", false],
    ["Reduce motion", true],
    ["एनीमेशन बंद करो", true],
    ["एनीमेशन चालू करो", false],
    ["reduced motion band karo", false],
  ])("interprets the motion target and direction: %s", (request, expected) => {
    const data = snapshot();
    data.settings.reducedMotion = !expected;
    const harness = localAssistantStore(data);
    executeRequest(request, harness);
    expect(harness.state().settings).toEqual({
      ...data.settings,
      reducedMotion: expected,
    });
    expect(harness.state().items).toEqual(data.items);
    expect(harness.state().timer).toEqual(data.timer);
  });
  it("supports each setting's inverse and every enum without changing study records or the active timer", () => {
    const data = snapshot();
    data.timer = {
      ...data.timer,
      running: true,
      startedAt: new Date().toISOString(),
    };
    const harness = localAssistantStore(data);
    const steps: [string, keyof Settings, Settings[keyof Settings]][] = [
      ["Change theme to light", "theme", "light"],
      ["Change theme to system", "theme", "system"],
      ["Change theme to dark", "theme", "dark"],
      ["Change accent to blue", "accent", "blue"],
      ["Change accent to violet", "accent", "violet"],
      ["Change accent to lime", "accent", "lime"],
      ["Use compact workspace density", "density", "compact"],
      ["Use comfortable workspace density", "density", "comfortable"],
      ["Set daily goal to 1 minute", "dailyGoal", 1],
      ["Set daily goal to 1440 minutes", "dailyGoal", 1440],
      ["Set daily goal to 120 minutes", "dailyGoal", 120],
      ["Set focus duration to 1 minute", "focusMinutes", 1],
      ["Set focus duration to 180 minutes", "focusMinutes", 180],
      ["Set focus duration to 25 minutes", "focusMinutes", 25],
    ];
    for (const [request, key, value] of steps) {
      const before = structuredClone(harness.state().settings);
      executeRequest(request, harness);
      expect(harness.state().settings).toEqual({ ...before, [key]: value });
      expect(harness.state().items).toEqual(data.items);
      expect(harness.state().timer).toEqual(data.timer);
    }
  });
  it.each([
    "Set daily goal to -2 minutes",
    "Set focus duration to −25 minutes",
    "Set daily goal to 1.5 minutes",
    "Set focus duration to 25.5 minutes",
    "Set daily goal to 1/2 minute",
    "Set focus duration to 2 hours",
    "Set daily goal to 2 hours",
    "Set daily goal to 1441 minutes",
    "Set focus duration to 181 minutes",
    "Set focus duration to 0 minutes",
    "Set focus duration to 2 hours 30 minutes",
    "Set daily goal to 1e2 minutes",
    "Set daily goal to 1,000 minutes",
    "Set focus duration to 30 seconds",
    "Start a focus session for -2 minutes",
    "Start focus for 2 hours",
    "Start focus for 1.5 minutes",
    "Start focus 30 seconds",
  ])("rejects invalid minutes without reinterpreting them: %s", (request) => {
    expectNoWrites(request);
  });
  it.each([
    "Do not hide the focus widget",
    "Don't change theme to light",
    "Please do not change accent to blue",
    "What is blue accent?",
    "How do I hide the focus widget?",
    "Is the theme light?",
    "The focus widget is hidden",
    "My theme is light",
    "I use compact density",
    "Reduced motion is off",
    "The daily goal is 90 minutes",
    "फोकस विजेट मत छुपाओ",
    "theme light mat karo",
  ])(
    "does not execute negated, informational, or descriptive input: %s",
    (request) => {
      expectNoWrites(request);
    },
  );
  it.each([
    "Change accent to blue and hide the focus widget",
    "Hide the focus widget and goals widget",
    "Change theme to light or dark",
    "Make the agenda widget wide and normal",
    "Move focus before agenda and review",
    "Set daily goal to 60 or 90 minutes",
    "Set daily goal to 90 minutes; start a focus session",
    "Complete today's Java tasks and change theme to light",
    "Add a revision note about CSS and change theme to light",
    "Change theme to light, don't hide focus",
  ])("declines compound or ambiguous requests as a whole: %s", (request) => {
    expectNoWrites(request);
  });
  it.each([
    "Add a new feature",
    "Add a weather widget",
    "Remove the weather section",
    "Hide the weather widget",
    "Move weather before agenda",
    "Make the focus widget round",
    "Change the dashboard layout to three columns",
    "Change theme to light and edit the CSS",
    "Hide focus widget then modify src/App.tsx",
    "Edit React to set daily goal to 90 minutes",
    "Make the accent blue using CSS",
    "Add a revision note about CSS and edit src/App.tsx",
  ])(
    "hands unsupported source/layout/widget work to the coding session: %s",
    (request) => {
      expectNoWrites(request, true);
    },
  );
  it.each([
    "Show my schedule today",
    "Show today's agenda",
    "What is my plan today?",
  ])("keeps plan reads distinct from widget visibility: %s", (request) => {
    const harness = localAssistantStore();
    const before = structuredClone(harness.state());
    const { action } = executeRequest(request, harness);
    expect(action.id).toBe("today-plan");
    expect(harness.state()).toEqual(before);
    expect(harness.store.setSettings).not.toHaveBeenCalled();
  });
  it.each([
    "blue colors",
    "React and CSS",
    "source files and dashboard layout",
    "how to change theme to light",
    "remove the focus widget",
  ])("treats revision subjects as content: %s", (subject) => {
    const harness = localAssistantStore();
    const before = structuredClone(harness.state());
    const { action } = executeRequest(
      `Add a revision note about ${subject}`,
      harness,
    );
    expect(action.id).toBe("add-revision");
    expect(harness.state().items.slice(0, before.items.length)).toEqual(
      before.items,
    );
    expect(harness.state().items.at(-1)).toMatchObject({
      kind: "note",
      title: `Revision note · ${subject}`,
    });
    expect(harness.state().settings).toEqual(before.settings);
    expect(harness.state().timer).toEqual(before.timer);
  });
  it.each([
    "Blue accent layout",
    "Edit CSS source files",
    "Review React components",
    "Hide the focus widget",
    "Change theme and add a feature",
  ])("keeps saved task titles opaque during reschedule/delete: %s", (title) => {
    const data = snapshot();
    data.items.push(
      record({ id: "named", title, dueDate: currentDay, status: "todo" }),
    );
    const harness = localAssistantStore(data);
    expect(
      executeRequest(`Reschedule task "${title}" to tomorrow`, harness).action
        .id,
    ).toBe("reschedule-task");
    expect(
      harness.state().items.find((item) => item.id === "named")?.dueDate,
    ).toBe(addDays(currentDay, 1));
    expect(executeRequest(`Delete task "${title}"`, harness).action.id).toBe(
      "delete-task",
    );
    expect(harness.state().items).toEqual(
      data.items.filter((item) => item.id !== "named"),
    );
    expect(harness.state().settings).toEqual(data.settings);
  });
  it("only shows/hides supported sections and preserves similarly named records", () => {
    const data = snapshot();
    for (const title of ["focus widget", "goals section", "weather widget"])
      data.items.push(record({ title, status: "todo" }));
    const harness = localAssistantStore(data);
    for (const id of [
      "agenda",
      "tracks",
      "focus",
      "goals",
      "activity",
      "review",
    ]) {
      for (const [verb, visible] of [
        ["Remove", false],
        ["Add", true],
        ["Hide", false],
        ["Show", true],
      ] as const) {
        const { action } = executeRequest(`${verb} the ${id} section`, harness);
        expect(action.id).toBe("set-widget-visibility");
        expect(
          harness.state().settings.widgets.find((widget) => widget.id === id)
            ?.visible,
        ).toBe(visible);
      }
    }
    executeRequest("Make agenda widget wide", harness);
    executeRequest("Make agenda widget normal", harness);
    executeRequest("Move review before agenda", harness);
    executeRequest("Move agenda before review", harness);
    expect(
      harness
        .state()
        .settings.widgets.map((widget) => widget.id)
        .slice(0, 2),
    ).toEqual(["agenda", "review"]);
    expect(
      harness.state().settings.widgets.find((widget) => widget.id === "agenda")
        ?.size,
    ).toBe("normal");
    expect(harness.state().items).toEqual(data.items);
    expect(harness.store.remove).not.toHaveBeenCalled();
  });
  it.each([
    "Change theme to light",
    "Change accent to blue",
    "Use compact workspace density",
    "Turn reduced motion on",
    "Set daily goal to 90 minutes",
    "Set focus duration to 45 minutes",
    "Hide focus widget",
    "Make agenda widget wide",
    "Move review before agenda",
  ])("guards read-only and not-ready writes: %s", (request) => {
    for (const blocked of [{ readOnly: true }, { ready: false }]) {
      const harness = localAssistantStore();
      Object.assign(harness.store, blocked);
      const before = structuredClone(harness.state());
      const parsed = parseAssistantRequest(request, before);
      if (parsed.kind !== "action") throw new Error(parsed.message);
      expect(() => parsed.action.execute(harness.store)).toThrow(
        /read-only|opening/,
      );
      expect(harness.state()).toEqual(before);
      expect(harness.store.setSettings).not.toHaveBeenCalled();
      expect(harness.notifications).toEqual([]);
    }
  });
  it("revalidates arguments when registered actions are called directly", () => {
    const harness = localAssistantStore();
    const before = structuredClone(harness.state());
    const invalid = [
      ASSISTANT_ACTION_REGISTRY["change-theme"](before, { theme: ["light"] }),
      ASSISTANT_ACTION_REGISTRY["change-accent"](before, { accent: "red" }),
      ASSISTANT_ACTION_REGISTRY["change-density"](before, { density: "tiny" }),
      ASSISTANT_ACTION_REGISTRY["change-reduced-motion"](before, {
        enabled: "false",
      }),
      ASSISTANT_ACTION_REGISTRY["change-daily-goal"](before, { minutes: -1 }),
      ASSISTANT_ACTION_REGISTRY["change-focus-duration"](before, {
        minutes: 1.5,
      }),
      ASSISTANT_ACTION_REGISTRY["set-widget-visibility"](before, {
        widgetId: "weather",
        visible: true,
      }),
      ASSISTANT_ACTION_REGISTRY["set-widget-size"](before, {
        widgetId: "focus",
        size: "huge",
      }),
      ASSISTANT_ACTION_REGISTRY["move-widget"](before, {
        widgetId: "focus",
        beforeWidgetId: "weather",
      }),
    ];
    for (const action of invalid)
      expect(() => action.execute(harness.store)).toThrow();
    expect(harness.state()).toEqual(before);
    expect(harness.store.setSettings).not.toHaveBeenCalled();
  });
  it("never presents unsupported requests as model answers", () => {
    const parsed = parseAssistantRequest(
      "Explain any arbitrary quantum physics problem",
      snapshot(),
    );
    expect(parsed.kind).toBe("message");
    if (parsed.kind === "message")
      expect(parsed.message).toMatch(/rule-based fallback|general LLM/i);
  });
  it("summarizes actual saved records rather than fabricated goals", () => {
    const data = snapshot();
    const summary = buildProgressSummary(data, currentDay);
    expect(summary).toMatchObject({
      date: currentDay,
      taskTotal: 2,
      taskDone: 0,
      pendingTasks: 2,
      plannedMinutes: 105,
      focusedMinutes: 0,
    });
  });
  it("creates a marked custom course from the exact course command", () => {
    const harness = localAssistantStore();
    const parsed = parseAssistantRequest(
      "Create a new Web Development course",
      harness.state(),
    );
    expect(parsed.kind).toBe("action");
    if (parsed.kind !== "action") throw new Error(parsed.message);
    expect(parsed.action.id).toBe("create-custom-course");
    expect(parsed.action.execute(harness.store).ok).toBe(true);
    const created = getCustomCourses(harness.state().items)[0];
    expect(created).toMatchObject({
      kind: "subject",
      title: "Web Development",
      course: "web-development",
      domain: CUSTOM_COURSE_DOMAIN,
      category: CUSTOM_COURSE_CATEGORY,
      sourceType: CUSTOM_COURSE_SOURCE_TYPE,
      archived: false,
      status: "active",
    });
    expect(isCustomCourse(created)).toBe(true);
  });
  it("renames one custom course without changing its stable links or progress", () => {
    const data = snapshot();
    const savedTopic = customTopic(
      "topic-fundamentals",
      "JavaScript fundamentals",
      1,
      {
        status: "completed",
        body: "Recall notes",
        evidence: "Built and explained a parser",
        taskId: "saved-task-link",
      },
    );
    data.items.push(customCourse(), savedTopic);
    const unrelated = data.items.find((item) => item.id === "java-task")!;
    const beforeTopic = structuredClone(savedTopic);
    const harness = localAssistantStore(data);
    executeRequest("Rename my course to Web Development", harness);
    const course = harness
      .state()
      .items.find((item) => item.id === "custom-course-web")!;
    const afterTopic = harness
      .state()
      .items.find((item) => item.id === savedTopic.id)!;
    expect(course).toMatchObject({
      title: "Web Development",
      course: "frontend-path",
    });
    expect(afterTopic).toMatchObject({
      id: beforeTopic.id,
      course: beforeTopic.course,
      subjectId: beforeTopic.subjectId,
      status: beforeTopic.status,
      body: beforeTopic.body,
      evidence: beforeTopic.evidence,
      taskId: beforeTopic.taskId,
    });
    expect(
      harness.state().items.find((item) => item.id === unrelated.id),
    ).toEqual(unrelated);
    expect(isCustomCourseTopic(afterTopic)).toBe(true);
  });
  it("adds a topic after a named topic and keeps ordered custom records separate", () => {
    const data = snapshot();
    data.items.push(
      customCourse(),
      customTopic("topic-fundamentals", "JavaScript fundamentals", 1),
    );
    const harness = localAssistantStore(data);
    executeRequest("Add JavaScript DOM after JavaScript fundamentals", harness);
    const topics = getCustomCourseTopics(
      harness.state().items,
      "frontend-path",
    );
    expect(topics.map((item) => [item.title, item.order])).toEqual([
      ["JavaScript fundamentals", 1],
      ["JavaScript DOM", 2],
    ]);
    expect(topics[1]).toMatchObject({
      subjectId: "custom-course-web",
      domain: CUSTOM_COURSE_DOMAIN,
      roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
      sourceType: CUSTOM_COURSE_SOURCE_TYPE,
      status: "not started",
      archived: false,
    });
  });
  it("moves a named topic before another topic by changing order only", () => {
    const data = snapshot();
    const source = customTopic("topic-dom", "JavaScript DOM", 2, {
      status: "revising",
      body: "DOM notes",
      evidence: "Interactive page",
      taskId: "dom-task",
    });
    const target = customTopic(
      "topic-fundamentals",
      "JavaScript fundamentals",
      1,
    );
    data.items.push(customCourse(), target, source);
    const harness = localAssistantStore(data);
    executeRequest(
      "Move topic JavaScript DOM before topic JavaScript fundamentals",
      harness,
    );
    const topics = getCustomCourseTopics(
      harness.state().items,
      "frontend-path",
    );
    expect(topics.map((item) => item.title)).toEqual([
      "JavaScript DOM",
      "JavaScript fundamentals",
    ]);
    expect(topics.map((item) => item.order)).toEqual([1, 2]);
    expect(
      harness.state().items.find((item) => item.id === source.id),
    ).toMatchObject({
      id: source.id,
      status: source.status,
      body: source.body,
      evidence: source.evidence,
      taskId: source.taskId,
    });
    expect(
      harness.state().items.find((item) => item.id === "java-task"),
    ).toEqual(data.items.find((item) => item.id === "java-task"));
  });
  it("renames and confirmation-archives a named topic without hard deletion", () => {
    const data = snapshot();
    const saved = customTopic("topic-dom", "JavaScript DOM", 1, {
      status: "practicing",
      body: "DOM notes",
      evidence: "A saved browser exercise",
      taskId: "dom-task",
    });
    data.items.push(customCourse(), saved);
    const harness = localAssistantStore(data);
    executeRequest(
      "Rename topic JavaScript DOM to DOM APIs in course Frontend Path",
      harness,
    );
    const renamed = harness.state().items.find((item) => item.id === saved.id)!;
    expect(renamed).toMatchObject({
      id: saved.id,
      title: "DOM APIs",
      status: saved.status,
      body: saved.body,
      evidence: saved.evidence,
      taskId: saved.taskId,
    });
    const parsed = parseAssistantRequest(
      "Remove topic DOM APIs from course Frontend Path",
      harness.state(),
    );
    expect(parsed.kind).toBe("action");
    if (parsed.kind !== "action") throw new Error(parsed.message);
    expect(parsed.action.confirmation.required).toBe(true);
    expect(parsed.action.execute(harness.store).ok).toBe(true);
    expect(
      harness.state().items.find((item) => item.id === saved.id),
    ).toMatchObject({
      id: saved.id,
      archived: true,
      status: saved.status,
      body: saved.body,
      evidence: saved.evidence,
      taskId: saved.taskId,
    });
    expect(harness.state().items.some((item) => item.id === saved.id)).toBe(
      true,
    );
  });
  it("requires confirmation before archiving a course and its linked topics", () => {
    const data = snapshot();
    const linked = customTopic(
      "topic-fundamentals",
      "JavaScript fundamentals",
      1,
      {
        status: "completed",
        evidence: "Saved evidence",
      },
    );
    data.items.push(customCourse(), linked);
    const harness = localAssistantStore(data);
    const parsed = parseAssistantRequest(
      "Remove course Frontend Path",
      harness.state(),
    );
    expect(parsed.kind).toBe("action");
    if (parsed.kind !== "action") throw new Error(parsed.message);
    expect(parsed.action.id).toBe("archive-custom-course");
    expect(parsed.action.confirmation.required).toBe(true);
    expect(
      harness.state().items.find((item) => item.id === linked.id)?.archived,
    ).toBe(false);
    expect(parsed.action.execute(harness.store).ok).toBe(true);
    expect(
      harness.state().items.find((item) => item.id === "custom-course-web"),
    ).toMatchObject({ archived: true, status: "active" });
    expect(
      harness.state().items.find((item) => item.id === linked.id),
    ).toMatchObject({
      id: linked.id,
      archived: true,
      status: "completed",
      evidence: "Saved evidence",
    });
    expect(harness.state().items.some((item) => item.id === "java-task")).toBe(
      true,
    );
  });
  it("lists custom courses, topics and saved progress without writing", () => {
    const data = snapshot();
    data.items.push(
      customCourse(),
      customTopic("topic-fundamentals", "JavaScript fundamentals", 1, {
        status: "completed",
      }),
      customTopic("topic-dom", "JavaScript DOM", 2, { status: "learning" }),
    );
    const harness = localAssistantStore(data);
    const before = structuredClone(harness.state());
    const parsed = parseAssistantRequest(
      "Show my courses and progress",
      before,
    );
    expect(parsed.kind).toBe("action");
    if (parsed.kind !== "action") throw new Error(parsed.message);
    expect(parsed.action.id).toBe("list-custom-courses");
    const result = parsed.action.execute(harness.store);
    expect(result.ok).toBe(true);
    expect(result.changed).toBeUndefined();
    expect(result.details).toEqual([
      "Frontend Path · 1/2 complete (50%)",
      "  1. JavaScript fundamentals · Completed",
      "  2. JavaScript DOM · Learning",
    ]);
    expect(harness.state()).toEqual(before);
    expect(harness.store.create).not.toHaveBeenCalled();
    expect(harness.store.update).not.toHaveBeenCalled();
  });
  it("clarifies ambiguous courses and missing topic targets without writes", () => {
    const data = snapshot();
    data.items.push(
      customCourse(),
      customCourse({
        id: "custom-course-data",
        title: "Data Path",
        course: "data-path",
      }),
      customTopic("topic-fundamentals", "JavaScript fundamentals", 1),
    );
    const harness = localAssistantStore(data);
    const before = structuredClone(harness.state());
    for (const request of [
      "Rename my course to Web Development",
      "Add JavaScript DOM after Missing topic",
      "Move topic JavaScript fundamentals before topic Missing topic",
      "Remove topic Missing topic from course Frontend Path",
    ]) {
      const parsed = parseAssistantRequest(request, before);
      expect(parsed.kind, request).toBe("message");
      if (parsed.kind === "message") expect(parsed.tone).toBe("error");
    }
    expect(harness.state()).toEqual(before);
    expect(harness.store.create).not.toHaveBeenCalled();
    expect(harness.store.update).not.toHaveBeenCalled();
  });
  it("guards custom-course writes in read-only tabs", () => {
    const data = snapshot();
    data.items.push(customCourse());
    const harness = localAssistantStore(data);
    Object.assign(harness.store, { readOnly: true });
    const before = structuredClone(harness.state());
    const parsed = parseAssistantRequest(
      "Add JavaScript DOM after JavaScript fundamentals",
      before,
    );
    expect(parsed.kind).toBe("message");
    // The named anchor is absent, so this is a clarification rather than a write.
    expect(harness.state()).toEqual(before);
    const create = parseAssistantRequest(
      "Create a new Web Development course",
      before,
    );
    expect(create.kind).toBe("action");
    if (create.kind !== "action") throw new Error(create.message);
    expect(() => create.action.execute(harness.store)).toThrow(/read-only/);
    expect(harness.state()).toEqual(before);
    expect(harness.store.create).not.toHaveBeenCalled();
  });
});

describe("shared mastery and readiness", () => {
  const foundations = () =>
    ["java.arrays", "java.strings", "java.searching", "java.sorting"].map(
      (key) => topic(key),
    );
  it("requires manual acknowledgement as well as actual mastery", () => {
    const records = foundations();
    expect(platformGateState(records, "leetcode").unlocked).toBe(false);
    records.push(
      record({ kind: "goal", ...readinessValues("leetcode", true) }),
    );
    expect(platformGateState(records, "leetcode").unlocked).toBe(true);
    expect(platformGateState(records, "codeforces").unlocked).toBe(false);
  });
  it("does not use task/problem keywords, revised topics or archived mastery to unlock", () => {
    const records = [
      record({
        title: "arrays strings searching sorting complexity recursion",
        status: "done",
      }),
      record({ kind: "goal", ...readinessValues("leetcode", true) }),
      ...foundations().map((item) => ({ ...item, status: "revised" })),
    ];
    expect(platformGateState(records, "leetcode").unlocked).toBe(false);
    expect(
      platformGateState(
        [
          ...foundations().map((item) => ({ ...item, archived: true })),
          records[1],
        ],
        "leetcode",
      ).unlocked,
    ).toBe(false);
  });
  it("uses latest acknowledgement from either legacy page, including a later clearing", () => {
    const ready = record({
      kind: "goal",
      course: "roadmap-readiness",
      stage: "leetcode",
      status: "ready",
    });
    const cleared = record({
      kind: "goal",
      sourceType: "strategy-gate",
      roadmapPhase: "strategy-gates",
      milestone: "leetcode",
      status: "not ready",
      updatedAt: "2026-10-04T10:00:00Z",
    });
    expect(platformReadinessRecord([ready, cleared], "leetcode")).toEqual(
      cleared,
    );
    expect(
      platformGateState([...foundations(), ready, cleared], "leetcode")
        .unlocked,
    ).toBe(false);
  });
  it("canonical prerequisite identity survives display-title edits", () => {
    const arrays = topic("java.arrays", { title: "My array fundamentals" });
    expect(
      missingModulePrerequisites(topic("java.arrays-2d"), [arrays]),
    ).toEqual([]);
    const legacy = topic("java.arrays-2d", {
      prerequisites: ["Arrays"],
      moduleKey: undefined,
    });
    expect(missingModulePrerequisites(legacy, [arrays])).toEqual([]);
  });
  it("DP never unlocks just because DFS or a date was completed", () => {
    const missing = missingModulePrerequisites(topic("java.dp"), [
      topic("java.dfs"),
    ]);
    expect(missing).toContain("java.recursion");
    expect(missing).toContain("java.graphs");
    expect(missing).toContain("java.linked-lists");
  });
  it("regular practice requires separate actual dates, not planned dates", () => {
    const three = [1, 2, 3].map((n) =>
      record({
        kind: "problem",
        status: "solved",
        dueDate: addDays(START_DATE, n),
      }),
    );
    const check = () =>
      platformGateState(three, "icpc").checks.find(
        (item) => item.id === "regular-practice",
      )!.complete;
    expect(check()).toBe(false);
    three.forEach((item, n) => (item.date = addDays(START_DATE, n)));
    expect(check()).toBe(true);
  });
});

describe("upgraded data stays portable and honest", () => {
  it("preserves historic focus-session ISO timestamps alongside HH:mm planner blocks", () => {
    const session = record({
      kind: "session",
      date: START_DATE,
      startTime: "2026-10-04T09:00:00Z",
      endTime: "2026-10-04T09:25:00Z",
      actualMinutes: 25,
    });
    expect(validateItem(session)).toEqual(session);
    expect(() =>
      validateItem(record({ startTime: session.startTime })),
    ).toThrow("Invalid time");
  });
  it("round-trips the complete schedule, course map, gates and new metadata", () => {
    const snapshot = emptySnapshot();
    snapshot.items = [
      ...STARTING_SCHEDULE.map((seed) => record(seed)),
      ...PERSONAL_ROADMAP.map((module) =>
        record({ kind: "topic", ...templateValues(module) }),
      ),
      record({ kind: "goal", ...readinessValues("leetcode", true) }),
      record({
        sourceDate: "2026-10-03",
        sourceUrl: "https://developers.google.com/open-source/gsoc/timeline",
        originalDate: START_DATE,
        rescheduledAt: "2026-10-04T10:00:00Z",
        rescheduleCount: 1,
        solveMethod: "editorial",
      }),
    ];
    expect(parseBackup(serializeBackup(snapshot)).items).toEqual(
      snapshot.items,
    );
  });
  it.each([
    { originalDate: "2026-02-31" },
    { sourceDate: "not-a-date" },
    { rescheduledAt: "not-a-time" },
    { startTime: "25:00" },
    { endTime: "12:99" },
    { sourceUrl: "javascript:alert(1)" },
    { rescheduleCount: 1.5 },
    { courseOrder: 1.2 },
    { scheduleWeek: 1.1 },
    { prerequisites: "java.arrays" },
    { prerequisites: [5] },
    { official: "false" },
    { solveMethod: "invented" },
  ])("rejects malformed upgraded metadata: %j", (patch) => {
    expect(() => validateItem({ ...record(), ...patch })).toThrow();
  });
  it("preserves original date and history through Planner-style edits too", () => {
    const old = record({
      dueDate: START_DATE,
      date: START_DATE,
      scheduleId: "study-schedule-existing",
      status: "todo",
    });
    const once = updateRecord(
      [old],
      old.id,
      { dueDate: "2026-11-01" },
      new Date("2026-10-04T10:00:00Z"),
    );
    const twice = updateRecord(
      once,
      old.id,
      { dueDate: "2026-11-02" },
      new Date("2026-10-05T10:00:00Z"),
    );
    expect(twice[0]).toMatchObject({
      originalDate: START_DATE,
      dueDate: "2026-11-02",
      date: "2026-11-02",
      rescheduleCount: 2,
    });
    expect(twice[0].body).toContain("2026-11-01");
    expect(twice).toHaveLength(1);
  });
  it("separates independent, hints, editorial, unknown and unsolved problem records", () => {
    const metrics = problemMetrics([
      record({ kind: "problem", status: "solved", solveMethod: "independent" }),
      record({ kind: "problem", status: "solved", solveMethod: "hints" }),
      record({ kind: "problem", status: "revised", solveMethod: "editorial" }),
      record({ kind: "problem", status: "solved" }),
      record({ kind: "problem", status: "attempted" }),
      record({ kind: "problem", status: "todo" }),
    ]);
    expect(metrics).toMatchObject({
      solved: 4,
      attempted: 5,
      independent: 1,
      withHints: 1,
      editorialAssisted: 1,
      assistanceUnrecorded: 1,
      unsolved: 1,
      unattempted: 1,
    });
  });
  it("dashboard counts selected-date work, actual effort without double counting, and real college deadlines", () => {
    const a = record({
      dueDate: START_DATE,
      status: "done",
      duration: 90,
      actualMinutes: 80,
    });
    const b = record({
      dueDate: START_DATE,
      status: "todo",
      duration: 45,
      actualMinutes: 10,
    });
    const records = [
      a,
      b,
      record({
        kind: "session",
        date: START_DATE,
        taskId: a.id,
        actualMinutes: 25,
      }),
      record({ dueDate: "2026-10-03", status: "todo" }),
      record({
        dueDate: "2026-10-12",
        originalDate: START_DATE,
        status: "todo",
      }),
      record({
        kind: "assignment",
        dueDate: "2026-10-09",
        status: "in-progress",
      }),
      record({ dueDate: START_DATE, status: "cancelled", duration: 500 }),
    ];
    const summary = dashboardProgress(records, START_DATE, 0);
    expect(summary).toMatchObject({
      total: 2,
      complete: 1,
      planned: 135,
      actual: 35,
    });
    expect(summary.remaining).toHaveLength(1);
    expect(summary.overdue).toHaveLength(1);
    expect(summary.rescheduled).toHaveLength(1);
    expect(summary.assignments).toHaveLength(1);
    expect(dashboardProgress(records, "2026-10-05", 0).total).toBe(0);
  });
  it("search and dashboard deep links reach each record's real upgraded editor", () => {
    expect(routeFor(record(STARTING_SCHEDULE[0]))).toBe("schedule");
    expect(routeFor(topic("java.arrays"))).toBe("roadmap");
    expect(
      routeFor(record({ kind: "note", sourceType: "strategy-gsoc-research" })),
    ).toBe("strategy");
    expect(routeFor(record({ kind: "note" }))).toBe("notes");
  });
  it("skipped optional work stays incomplete without becoming compulsory overdue backlog", () => {
    const optional = record({
      dueDate: START_DATE,
      sessionType: "optional-git",
      status: "todo",
    });
    expect(dashboardProgress([optional], "2026-10-11").overdue).toHaveLength(0);
    expect(optional.status).toBe("todo");
  });
});
