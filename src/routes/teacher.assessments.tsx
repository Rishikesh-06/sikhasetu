import { createFileRoute } from "@tanstack/react-router";
import { TeacherAdaptiveAssessment } from "@/components/siksha/teacher-views";

export const Route = createFileRoute("/teacher/assessments")({
  head: () => ({
    meta: [
      { title: "Adaptive Assessment Engine — SIKSHASETU" },
      { name: "description", content: "Create ONE curriculum assessment -> Backend auto-generates 3-way personalized question sets with Grok AI." },
      { property: "og:title", content: "Adaptive Assessment Engine — SIKSHASETU" },
      { property: "og:description", content: "Create ONE curriculum assessment -> Backend auto-generates 3-way personalized question sets with Grok AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: TeacherAdaptiveAssessment
});
