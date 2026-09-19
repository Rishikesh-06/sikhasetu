import { createFileRoute } from "@tanstack/react-router";
import { StudentAITutor } from "@/components/siksha/student-ai-tutor";

export const Route = createFileRoute("/student/ai-tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — SIKSHASETU" },
      { name: "description", content: "Your 24/7 personal learning companion for Mathematics, Science, English, and concept mastery." },
      { property: "og:title", content: "AI Tutor — SIKSHASETU" },
      { property: "og:description", content: "Your 24/7 personal learning companion for Mathematics, Science, English, and concept mastery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentAITutor
});
