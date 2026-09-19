import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { useEffect } from "react";

export const Route = createFileRoute("/parent")({
  component: ParentGuardLayout
});

function ParentGuardLayout() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate({ to: "/login" });
      } else if (user.role !== "parent") {
        navigate({ to: user.role === "student" ? "/student" : "/teacher" });
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-muted-foreground">Loading SIKHASETU...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "parent") {
    return null;
  }

  return <Outlet />;
}
