import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySnapshot, serializeBackup } from "../src/lib/logic";
import { today } from "../src/lib/utils";
import type { Item } from "../src/lib/types";

async function begin(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Make this my space" }).click();
  await expect(page.locator("main h1")).toBeVisible();
}
async function go(page: Page, route: string) {
  await page.goto("/#" + route);
  await expect(page.locator("main h1").first()).toBeVisible();
}
async function data(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((r, j) => {
      const q = indexedDB.open("studyos-nexus", 1);
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    return new Promise<any>((r) => {
      const q = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      q.onsuccess = () => r(q.result);
    });
  });
}
async function save(page: Page, kind: string) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: `Create ${kind}`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
}

test("Java opt-in curriculum, custom topic progress, snippets and search links", async ({
  page,
}) => {
  await begin(page);
  await go(page, "java");
  expect((await data(page)).items).toHaveLength(0);
  await page
    .getByRole("button", { name: "Add curriculum", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await page.getByLabel("Recursion & the call stack", { exact: true }).check();
  await page.getByLabel("Methods & scope", { exact: true }).check();
  await page.getByRole("button", { name: "Add 2 topics", exact: true }).click();
  await page
    .getByLabel("Learning state of Recursion & the call stack")
    .selectOption("mastered");
  await expect(
    page.getByText("1 of 2 topics mastered", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Snippet library", exact: true }).click();
  await page
    .getByRole("button", { name: "Save a snippet", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Safe binary search");
  await page
    .getByLabel("Source code *", { exact: true })
    .fill("int mid = low + (high - low) / 2;");
  await save(page, "snippet");
  await expect(page.locator(".learning-code")).toContainText("int mid");
  await page.reload();
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search all records and commands" })
    .fill("Safe binary search");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Safe binary search",
  );
});

test("DSA problem logging, filters, manual recommendation and revision status", async ({
  page,
}) => {
  await begin(page);
  await go(page, "dsa/new");
  await page.getByLabel("Title", { exact: true }).fill("Two Sum");
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("solved");
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Easy");
  await page.getByLabel("Platform", { exact: true }).fill("LeetCode");
  await page.getByLabel("Attempts", { exact: true }).fill("2");
  await page
    .getByLabel("Total time spent (minutes)", { exact: true })
    .fill("20");
  await page
    .getByLabel("Time & space complexity", { exact: true })
    .fill("O(n) time, O(n) space");
  await page
    .getByLabel("Mistakes & lessons", { exact: true })
    .fill("Check duplicate elements.");
  await save(page, "problem");
  await page
    .getByLabel("Problem of the day", { exact: true })
    .selectOption({ label: "Two Sum" });
  await page
    .getByLabel("Search problems", { exact: true })
    .fill("No matching record");
  await expect(page.locator(".learning-problem-table")).toHaveCount(0);
  await page.getByLabel("Search problems", { exact: true }).fill("Two Sum");
  await expect(
    page.getByRole("button", { name: "Two Sum", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Two Sum", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Status", { exact: true })
    .selectOption("revised");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  const s = await data(page);
  expect(s.items.find((i: any) => i.kind === "problem").status).toBe("revised");
  expect(s.settings.problemOfDay).toBeTruthy();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/dsa-workspace.png",
    fullPage: true,
  });
});

test("contest manual results reject inconsistent numbers and preserve reflection", async ({
  page,
}) => {
  await begin(page);
  await go(page, "competitive/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Saturday virtual contest");
  await page.getByLabel("Problems attempted", { exact: true }).fill("2");
  await page.getByLabel("Problems solved", { exact: true }).fill("3");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create contest", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Solved problems cannot exceed attempted",
  );
  await page.getByLabel("Problems solved", { exact: true }).fill("1");
  await page.getByLabel("Final rank (manual)", { exact: true }).fill("42");
  await page
    .getByLabel("Penalty / contest scoring units", { exact: true })
    .fill("90");
  await page
    .getByLabel("Contest reflection & scoring rules", { exact: true })
    .fill("Upsolve the graph traversal problem.");
  await save(page, "contest");
  await page.reload();
  const s = await data(page);
  expect(s.items.find((i: any) => i.kind === "contest")).toMatchObject({
    rank: 42,
    solved: 1,
    reflection: "Upsolve the graph traversal problem.",
  });
  await page.getByRole("tab", { name: "Weekly goals", exact: true }).click();
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Solve three upsolves");
  await page.getByLabel("Weekly target *", { exact: true }).fill("3");
  await save(page, "goal");
  await page
    .getByRole("tab", { name: "Practice schedule", exact: true })
    .click();
  await page.getByRole("button", { name: "New event", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Weekly contest preparation");
  await save(page, "event");
  await go(page, "planner");
  await expect(
    page.getByRole("button", {
      name: "Weekly contest preparation",
      exact: true,
    }),
  ).toBeVisible();
});

test("browser playground really executes isolated JS and saves local source", async ({
  page,
}) => {
  await begin(page);
  await go(page, "web");
  await page
    .getByLabel("HTML source", { exact: true })
    .fill('<button id="run">Try it</button><p id="result"></p>');
  await page.getByRole("tab", { name: "JavaScript", exact: true }).click();
  await page
    .getByLabel("JavaScript source", { exact: true })
    .fill(
      'document.querySelector("#run").onclick=()=>{ let isolated=false; try { parent.parent.document.body } catch { isolated=true } document.querySelector("#result").textContent=isolated?"Isolated and working":"Unsafe"; };',
    );
  await page.getByRole("button", { name: "Run preview", exact: true }).click();
  const inner = page
    .frameLocator(
      'iframe[title="Isolated HTML CSS JavaScript browser preview"]',
    )
    .frameLocator('iframe[title="Isolated experiment document"]');
  await inner.getByRole("button", { name: "Try it", exact: true }).click();
  await expect(
    inner.getByText("Isolated and working", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save experiment", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Isolated counter");
  await save(page, "snippet");
  await page.reload();
  await expect(page.getByLabel("Open saved experiment")).toContainText(
    "Isolated counter",
  );
});

test("projects connect tasks and milestones, with usable board and detail views", async ({
  page,
}) => {
  await begin(page);
  await go(page, "projects/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Local algorithm visualizer");
  await save(page, "project");
  await expect(page.locator("main h1")).toHaveText(
    "Local algorithm visualizer",
  );
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Build sorting animation");
  await save(page, "task");
  await page.getByRole("tab", { name: /Milestones/ }).click();
  await page
    .getByRole("button", { name: "Add milestone", exact: true })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("First usable visualizer");
  await save(page, "milestone");
  await page
    .getByRole("button", {
      name: "Complete milestone: First usable visualizer",
      exact: true,
    })
    .click();
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  const s = await data(page),
    project = s.items.find((i: any) => i.kind === "project");
  expect(s.items.find((i: any) => i.kind === "task").projectId).toBe(
    project.id,
  );
  expect(s.items.find((i: any) => i.kind === "milestone")).toMatchObject({
    projectId: project.id,
    status: "completed",
  });
  await go(page, "projects");
  await expect(
    page.getByRole("button", {
      name: "Local algorithm visualizer",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/projects-workspace.png",
    fullPage: true,
  });
});

test("college validates attendance and calculates manual marks and chapter progress", async ({
  page,
}) => {
  await begin(page);
  await go(page, "college/new");
  await page.getByLabel("Title", { exact: true }).fill("Discrete Mathematics");
  await save(page, "subject");
  await page.getByRole("tab", { name: "Attendance", exact: true }).click();
  await page
    .getByRole("button", { name: "New attendance", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("First ten classes");
  await page.getByLabel("Classes attended *", { exact: true }).fill("11");
  await page.getByLabel("Classes held *", { exact: true }).fill("10");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create attendance", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Attended classes cannot exceed",
  );
  await page.getByLabel("Classes attended *", { exact: true }).fill("8");
  await save(page, "attendance");
  await page.getByRole("tab", { name: "Marks", exact: true }).click();
  await page.getByRole("button", { name: "New grade", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("First quiz");
  await page.getByLabel("Marks earned *", { exact: true }).fill("18");
  await page.getByLabel("Marks possible *", { exact: true }).fill("20");
  await save(page, "grade");
  await page.getByRole("tab", { name: /Syllabus/ }).click();
  await page.getByRole("button", { name: "New topic", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Sets and relations");
  await save(page, "topic");
  await page.reload();
  const s = await data(page);
  expect(s.items.find((i: any) => i.kind === "attendance")).toMatchObject({
    attended: 8,
    total: 10,
  });
  expect(s.items.find((i: any) => i.kind === "grade")).toMatchObject({
    marks: 18,
    maxMarks: 20,
  });
  expect(s.items.find((i: any) => i.kind === "topic").domain).toBe("college");
});

test("all module empty states pass axe in dark and light, including tablet navigation", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await begin(page);
  const violations: unknown[] = [];
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    for (const route of [
      "planner",
      "java",
      "dsa",
      "competitive",
      "web",
      "projects",
      "notes",
      "focus",
      "cards",
      "college",
      "analytics",
      "settings",
    ]) {
      await go(page, route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      if (results.violations.length)
        violations.push({
          theme,
          route,
          issues: results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              message: n.failureSummary,
            })),
          })),
        });
    }
  }
  await page.setViewportSize({ width: 834, height: 1112 });
  await go(page, "dashboard");
  const tablet = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (tablet.violations.length)
    violations.push({
      tablet: tablet.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    });
  expect(violations).toEqual([]);
});
test("populated workspaces remain accessible in both themes and at mobile width", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await begin(page);
  const fixture = emptySnapshot(),
    now = new Date().toISOString(),
    day = today();
  fixture.settings.welcomed = true;
  const record = (
    kind: Item["kind"],
    id: string,
    title: string,
    values: Partial<Item> = {},
  ): Item => ({ kind, id, title, createdAt: now, updatedAt: now, ...values });
  fixture.items = [
    record("subject", "s", "Computer science", { target: 75 }),
    record("project", "p", "A useful local tool", {
      status: "in-progress",
      priority: "High",
      technologies: "Java, React",
    }),
    record("task", "t", "Review a graph traversal", {
      status: "todo",
      priority: "High",
      dueDate: day,
      projectId: "p",
      subjectId: "s",
      duration: 30,
    }),
    record("topic", "j", "Classes and objects", {
      domain: "java",
      status: "learning",
      category: "Foundations",
    }),
    record("problem", "d", "Find the shortest path", {
      domain: "dsa",
      status: "solved",
      difficulty: "Easy",
      date: day,
      attempts: 1,
      actualMinutes: 15,
    }),
    record("contest", "c", "Weekend virtual round", {
      domain: "cp",
      status: "completed",
      date: day,
      attempted: 3,
      solved: 2,
      rank: 10,
      penalty: 30,
    }),
    record("note", "n", "Lecture notes", {
      body: "# A connected idea\n\n- [x] Understand the base case\n- [ ] Test the boundaries\n\n```java\nclass Main {}\n```",
      notebook: "Computer science",
      subjectId: "s",
    }),
    record("card", "f", "Stack behavior", {
      question: "Which item leaves a stack first?",
      answer: "The last item pushed.",
      collection: "Data structures",
      dueDate: day,
    }),
    record("session", "h", "One focused block", {
      mode: "focus",
      date: day,
      status: "completed",
      actualMinutes: 25,
      duration: 25,
      completedAt: now,
      interruptions: 0,
    }),
    record("attendance", "a", "Classes this week", {
      date: day,
      subjectId: "s",
      attended: 8,
      total: 10,
    }),
    record("grade", "g", "Quiz", {
      date: day,
      subjectId: "s",
      marks: 18,
      maxMarks: 20,
    }),
  ];
  await go(page, "settings/data");
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(fixture)),
  });
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const failures: unknown[] = [];
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    for (const route of [
      "dashboard",
      "planner",
      "java",
      "dsa",
      "competitive",
      "projects",
      "notes",
      "focus",
      "cards",
      "college",
      "analytics",
    ]) {
      await go(page, route);
      if (route === "cards")
        await page.getByRole("button", { name: /Reveal answer/ }).click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      if (result.violations.length)
        failures.push({
          route,
          theme,
          issues: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              message: n.failureSummary,
            })),
          })),
        });
    }
    await go(page, "dashboard");
    await page.screenshot({
      path: `test-results/dashboard-populated-${theme}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "dashboard",
    "planner",
    "java",
    "dsa",
    "competitive",
    "projects",
    "notes",
    "focus",
    "cards",
    "college",
    "analytics",
  ]) {
    await go(page, route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      route,
    ).toBe(true);
  }
  expect(failures).toEqual([]);
});
