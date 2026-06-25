import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "vitest" {
  interface Assertion<T = unknown> extends jest.Matchers<void, T> {}

  interface AsymmetricMatchersContaining extends jest.Matchers<void, unknown> {}
}

declare global {
  namespace jest {
    interface Matchers<R = void, T = unknown>
      extends TestingLibraryMatchers<T, R> {}
  }
}
