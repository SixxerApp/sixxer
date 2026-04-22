import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import * as React from "react";

export function PageHeader({
  title,
  subtitle,
  back = true,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-2 flex items-center gap-3 border-b border-border bg-background/85 px-5 py-3 backdrop-blur-lg">
      {back ? (
        typeof back === "string" ? (
          <Link
            to={back}
            className="-ml-2 grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            onClick={() => router.history.back()}
            className="-ml-2 grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
