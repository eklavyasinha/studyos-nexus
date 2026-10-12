import { test, expect } from "@playwright/test";

// These checks require the production-only static preview, not Vite's dev server.
test.skip(
  process.env.STUDYOS_SECURE_PREVIEW !== "1",
  "Run npm run test:production for real production headers and fallback checks.",
);

test("production artifacts have compatible CSP/security headers and exclude private development files", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  );
  expect(response.headers()["content-security-policy"]).toContain(
    "connect-src 'self'",
  );
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  for (const file of [
    "/.env",
    "/src/main.tsx",
    "/.tools/node/bin/node",
    "/package-lock.json",
  ])
    expect((await request.get(file)).status()).toBe(404);
  expect((await request.get("/assets/missing.js")).status()).toBe(404);
});

test("production SPA fallback, hash navigation and refresh load the upgraded schedule", async ({
  page,
  request,
}) => {
  const fallback = await request.get("/study/future");
  expect(fallback.status()).toBe(200);
  expect(await fallback.text()).toContain('<div id="root">');
  await page.goto("/");
  await page
    .getByRole("button", { name: "Make this my space", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".save-indicator")).not.toContainText("Saving");
  await page.goto("/study/future#schedule/date-2026-10-11");
  await expect(
    page.getByRole("heading", { name: "Study schedule", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply starting schedule", exact: true })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Scaffold applied", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Web ·/).first()).toBeVisible();
});
