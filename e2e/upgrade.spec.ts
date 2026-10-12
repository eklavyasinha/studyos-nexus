import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  PERSONAL_ROADMAP,
  templateValues,
} from "../src/pages/personal-roadmap-data";
import type { Item } from "../src/lib/types";
import {
  CUSTOM_COURSE_CATEGORY,
  CUSTOM_COURSE_DOMAIN,
  CUSTOM_COURSE_ROADMAP_PHASE,
  CUSTOM_COURSE_SOURCE_TYPE,
} from "../src/lib/course-customization";

async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Make this my space" }).click();
}
async function dbSnapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("studyos-nexus", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<any>((resolve, reject) => {
      const request = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

async function seedSyntheticTopics(page: Page, keys: string[]) {
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  const now = "2026-10-04T09:00:00Z";
  const topics = keys.map((key, index) => ({
    ...templateValues(PERSONAL_ROADMAP.find((module) => module.key === key)!),
    kind: "topic",
    id: `synthetic-topic-${index}-${key}`,
    createdAt: now,
    updatedAt: now,
    status: "completed",
  }));
  await page.evaluate(async (topics) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("studyos-nexus", 1);
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction("workspace", "readwrite");
    const store = tx.objectStore("workspace");
    const read = store.get("current");
    read.onsuccess = () =>
      store.put(
        { ...read.result, items: [...read.result.items, ...topics] },
        "current",
      );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, topics);
  await page.reload();
}

test("personal course map adopts modules, preserves gates, and supports custom modules", async ({
  page,
}) => {
  await start(page);
  await page.goto("/#roadmap");
  await expect(
    page.getByRole("heading", { name: "A path you can make your own." }),
  ).toBeVisible();
  await expect(
    page.getByText("Course map scaffold · editable", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("LeetCode", { exact: true })).toBeVisible();
  const available = page
    .getByRole("button", { name: "Adopt", exact: true })
    .first();
  await available.click();
  await expect(page.getByText(/added to your local roadmap/i)).toBeVisible();
  const snapshot = await dbSnapshot(page);
  expect(
    snapshot.items.filter(
      (item: any) =>
        item.course === "java-dsa" && item.roadmapPhase === "scaffold",
    ),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Add custom module", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("My independent debugging lab");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create topic", exact: true })
    .click();
  expect(
    (await dbSnapshot(page)).items.some(
      (item: any) => item.title === "My independent debugging lab",
    ),
  ).toBe(true);
});

test("personal roadmap covers assistant-created custom courses and topics", async ({
  page,
}) => {
  await start(page);
  await page.goto("/#roadmap");
  const now = "2026-10-12T09:00:00Z";
  const course = {
    kind: "subject",
    id: "custom-course-ui",
    title: "Frontend Path",
    createdAt: now,
    updatedAt: now,
    course: "frontend-path",
    domain: CUSTOM_COURSE_DOMAIN,
    category: CUSTOM_COURSE_CATEGORY,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
    status: "active",
    archived: false,
  };
  const topics = [
    {
      kind: "topic",
      id: "custom-topic-dom",
      title: "JavaScript DOM",
      createdAt: now,
      updatedAt: now,
      course: "frontend-path",
      subjectId: "custom-course-ui",
      domain: CUSTOM_COURSE_DOMAIN,
      roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
      sourceType: CUSTOM_COURSE_SOURCE_TYPE,
      order: 2,
      status: "learning",
      archived: false,
    },
    {
      kind: "topic",
      id: "custom-topic-fundamentals",
      title: "JavaScript fundamentals",
      createdAt: now,
      updatedAt: now,
      course: "frontend-path",
      subjectId: "custom-course-ui",
      domain: CUSTOM_COURSE_DOMAIN,
      roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
      sourceType: CUSTOM_COURSE_SOURCE_TYPE,
      order: 1,
      status: "not started",
      archived: false,
    },
  ];
  await page.evaluate(
    async ({ course, topics }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("studyos-nexus", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("workspace", "readwrite");
      const store = tx.objectStore("workspace");
      const read = store.get("current");
      read.onsuccess = () =>
        store.put(
          { ...read.result, items: [...read.result.items, course, ...topics] },
          "current",
        );
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { course, topics },
  );
  await page.reload();

  const customPanel = page.locator(".personal-roadmap-custom-courses");
  await expect(
    customPanel.getByRole("heading", { name: "Custom courses", exact: true }),
  ).toBeVisible();
  await expect(
    customPanel.getByRole("tab", { name: /Frontend Path/ }),
  ).toBeVisible();
  await expect(
    customPanel.getByText("JavaScript fundamentals", { exact: true }),
  ).toBeVisible();
  await expect(
    customPanel.getByText("JavaScript DOM", { exact: true }),
  ).toBeVisible();

  await customPanel
    .getByRole("button", { name: "Add topic", exact: true })
    .click();
  const topicDialog = page.getByRole("dialog");
  await topicDialog
    .getByLabel("Topic title", { exact: true })
    .fill("Browser APIs");
  await topicDialog
    .getByRole("button", { name: "Add topic", exact: true })
    .click();
  await expect(topicDialog).toHaveCount(0);

  await customPanel
    .getByLabel("Status for JavaScript fundamentals", { exact: true })
    .selectOption("completed");
  await customPanel
    .getByRole("button", {
      name: "Move JavaScript DOM before JavaScript fundamentals",
      exact: true,
    })
    .click();

  await customPanel
    .getByRole("button", { name: "Rename Frontend Path", exact: true })
    .click();
  const courseDialog = page.getByRole("dialog");
  await courseDialog
    .getByLabel("Course title", { exact: true })
    .fill("Frontend Track");
  await courseDialog
    .getByRole("button", { name: "Save course name", exact: true })
    .click();
  await expect(courseDialog).toHaveCount(0);

  const saved = await dbSnapshot(page);
  const savedCourse = saved.items.find((item: Item) => item.id === course.id)!;
  expect(savedCourse).toMatchObject({
    title: "Frontend Track",
    course: "frontend-path",
    domain: CUSTOM_COURSE_DOMAIN,
    category: CUSTOM_COURSE_CATEGORY,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
  });
  expect(
    saved.items.find((item: Item) => item.id === "custom-topic-fundamentals"),
  ).toMatchObject({
    status: "completed",
    course: "frontend-path",
    subjectId: "custom-course-ui",
    domain: CUSTOM_COURSE_DOMAIN,
    roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
    order: 2,
  });
  expect(
    saved.items.find((item: Item) => item.id === "custom-topic-dom"),
  ).toMatchObject({ order: 1, course: "frontend-path" });
  expect(
    saved.items.find((item: Item) => item.title === "Browser APIs"),
  ).toMatchObject({
    course: "frontend-path",
    subjectId: "custom-course-ui",
    domain: CUSTOM_COURSE_DOMAIN,
    roadmapPhase: CUSTOM_COURSE_ROADMAP_PHASE,
    sourceType: CUSTOM_COURSE_SOURCE_TYPE,
  });
});

test("starting schedule creates the 11 October–31 March plan and keeps reschedule history", async ({
  page,
}) => {
  await start(page);
  await page.goto("/#schedule");
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Scaffold applied", exact: true }),
  ).toBeVisible();
  const applied = await dbSnapshot(page);
  const schedule = applied.items.filter(
    (item: any) =>
      item.scheduleId?.startsWith("study-schedule-v2-") && item.kind === "task",
  );
  expect(schedule.length).toBeGreaterThan(700);
  expect(
    schedule.every(
      (item: any) =>
        item.dueDate >= "2026-10-11" &&
        item.dueDate <= "2027-03-31" &&
        item.official === false,
    ),
  ).toBe(true);
  const firstTitle = schedule.find(
    (item: any) =>
      item.dueDate === "2026-10-11" && item.sessionType === "java-dsa",
  )?.title;
  expect(firstTitle).toMatch(/Java \+ DSA/);
  const before = schedule.length;
  await page.reload();
  await page.getByRole("button", { name: "Start date", exact: true }).click();
  expect(await dbSnapshot(page)).toMatchObject({ items: expect.any(Array) });
  expect(
    (await dbSnapshot(page)).items.filter(
      (item: any) =>
        item.scheduleId?.startsWith("study-schedule-v2-") &&
        item.kind === "task",
    ),
  ).toHaveLength(before);
  await page
    .locator(".schedule-record")
    .filter({ hasText: firstTitle })
    .getByRole("button", { name: /^Reschedule / })
    .click();
  await page.getByLabel("Scheduled date", { exact: true }).fill("2026-10-12");
  const saveReschedule = page
    .getByRole("dialog")
    .getByRole("button", { name: "Save reschedule", exact: true });
  await saveReschedule.scrollIntoViewIfNeeded();
  await saveReschedule.click();
  await expect(
    page.getByRole("alert").filter({ hasText: /overlaps/ }),
  ).toBeVisible();
  await page.getByLabel("Scheduled date", { exact: true }).fill("2027-04-01");
  await saveReschedule.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  const moved = (await dbSnapshot(page)).items.find(
    (item: any) => item.title === firstTitle,
  );
  expect(moved.originalDate).toBe("2026-10-11");
  expect(moved.dueDate).toBe("2027-04-01");
  expect(moved.rescheduleCount).toBe(1);
});

test("strategy roadmap keeps GSoC claims evidence-based and Micro MBA unscheduled", async ({
  page,
}) => {
  await start(page);
  await page.goto("/#strategy");
  await expect(
    page.getByRole("heading", { name: /GSoC 2027 first/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/No assumed 2027 dates|official timeline/i).first(),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Micro MBA", exact: true }).click();
  await expect(
    page.getByText(/Micro MBA is pending|No maintenance records/i).first(),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "GSoC / open source", exact: true })
    .click();
  await expect(
    page.getByText(/No GSoC organization research records yet/i),
  ).toBeVisible();
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Research one real organization");
  await page
    .getByLabel("Repository URL *", { exact: true })
    .fill("https://github.com/example/project");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create note", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await dbSnapshot(page)).items.some(
        (item: any) => item.title === "Research one real organization",
      ),
    )
    .toBe(true);
  const record = (await dbSnapshot(page)).items.find(
    (item: any) => item.title === "Research one real organization",
  );
  expect(record).toMatchObject({
    kind: "note",
    sourceType: "strategy-gsoc-research",
    official: false,
  });
});

test("new routes are reachable from the preserved shell and remain responsive", async ({
  page,
}) => {
  await start(page);
  for (const route of ["schedule", "roadmap", "strategy"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      route,
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
});

test("local assistant is explicit, performs real supported actions, and rejects arbitrary questions", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Open local study assistant", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Local study assistant", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Local study assistant · rule-based fallback", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What this assistant can change" }),
  ).toBeVisible();
  const input = page.getByLabel("Ask the local study assistant", {
    exact: true,
  });
  await input.fill("Change theme to light");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("log").getByText("Theme changed to light.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Saved and verified", { exact: true }).first(),
  ).toBeVisible();
  await input.fill("Change accent to blue");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  await input.fill("Use compact workspace density");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await input.fill("Hide the focus widget");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await dbSnapshot(page)).settings.widgets.find(
          (widget: { id: string }) => widget.id === "focus",
        )?.visible,
    )
    .toBe(false);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  expect(
    (await dbSnapshot(page)).settings.widgets.find(
      (widget: { id: string }) => widget.id === "focus",
    )?.visible,
  ).toBe(false);
  await page
    .getByRole("button", { name: "Open local study assistant", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Local study assistant", exact: true }),
  ).toBeVisible();
  await input.fill("Edit src/App.tsx to add a feature");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(
    page
      .getByRole("log")
      .getByText(/cannot access or edit project files/i)
      .last(),
  ).toBeVisible();
  await input.fill("Add a revision note about binary search");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect
    .poll(async () =>
      (await dbSnapshot(page)).items.some(
        (item: Item) =>
          item.kind === "note" && item.title.includes("binary search"),
      ),
    )
    .toBe(true);
  await input.fill("Start a focus session for 25 minutes");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect
    .poll(async () => (await dbSnapshot(page)).timer.running)
    .toBe(true);
  await input.fill("Explain arbitrary quantum physics");
  await page.getByRole("button", { name: "Send request", exact: true }).click();
  await expect(page.getByText(/not a general LLM/i).last()).toBeVisible();
});

