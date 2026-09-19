import { createFileRoute } from "@tanstack/react-router";
import { StudentSubjectProgress } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/subject/$topic")({
  head: () => ({
    meta: [
      { title: "Topic Progress — SIKSHASETU" },
      { name: "description", content: "Detailed skill evidence and recommended practice." },
      { property: "og:title", content: "Topic Progress — SIKSHASETU" },
      { property: "og:description", content: "Detailed skill evidence and recommended practice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentSubjectProgress
});
