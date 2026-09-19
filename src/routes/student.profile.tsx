import { createFileRoute } from "@tanstack/react-router";
import { StudentLearningPath } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "Learning Path — SIKSHASETU" },
      { name: "description", content: "Visual knowledge map and curriculum progression constellation." },
      { property: "og:title", content: "Learning Path — SIKSHASETU" },
      { property: "og:description", content: "Visual knowledge map and curriculum progression constellation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentLearningPath
});
