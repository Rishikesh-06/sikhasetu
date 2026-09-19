import { createFileRoute } from "@tanstack/react-router";
import { StudentDiagnostic } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/diagnostic")({
  head: () => ({
    meta: [
      { title: "Class-Specific Adaptive Diagnostic — SIKSHASETU" },
      { name: "description", content: "Adaptive baseline learning check for declared class level." },
      { property: "og:title", content: "Class-Specific Adaptive Diagnostic — SIKSHASETU" },
      { property: "og:description", content: "Adaptive baseline learning check for declared class level." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentDiagnostic
});
