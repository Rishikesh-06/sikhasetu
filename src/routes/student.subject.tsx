import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/student/subject")({
  component: () => <Outlet />
});
