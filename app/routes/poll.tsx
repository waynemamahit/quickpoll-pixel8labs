import { requestContainerContext } from "../../server/containers";
import type { IPollService } from "../../server/types/poll.types";
import type { PollSnapshot } from "../../shared/types/poll.types";
import { AppLayout } from "../components/AppLayout";
import { PollNotFound, PollPage } from "../components/PollPage";
import type { Route } from "./+types/poll";

export function meta({ loaderData }: Route.MetaArgs) {
  const title = loaderData?.poll?.question ?? "Poll";
  return [{ title: `QuickPoll — ${title}` }];
}

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const scope = context.get(requestContainerContext);
  if (scope && params.id) {
    const pollService = scope.resolve<IPollService>("pollService");
    const poll = await pollService.getSnapshot(params.id);
    return { poll };
  }

  // Fallback when Cloudflare context is unavailable (e.g. some test harnesses).
  const url = new URL(request.url);
  const response = await fetch(`${url.origin}/api/v1/polls/${params.id}`);

  if (response.status === 404) {
    return { poll: null };
  }

  if (!response.ok) {
    throw new Response("Failed to load poll", { status: response.status });
  }

  const poll = (await response.json()) as PollSnapshot;
  return { poll };
}

export default function PollRoute({ loaderData }: Route.ComponentProps) {
  if (!loaderData.poll) {
    return (
      <AppLayout>
        <PollNotFound />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PollPage initialPoll={loaderData.poll} />
    </AppLayout>
  );
}
