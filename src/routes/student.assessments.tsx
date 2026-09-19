import { createFileRoute } from "@tanstack/react-router";
import { StudentAdaptiveAssessments } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/assessments")({
  head: () => ({
    meta: [
      { title: "Adaptive Assessments — SIKSHASETU" },
      { name: "description", content: "Teacher assigned personalized adaptive checks." },
      { property: "og:title", content: "Adaptive Assessments — SIKSHASETU" },
      { property: "og:description", content: "Teacher assigned personalized adaptive checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentAdaptiveAssessments
});
