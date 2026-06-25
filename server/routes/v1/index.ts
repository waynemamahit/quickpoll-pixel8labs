import { Hono } from "hono/tiny";
import polls from "./polls";

const apiV1 = new Hono<{ Bindings: Env }>();

apiV1.route("/polls", polls);

export default apiV1;
