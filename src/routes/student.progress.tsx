import { createFileRoute } from "@tanstack/react-router";
import { StudentSubjectProgress } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/progress")({
  head: () => ({
    meta: [
      { title: "Subject-wise Progress — SIKSHASETU" },
      { name: "description", content: "Curriculum mastery and sub-skill evidence." },
      { property: "og:title", content: "Subject-wise Progress — SIKSHASETU" },
      { property: "og:description", content: "Curriculum mastery and sub-skill evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentSubjectProgress
});
