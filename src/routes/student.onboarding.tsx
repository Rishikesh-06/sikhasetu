import { createFileRoute } from "@tanstack/react-router";
import { StudentDiagnostic } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/onboarding")({
  head: () => ({
    meta: [
      { title: "Student Diagnostic Onboarding — SIKSHASETU" },
      { name: "description", content: "Adaptive diagnostic onboarding to map demonstrated readiness." },
      { property: "og:title", content: "Student Diagnostic Onboarding — SIKSHASETU" },
      { property: "og:description", content: "Adaptive diagnostic onboarding to map demonstrated readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentDiagnostic
});
