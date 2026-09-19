import { createFileRoute } from "@tanstack/react-router";
import { StudentPracticeDetails } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/practice/$practiceId")({
  head: () => ({
    meta: [
      { title: "Practice Session — SIKSHASETU" },
      { name: "description", content: "Interactive practice and assessment runner." },
      { property: "og:title", content: "Practice Session — SIKSHASETU" },
      { property: "og:description", content: "Interactive practice and assessment runner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentPracticeDetails
});
