import * as Sentry from "@sentry/react";
import * as React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function AppErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary fallback={<FallbackUi />} showDialog={false}>
      {children}
    </Sentry.ErrorBoundary>
  );
}

function FallbackUi() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ve logged the error. Try refreshing, or head back home.
        </p>
        <a
          href="/"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
