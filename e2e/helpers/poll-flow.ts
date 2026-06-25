import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { e2eData } from "./test-data";

export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForSelector("html[data-app-ready='true']", {
    timeout: 30000,
  });
}

export async function waitForCreatePollPage(page: Page): Promise<void> {
  await page.goto("/");
  await waitForAppReady(page);
  await expect(
    page.getByRole("heading", { name: /^create poll$/i }),
  ).toBeVisible();
}

export async function waitForPollPage(page: Page): Promise<void> {
  await waitForAppReady(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export async function createPoll(
  page: Page,
  question: string,
  options: string[],
): Promise<void> {
  await waitForCreatePollPage(page);

  const labeledQuestion = e2eData(question);
  await page.getByLabel(/^question$/i).fill(labeledQuestion);

  const optionInputs = page.locator('input[id^="option-"]');
  for (let index = 0; index < options.length; index += 1) {
    await optionInputs.nth(index).fill(e2eData(options[index]));
  }

  await expect(page.getByLabel(/^question$/i)).toHaveValue(labeledQuestion);
  await page.getByRole("button", { name: /^create poll$/i }).click();
  await page.waitForURL(/\/p\/.+/);
  await waitForPollPage(page);
}
