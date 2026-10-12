import { test, expect, type Page } from "@playwright/test";
import type { Item, Snapshot } from "../src/lib/types";
import { installationValues } from "../src/pages/study-schedule-helpers";

const DATE = "2026-10-12";
const STAMP = "2026-10-11T10:00:00.000Z";
const primaryTitle = "Interaction test: independent practice";

function record(id: string, values: Partial<Item>): Item {
  return {
    id,
    kind: "task",
    title: id,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...values,
  };
}

function fixtureItems() {
  const task = {
    dueDate: DATE,
    course: "interaction-test",
    stage: "Independent practice",
    status: "todo",
    priority: "Medium",
    duration: 30,
    completionCriteria: "Keep an independently checked result.",
    description: "Synthetic test data, never the personal browser workspace.",
    milestone: "Keep the existing plan unchanged.",
  };
  return [
    record("installation", { kind: "goal", ...installationValues() }),
    record("practice", {
      ...task,
      title: primaryTitle,
      scheduleId: "study-schedule-v2-interaction-practice",
      startTime: "17:30",
      endTime: "18:00",
      topicId: "linked-topic",
      originalDate: "2026-10-11",
      rescheduleCount: 1,
      body: "Notes kept.\n\nReschedule history:\n2026-10-11 → 2026-10-12",
    }),
    record("neighbour", {
      ...task,
      title: "Untouched neighbouring task",
      scheduleId: "study-schedule-v2-interaction-neighbour",
      startTime: "18:00",
      endTime: "18:30",
    }),
    record("gated-done", {
      ...task,
      title: "Previously completed gated practice",
      scheduleId: "study-schedule-v2-interaction-gated",
      startTime: "21:00",
      endTime: "21:30",
      status: "done",
      completedAt: STAMP,
      requiresGate: "leetcode",
    }),
    record("linked-topic", {
      kind: "topic",
      title: "Preserved linked course topic",
      status: "learning",
      body: "Existing notes and evidence must remain unchanged.",
    }),
    record("preserved-note", { kind: "note", body: "Keep this note." }),
  ];
}

async function savedSnapshot(page: Page): Promise<Snapshot> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("studyos-nexus", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Snapshot>((resolve, reject) => {
        const request = db
          .transaction("workspace")
          .objectStore("workspace")
          .get("current");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

async function openSyntheticSchedule(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Make this my space" }).click();
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  await page.evaluate(async (items) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("studyos-nexus", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("workspace", "readwrite");
    const store = tx.objectStore("workspace");
    const request = store.get("current");
    request.onsuccess = () =>
      store.put({ ...request.result, items }, "current");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, fixtureItems());
  await page.reload();
  await page.goto(`/#schedule/date-${DATE}`);
  await expect(
    page.getByRole("button", {
      name: `Complete: ${primaryTitle}`,
      exact: true,
    }),
  ).toBeEnabled();
}

function practiceCard(page: Page) {
  return page.locator(".schedule-record").filter({
    has: page.getByRole("button", { name: primaryTitle, exact: true }),
  });
}

test("schedule completion has an easy-to-hit target", async ({ page }) => {
  await openSyntheticSchedule(page);
  const card = practiceCard(page);
  const completion = practiceCard(page).locator(".schedule-check");
  const size = await completion.evaluate((button) => ({
    width: button.clientWidth,
    height: button.clientHeight,
  }));
  expect(size.width).toBeGreaterThanOrEqual(24);
  expect(size.height).toBeGreaterThanOrEqual(24);
  await expect(card).toHaveCSS("cursor", "default");
  await expect(completion).toHaveCSS("cursor", "pointer");
});

test("schedule hover keeps completion hit targets stationary", async ({
  page,
}) => {
  await openSyntheticSchedule(page);
  const card = practiceCard(page);
  const completion = card.locator(".schedule-check");
  await completion.scrollIntoViewIfNeeded();
  await completion.hover();
  await expect
    .poll(() => card.evaluate((element) => getComputedStyle(element).transform))
    .toBe("none");
});

test("schedule can reopen completed work after its readiness gate closes", async ({
  page,
}) => {
  await openSyntheticSchedule(page);
  const completion = page.getByRole("button", {
    name: "Mark incomplete: Previously completed gated practice",
    exact: true,
  });
  await expect(completion).toBeEnabled();
  await completion.focus();
  await completion.press("Space");
  await expect
    .poll(
      async () =>
        (await savedSnapshot(page)).items.find(
          (item) => item.id === "gated-done",
        )?.status,
    )
    .toBe("todo");
});

test("completion toggles only its task and stays separate from editing on desktop and mobile", async ({
  page,
}) => {
  await openSyntheticSchedule(page);
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const card = practiceCard(page);
    const completion = card.locator(".schedule-check");

    await completion.click();
    await expect
      .poll(
        async () =>
          (await savedSnapshot(page)).items.find(
            (item) => item.id === "practice",
          )?.status,
      )
      .toBe("done");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const afterComplete = await savedSnapshot(page);
    expect(
      afterComplete.items.find((item) => item.id === "neighbour")?.status,
    ).toBe("todo");
    expect(
      afterComplete.items.find((item) => item.id === "linked-topic")?.status,
    ).toBe("learning");
    expect(
      afterComplete.items.find((item) => item.id === "preserved-note")?.body,
    ).toBe("Keep this note.");

    await completion.dblclick();
    await expect
      .poll(
        async () =>
          (await savedSnapshot(page)).items.find(
            (item) => item.id === "practice",
          )?.status,
      )
      .toBe("done");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await completion.click();
    await expect
      .poll(
        async () =>
          (await savedSnapshot(page)).items.find(
            (item) => item.id === "practice",
          )?.status,
      )
      .toBe("todo");

    await card.getByRole("button", { name: primaryTitle, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("heading", {
        name: "Edit schedule item",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
