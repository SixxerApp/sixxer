import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/groups/$teamId/polls")({
  component: PollsTab,
});

function PollsTab() {
  return (
    <EmptyState
      icon={<BarChart3 className="h-5 w-5" />}
      title="Polls coming soon"
      body="Quickly check team preferences for kit, training nights, or end-of-season dinners."
    />
  );
}
