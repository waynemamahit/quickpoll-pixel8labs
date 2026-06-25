import { AppLayout } from "../components/AppLayout";
import { CreatePollForm } from "../components/CreatePollForm";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "QuickPoll — Create" },
    { name: "description", content: "Create an instant live group poll" },
  ];
}

export default function Home(): React.ReactElement {
  return (
    <AppLayout>
      <CreatePollForm />
    </AppLayout>
  );
}