test("shared readiness acknowledgement, stable prerequisites and canonical topic tasks work across pages", async ({
  page,
}) => {
  await start(page);
  await seedSyntheticTopics(page, [
    "java.arrays",
    "java.strings",
    "java.searching",
    "java.sorting",
  ]);
  await page.goto("/#roadmap");
  const ready = page.getByRole("checkbox", { name: /I’m ready for LeetCode/ });
  await ready.check();
  await expect(
    page
      .locator(".personal-roadmap-gate-card")
      .filter({ hasText: "LeetCode" })
      .getByText("Ready", { exact: true }),
  ).toBeVisible();
  await page.goto("/#strategy");
  await page.getByRole("tab", { name: "Platform gates", exact: true }).click();
  const strategyGate = page
    .locator(".strategy-gate-card")
    .filter({ hasText: "LeetCode basics" });
  await expect(strategyGate.getByRole("checkbox")).toBeChecked();
  await strategyGate.getByRole("checkbox").uncheck();
  await page.goto("/#roadmap");
  await expect(ready).not.toBeChecked();
  // Editing a known title does not change stable module identity.
  const arrayRecord = (await dbSnapshot(page)).items.find(
    (item: Item) => item.moduleKey === "java.arrays",
  );
  await page.goto(`/#roadmap/${arrayRecord.id}`);
  await page
    .getByLabel("Title", { exact: true })
    .fill("My verified arrays foundation");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/#schedule");
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  await page.goto(`/#roadmap/${arrayRecord.id}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  const moduleToggle = page.getByRole("button", {
    name: /^My verified arrays foundation/,
  });
  if ((await moduleToggle.getAttribute("aria-expanded")) !== "true")
    await moduleToggle.click();
  await expect(
    page.getByText("Linked planner tasks", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Java \+ DSA · Arrays ·/ }).first(),
  ).toBeVisible();
});

test("blocked course work cannot be completed via dashboard or the preserved Planner editor", async ({
  page,
}) => {
  await start(page);
  await page.goto("/#schedule");
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  const task = (await dbSnapshot(page)).items.find(
    (item: Item) =>
      item.kind === "task" &&
      item.moduleKey === "java.arrays" &&
      item.dueDate >= "2026-10-11",
  );
  await page.goto("/#dashboard");
  await page.getByLabel("Dashboard date", { exact: true }).fill(task.dueDate);
  await page
    .getByRole("button", { name: `Complete ${task.title}`, exact: true })
    .click();
  await expect(
    page.getByText(/Prerequisites incomplete:/).first(),
  ).toBeVisible();
  expect(
    (await dbSnapshot(page)).items.find((item: Item) => item.id === task.id)
      .status,
  ).toBe("todo");
  await page.goto(`/#planner/${task.id}`);
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("done");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Prerequisites incomplete",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(
    (await dbSnapshot(page)).items.find((item: Item) => item.id === task.id)
      .status,
  ).toBe("todo");
});

