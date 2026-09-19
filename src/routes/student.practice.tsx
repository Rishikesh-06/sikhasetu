import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/student/practice")({
  component: () => <Outlet />
});
