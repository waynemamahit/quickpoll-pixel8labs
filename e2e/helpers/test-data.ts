const E2E_PREFIX = "from Playwright-E2E";

export function e2eData(value: string): string {
  return `${E2E_PREFIX} ${value}`;
}

export function e2eEmail(name: string): string {
  return `playwright-e2e-${name}@test.local`;
}