test("upgraded pages and populated schedule pass axe in both themes and mobile layouts", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/#schedule");
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  for (const theme of ["dark", "light"]) {
    for (const button of await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .all())
      await button.click();
    if (theme === "light")
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    for (const route of [
      "schedule/date-2026-10-11",
      "roadmap",
      "strategy",
      "dashboard",
    ]) {
      await page.goto(`/#${route}`);
      await expect(page.locator("main h1").first()).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations,
        `${theme} ${route}: ${results.violations.map((item) => item.id).join(", ")}`,
      ).toEqual([]);
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        route,
      ).toBe(true);
      if (theme === "dark")
        await page.screenshot({
          path: `test-results/upgrade-${route.split("/")[0]}-mobile.png`,
          fullPage: true,
        });
      await page.setViewportSize({ width: 834, height: 1112 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `${route} tablet`,
      ).toBe(true);
      await page.setViewportSize({ width: 1440, height: 1000 });
      if (theme === "dark")
        await page.screenshot({
          path: `test-results/upgrade-${route.split("/")[0]}-desktop.png`,
          fullPage: true,
        });
    }
  }
});

test("date-aware dashboard follows midnight without regenerating tasks and preserves explicit date browsing", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-10T23:59:55") });
  await start(page);
  await page.goto("/#schedule");
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  await page.goto("/#dashboard");
  await expect(page.getByLabel("Dashboard date", { exact: true })).toHaveValue(
    "2026-10-10",
  );
  const before = (await dbSnapshot(page)).items;
  const maths = before.find(
    (item: Item) =>
      item.kind === "task" &&
      item.course === "maths-ml" &&
      item.dueDate === "2026-10-11",
  );
  await page.clock.fastForward(10000);
  await expect(page.getByLabel("Dashboard date", { exact: true })).toHaveValue(
    "2026-10-11",
  );
  await page
    .getByRole("button", { name: `Complete ${maths.title}`, exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await dbSnapshot(page)).items.find(
          (item: Item) => item.id === maths.id,
        ).status,
    )
    .toBe("done");
  expect((await dbSnapshot(page)).items).toHaveLength(before.length);
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await page.getByLabel("Dashboard date", { exact: true }).fill("2026-10-11");
  await expect(page.getByLabel("Dashboard date", { exact: true })).toHaveValue(
    "2026-10-11",
  );
  expect((await dbSnapshot(page)).items).toHaveLength(before.length);
  await page
    .getByRole("group", { name: "Agenda status" })
    .getByRole("button", { name: "Completed", exact: true })
    .click();
  await expect(page.getByText(maths.title, { exact: true })).toBeVisible();
});
