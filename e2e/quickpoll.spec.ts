import { expect, test } from "@playwright/test";
import { createPoll, waitForAppReady } from "./helpers/poll-flow";
import { e2eData } from "./helpers/test-data";

test("create poll and live vote updates second viewer", async ({
  browser,
  page,
}) => {
  await createPoll(page, "Where to eat?", ["Pizza", "Sushi"]);

  const pollUrl = page.url().split("#")[0];
  const context2 = await browser.newContext();
  const viewer = await context2.newPage();
  await viewer.goto(pollUrl);
  await waitForAppReady(viewer);
  await expect(viewer.getByText(/no votes yet/i)).toBeVisible();

  await page.getByRole("button", { name: e2eData("Pizza") }).click();
  await expect(viewer.getByText(/^1 vote$/i)).toBeVisible({ timeout: 10000 });
  await expect(
    viewer.getByText(new RegExp(`${e2eData("Pizza")}.*1 \\(100%\\)`)),
  ).toBeVisible();

  await context2.close();
});

test("blocks double vote", async ({ page }) => {
  await createPoll(page, "Double vote test", ["A", "B"]);

  await page.getByRole("button", { name: e2eData("A") }).click();
  await expect(page.getByText(/you voted/i)).toBeVisible();
  await expect(page.getByRole("button", { name: e2eData("B") })).toHaveCount(0);
});

test("creator closes poll", async ({ browser, page }) => {
  await createPoll(page, "Close test", ["X", "Y"]);
  await page.waitForURL(/\/p\/.+#c=/);

  await page.getByRole("button", { name: /^close poll$/i }).click();
  await expect(page.getByText(/this poll is closed|closed/i)).toBeVisible();

  const pollUrl = page.url().split("#")[0];
  const context2 = await browser.newContext();
  const voter = await context2.newPage();
  await voter.goto(pollUrl);
  await waitForAppReady(voter);
  await expect(voter.getByText(/this poll is closed|closed/i)).toBeVisible();
  await context2.close();
});

test("bogus poll id shows not found", async ({ page }) => {
  await page.goto("/p/00000000-0000-0000-0000-000000000099");
  await waitForAppReady(page);
  await expect(
    page.getByRole("heading", { name: /poll not found/i }),
  ).toBeVisible();
});
