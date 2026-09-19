import { createFileRoute } from "@tanstack/react-router";
import { StudentDisha } from "@/components/siksha/student-disha";

export const Route = createFileRoute("/student/disha")({
  head: () => ({
    meta: [
      { title: "DISHA — AI PDF Learning Companion | SIKHASETU" },
      { name: "description", content: "Upload your notes, textbooks, or study PDFs. Disha turns them into a personalized, grounded AI tutor." },
      { property: "og:title", content: "DISHA — AI PDF Learning Companion | SIKHASETU" },
      { property: "og:description", content: "Upload your notes, textbooks, or study PDFs. Disha turns them into a personalized, grounded AI tutor." },
      { property: "og:type", content: "website" }
    ]
  }),
  component: StudentDisha
});
