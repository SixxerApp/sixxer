import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BottomTabBar } from "@/components/BottomTabBar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background">
      <Outlet />
      <BottomTabBar />
    </div>
  );
}
