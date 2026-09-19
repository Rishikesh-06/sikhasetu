import { createFileRoute } from "@tanstack/react-router";
import { TeacherReports } from "@/components/siksha/teacher-views";

export const Route = createFileRoute("/teacher/class")({
  head: () => ({
    meta: [
      { title: "Detailed Reports — SIKSHASETU" },
      { name: "description", content: "Multi-dimensional growth and diagnostic reports across classrooms." },
      { property: "og:title", content: "Detailed Reports — SIKSHASETU" },
      { property: "og:description", content: "Multi-dimensional growth and diagnostic reports across classrooms." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: TeacherReports
});
