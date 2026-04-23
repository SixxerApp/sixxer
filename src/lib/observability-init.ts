import * as Sentry from "@sentry/react";

// Zero-config crash capture. Stays a no-op unless VITE_SENTRY_DSN is set so
// local + CI builds never accidentally report to a project we don't own.

let initialized = false;

export function initObservability() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Keep ingestion cheap on the free tier; crank these up when we have real
    // traffic to learn from.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Strip likely-PII fields from reported events.
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
      }
      return event;
    },
  });

  initialized = true;
}
