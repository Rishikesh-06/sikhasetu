import { createFileRoute } from "@tanstack/react-router";
import { StudentPracticeAndQuizzes } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/practice/")({
  head: () => ({
    meta: [
      { title: "Practice & Quizzes — SIKSHASETU" },
      { name: "description", content: "Focused practice selected from recent learning evidence and quiz challenges." },
      { property: "og:title", content: "Practice & Quizzes — SIKSHASETU" },
      { property: "og:description", content: "Focused practice selected from recent learning evidence and quiz challenges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentPracticeAndQuizzes
});
