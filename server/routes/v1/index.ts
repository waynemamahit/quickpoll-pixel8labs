import { Hono } from "hono/tiny";
import type { Counter } from "../../durable_objects/counter.do";

const apiV1 = new Hono<{
  Bindings: {
    DO_COUNTER: DurableObjectNamespace<Counter>;
  } & Env;
}>();

apiV1.get("/", async (c) => {
  return c.json({ message: "Data from API!" });
});

apiV1.get("/counter", async (c) => {
  const env = c.env;
  const id = env.DO_COUNTER.idFromName("counter");
  const stub = env.DO_COUNTER.get(id);
  const counterValue = await stub.getCounterValue();
  return c.text(counterValue.toString());
});

apiV1.get("/counter/increment", async (c) => {
  const env = c.env;
  const id = env.DO_COUNTER.idFromName("counter");
  const stub = env.DO_COUNTER.get(id);
  const value = await stub.increment();
  return c.text(value.toString());
});

apiV1.get("/counter/decrement", async (c) => {
  const env = c.env;
  const id = env.DO_COUNTER.idFromName("counter");
  const stub = env.DO_COUNTER.get(id);
  const value = await stub.decrement();
  return c.text(value.toString());
});

export default apiV1;
