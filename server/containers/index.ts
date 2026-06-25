import {
  type AwilixContainer,
  asClass,
  asValue,
  createContainer,
} from "awilix";
import type { Context, Next } from "hono";
import { createContext } from "react-router";
import { PollEngine } from "../engines/poll.engine";
import { LoggerService } from "../services/logger.service";
import { PollService } from "../services/poll.service";
import type { ILoggerService } from "../types/logger.types";
import type { IPollEngine, IPollService } from "../types/poll.types";

export interface AppCradle {
  env: Env;
  loggerService: ILoggerService;
  pollService: IPollService;
  pollEngine: IPollEngine;
}

export type AppContainer = AwilixContainer<AppCradle>;

export const requestContainerContext = createContext<AppContainer>();

let rootContainer: AppContainer | undefined;

export function getAppContainer(env: Env): AppContainer {
  if (!rootContainer) {
    rootContainer = createAppContainer(env);
  }
  return rootContainer;
}

export function createAppContainer(env: Env): AppContainer {
  const container = createContainer<AppCradle>();

  container.register({
    env: asValue(env),
    loggerService: asClass(LoggerService).scoped(),
    pollService: asClass(PollService).scoped(),
    pollEngine: asClass(PollEngine).scoped(),
  });

  return container;
}

export function createRequestScope(root: AppContainer, env: Env): AppContainer {
  const scope = root.createScope();
  scope.register({ env: asValue(env) });
  return scope;
}

export function setupRequestContainer(
  env: Env,
  correlationId?: string,
): { scope: AppContainer; correlationId: string } {
  const id = correlationId ?? crypto.randomUUID();
  const scope = createRequestScope(getAppContainer(env), env);
  const logger = scope.resolve<ILoggerService>("loggerService");
  logger.setCorrelationId(id);
  return { scope, correlationId: id };
}

declare module "hono" {
  interface ContextVariableMap {
    container: AppContainer;
    correlationId: string;
  }
}

export function containerMiddleware() {
  return async (c: Context, next: Next): Promise<void> => {
    const { scope, correlationId } = setupRequestContainer(
      c.env,
      c.req.header("x-correlation-id") ?? undefined,
    );
    c.set("container", scope);
    c.set("correlationId", correlationId);
    await next();
  };
}

export function getEngine(c: Context): IPollEngine {
  return c.get("container").resolve<IPollEngine>("pollEngine");
}

export function getLogger(c: Context): ILoggerService {
  return c.get("container").resolve<ILoggerService>("loggerService");
}
