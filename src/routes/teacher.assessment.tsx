import { createFileRoute } from "@tanstack/react-router";
import { TeacherAdaptiveAssessment } from "@/components/siksha/teacher-views";

export const Route = createFileRoute("/teacher/assessment")({
  head: () => ({
    meta: [
      { title: "Adaptive Assessments — SIKSHASETU" },
      { name: "description", content: "Create 1 assessment to automatically assign 3 personalized difficulty tiers." },
      { property: "og:title", content: "Adaptive Assessments — SIKSHASETU" },
      { property: "og:description", content: "Create 1 assessment to automatically assign 3 personalized difficulty tiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: TeacherAdaptiveAssessment
});
