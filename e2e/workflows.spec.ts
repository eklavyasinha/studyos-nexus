import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptySnapshot, parseBackup, serializeBackup } from "../src/lib/logic";

async function begin(page: Page) {
  await page.goto("/");
  await page.getByLabel("First name (optional)").fill("Alex");
  await page.getByRole("button", { name: "Make this my space" }).click();
  await expect(
    page.getByRole("heading", { name: /Good .*Alex/ }),
  ).toBeVisible();
}
async function go(page: Page, route: string) {
  await page.goto("/#" + route);
  await expect(page.locator("main")).not.toContainText(
    "Loading workspace view",
  );
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open("studyos-nexus", 1);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return new Promise<any>((res, rej) => {
      const req = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("current");
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  });
}
async function saved(page: Page) {
  await expect
    .poll(async () => page.locator(".save-indicator").textContent())
    .not.toContain("Saving");
}
async function createTask(page: Page, title: string) {
  await go(page, "planner/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await saved(page);
}

test("first launch is empty; every module renders at desktop, tablet and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await begin(page);
  expect((await snapshot(page)).items).toHaveLength(0);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  for (const size of [
    { width: 1440, height: 1000 },
    { width: 834, height: 1112 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const route of [
      "dashboard",
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
      await expect(page.locator("main h1")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflow, `${route} overflows at ${size.width}px`).toBe(false);
    }
    await go(page, "dashboard");
    await page.screenshot({
      path: `test-results/dashboard-${size.width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("task create, invalid input, edit, complete, search, persistence and delete", async ({
  page,
}) => {
  await begin(page);
  await go(page, "planner/new");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Give this record a title",
  );
  await page
    .getByLabel("Title", { exact: true })
    .fill("Practice array rotation");
  await expect(page.getByLabel("Repeat after completion")).toHaveValue("none");
  await page.getByLabel("Estimated minutes").fill("30");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await saved(page);
  await page.getByRole("tab", { name: "Agenda", exact: true }).click();
  await page
    .getByRole("button", { name: "Practice array rotation", exact: true })
    .click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Practice array rotation carefully");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Complete: Practice array rotation carefully",
      exact: true,
    })
    .click();
  await saved(page);
  let data = await snapshot(page);
  expect(data.items.filter((i: any) => i.kind === "task")).toHaveLength(1);
  expect(data.items[0].status).toBe("done");
  await page.reload();
  await expect(page.locator("main h1")).toHaveText("Planner");
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search all records and commands" })
    .fill("array rotation carefully");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Practice array rotation carefully",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("tab", { name: "Agenda", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Delete Practice array rotation carefully",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await saved(page);
  data = await snapshot(page);
  expect(data.items.filter((i: any) => i.kind === "task")).toHaveLength(0);
});

test("notes autosave Markdown, pin, archive and survive a reload", async ({
  page,
}) => {
  await begin(page);
  await go(page, "notes/new");
  await page
    .getByLabel("Note title", { exact: true })
    .fill("Understanding recursion");
  await page.getByRole("button", { name: "Create note", exact: true }).click();
  await page
    .getByLabel("Markdown note content")
    .fill(
      "# Recursion\n\n- [x] Base case\n- [ ] Recursive case\n\n<script>window.evil=true</script>",
    );
  await page.getByRole("button", { name: "Pin note", exact: true }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Markdown note content")).toContainText(
    "Base case",
  );
  expect(await page.evaluate(() => !!(window as any).evil)).toBe(false);
  await expect(
    page.getByRole("button", { name: "Unpin note", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Archive note", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore note", exact: true }),
  ).toBeVisible();
});

test("flashcards reveal, rate, schedule and persist history", async ({
  page,
}) => {
  await begin(page);
  await go(page, "cards/new");
  await page.getByLabel("Short title").fill("Stack ordering");
  await page
    .getByLabel("Question / front")
    .fill("What order does a stack use?");
  await page.getByLabel("Answer / back").fill("**Last in, first out.**");
  await page.getByRole("button", { name: "Create card", exact: true }).click();
  await page.getByRole("button", { name: /Reveal answer/ }).click();
  await page.getByRole("button", { name: /Easy/ }).click();
  await saved(page);
  const data = await snapshot(page);
  const card = data.items.find((i: any) => i.kind === "card");
  expect(card.interval).toBe(4);
  expect(card.reviews).toBe(1);
  expect(card.reviewHistory).toHaveLength(1);
  expect(data.items.filter((i: any) => i.kind === "review")).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("focus timer pauses, resumes through refresh and logs only actual time once", async ({
  page,
}) => {
  await begin(page);
  await go(page, "focus");
  await page.getByRole("button", { name: "Start focus", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Pause focus", exact: true }).click();
  await saved(page);
  const paused = await snapshot(page);
  expect(paused.timer.elapsed).toBeGreaterThan(0);
  expect(paused.timer.running).toBe(false);
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.waitForTimeout(1100);
  await page
    .getByRole("button", { name: "Complete & log actual time", exact: true })
    .click();
  await saved(page);
  let data = await snapshot(page);
  expect(data.items.filter((i: any) => i.kind === "session")).toHaveLength(1);
  const session = data.items.find((i: any) => i.kind === "session");
  expect(session.actualMinutes).toBeGreaterThan(0);
  expect(session.actualMinutes).toBeLessThan(0.3);
  expect(session.interruptions).toBe(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start break", exact: true }),
  ).toBeVisible();
  data = await snapshot(page);
  expect(data.items.filter((i: any) => i.kind === "session")).toHaveLength(1);
});

test("exports, rejects malformed imports, merges, resets and recovers safely", async ({
  page,
}) => {
  await begin(page);
  await createTask(page, "Keep this task safe");
  await go(page, "settings/data");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export complete backup", exact: true })
    .click();
  const backup = await downloaded;
  expect(backup.suggestedFilename()).toMatch(/studyos-nexus.*json/);
  const chunks: Buffer[] = [];
  for await (const chunk of (await backup.createReadStream())!)
    chunks.push(Buffer.from(chunk));
  const exported = parseBackup(Buffer.concat(chunks).toString());
  expect(exported.items[0].title).toBe("Keep this task safe");
  expect(exported.settings.name).toBe("Alex");
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"oops":true}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "existing data has not changed",
  );
  expect((await snapshot(page)).items).toHaveLength(1);
  const incoming = emptySnapshot();
  incoming.items = [
    {
      id: "import-test",
      kind: "note",
      title: "Imported local note",
      body: "Hello backup",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(incoming)),
  });
  await expect(
    page.getByRole("dialog", { name: "Review your backup" }),
  ).toBeVisible();
  expect((await snapshot(page)).items).toHaveLength(1);
  await page.getByRole("button", { name: "Continue to confirmation" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await snapshot(page)).items).toHaveLength(2);
  await page
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await page.getByLabel("Type RESET").fill("RESET");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await snapshot(page)).items).toHaveLength(0);
  await page
    .getByRole("button", { name: "Restore recovery copy", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((await snapshot(page)).items).toHaveLength(2);
});

test("theme, layout customization, mobile menu and multi-tab protection", async ({
  page,
  context,
}) => {
  await begin(page);
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await saved(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByLabel("Learning paths", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your learning paths", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByRole("link", { name: "Planner", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText("Planner");
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText(/Read-only tab: another tab owns editing/),
  ).toBeVisible();
  await second.close();
});

test("core dashboard and editor meet automated accessibility checks in both themes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await begin(page);
  for (const theme of ["dark", "light"]) {
    if (theme === "light")
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      theme,
    ).toEqual([]);
  }
  await go(page, "planner/new");
  await expect(page.getByRole("dialog")).toBeVisible();
  const editor = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    editor.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("calendar detects actual overlapping time blocks and supports all views", async ({
  page,
}) => {
  await begin(page);
  await go(page, "planner");
  for (const [title, start, end] of [
    ["Algorithms lecture", "09:00", "10:00"],
    ["Graph practice", "09:30", "10:30"],
  ]) {
    await page.getByRole("button", { name: "Add event", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Title", { exact: true })
      .fill(title);
    await page
      .getByRole("dialog")
      .getByLabel("Start time", { exact: true })
      .fill(start);
    await page
      .getByRole("dialog")
      .getByLabel("End time", { exact: true })
      .fill(end);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Create event", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(
    page.getByText("Conflict", { exact: true }).first(),
  ).toBeVisible();
  for (const view of ["Day", "Month", "Agenda", "Week"]) {
    await page.getByRole("tab", { name: view, exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Calendar and tasks" })
        .getByRole("button", { name: /^(?:09:00\s*)?Algorithms lecture$/ }),
    ).toBeVisible();
  }
});

test("core app makes no external requests and playground blocks network and storage access", async ({
  page,
  baseURL,
}) => {
  const external: string[] = [];
  const expectedOrigin = new URL(baseURL!).origin;
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== expectedOrigin
    )
      external.push(request.url());
  });
  await begin(page);
  for (const route of ["java", "web", "notes", "analytics", "settings"])
    await go(page, route);
  await go(page, "web");
  await page
    .getByLabel("HTML source", { exact: true })
    .fill(
      '<p id="proof">Checking</p><img src="https://example.com/tracker.png"><script>top.document.body.innerHTML="unsafe"</script>',
    );
  await page.getByRole("tab", { name: "JavaScript", exact: true }).click();
  await page
    .getByLabel("JavaScript source", { exact: true })
    .fill(
      'let blockedStorage=false; try {localStorage.getItem("anything")} catch {blockedStorage=true} fetch("https://example.com/private").catch(()=>{document.querySelector("#proof").textContent=blockedStorage?"Storage and network blocked":"Unsafe"});',
    );
  await page.getByRole("button", { name: "Run preview", exact: true }).click();
  const inner = page
    .frameLocator(
      'iframe[title="Isolated HTML CSS JavaScript browser preview"]',
    )
    .frameLocator('iframe[title="Isolated experiment document"]');
  await expect(
    inner.getByText("Storage and network blocked", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("main h1")).toHaveText("Make something real.");
  expect(external).toEqual([]);
});
