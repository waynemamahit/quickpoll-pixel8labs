import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/p/:id", "routes/poll.tsx"),
  route("/about", "routes/about.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
