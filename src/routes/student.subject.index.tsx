import { createFileRoute } from "@tanstack/react-router";
import { StudentSubjectProgress } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/subject/")({
  head: () => ({
    meta: [
      { title: "Subject Progress — SIKSHASETU" },
      { name: "description", content: "Student subject-wise progress and learning path." },
      { property: "og:title", content: "Subject Progress — SIKSHASETU" },
      { property: "og:description", content: "Student subject-wise progress and learning path." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentSubjectProgress
});
