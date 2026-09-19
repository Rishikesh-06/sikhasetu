import { createFileRoute } from "@tanstack/react-router";
import { TeacherHome } from "@/components/siksha/teacher-views";

export const Route = createFileRoute("/teacher/groups")({
  head: () => ({
    meta: [
      { title: "Suggested Learning Groups — SIKSHASETU" },
      { name: "description", content: "Learning groups based on shared needs, not rank." },
      { property: "og:title", content: "Suggested Learning Groups — SIKSHASETU" },
      { property: "og:description", content: "Learning groups based on shared needs, not rank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: TeacherHome
});
