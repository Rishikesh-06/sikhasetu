import { createFileRoute } from "@tanstack/react-router";
import { TeacherHome } from "@/components/siksha/teacher-views";

export const Route = createFileRoute("/teacher/student/$studentId")({
  head: () => ({
    meta: [
      { title: "Student Evidence — SIKSHASETU" },
      { name: "description", content: "Detailed diagnostic evidence and recommended intervention." },
      { property: "og:title", content: "Student Evidence — SIKSHASETU" },
      { property: "og:description", content: "Detailed diagnostic evidence and recommended intervention." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: TeacherHome
});
