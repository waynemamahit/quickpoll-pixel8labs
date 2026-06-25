import { env } from "cloudflare:workers";

import { useNavigate } from "react-router";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "New React Router App | Home" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader() {
  return { message: env.VALUE_FROM_CLOUDFLARE };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();

  return (
    <Welcome message={loaderData.message}>
      <button
        className="mx-auto"
        type="button"
        onClick={() => navigate("/about")}
      >
        Go to About
      </button>
    </Welcome>
  );
}
