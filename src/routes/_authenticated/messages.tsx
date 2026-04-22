import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Chat — Pitchside" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="px-5 pb-6 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Chat</h1>
      <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold">Team chat is coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;re building this. For now use Posts in your group to send updates.
        </p>
      </div>
    </div>
  );
}
