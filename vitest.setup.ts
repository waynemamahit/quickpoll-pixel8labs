import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";

interface MockResponse {
  ok?: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

type PatternMatcher = string | RegExp | ((url: string) => boolean);

interface PatternResponse {
  pattern: PatternMatcher;
  response: MockResponse;
}

const mockResponses = new Map<string, MockResponse>();
const patternResponses: PatternResponse[] = [];
const defaultResponses = new Map<PatternMatcher, MockResponse>();

export function mockFetchResponse(url: string, response: MockResponse) {
  mockResponses.set(url, response);
}

export function mockFetchPattern(
  pattern: PatternMatcher,
  response: MockResponse,
) {
  patternResponses.push({ pattern, response });
}

export function setDefaultFetchResponse(
  pattern: PatternMatcher,
  response: MockResponse,
) {
  defaultResponses.set(pattern, response);
}

export function clearFetchMocks() {
  mockResponses.clear();
  patternResponses.length = 0;
}

function matchesPattern(url: string, pattern: PatternMatcher): boolean {
  if (typeof pattern === "string") {
    return url === pattern || url.includes(pattern);
  }
  if (pattern instanceof RegExp) {
    return pattern.test(url);
  }
  if (typeof pattern === "function") {
    return pattern(url);
  }
  return false;
}

function findMatchingResponse(url: string): MockResponse | null {
  const exactMatch = mockResponses.get(url);
  if (exactMatch) return exactMatch;

  for (const { pattern, response } of patternResponses) {
    if (matchesPattern(url, pattern)) return response;
  }

  for (const [pattern, response] of defaultResponses) {
    if (matchesPattern(url, pattern)) return response;
  }

  return null;
}

beforeEach(() => {
  clearFetchMocks();

  setDefaultFetchResponse(/\/api\/v1\/drawings/, {
    ok: true,
    status: 200,
    data: { drawings: [] },
  });

  global.fetch = vi.fn((url) => {
    const urlString = url.toString();
    const mock = findMatchingResponse(urlString);

    if (mock) {
      return Promise.resolve({
        ok: mock.ok ?? true,
        status: mock.status ?? 200,
        json: () => Promise.resolve(mock.data),
      } as Response);
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Not Found" }),
    } as Response);
  });
});
