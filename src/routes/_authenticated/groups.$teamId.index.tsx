import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/groups/$teamId/")({
  component: TeamIndex,
});

function TeamIndex() {
  const { teamId } = useParams({ from: "/_authenticated/groups/$teamId/" });
  return <Navigate to="/groups/$teamId/events" params={{ teamId }} />;
}
