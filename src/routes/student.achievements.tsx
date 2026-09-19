import { createFileRoute } from "@tanstack/react-router";
import { StudentAchievements } from "@/components/siksha/student-views";

export const Route = createFileRoute("/student/achievements")({
  head: () => ({
    meta: [
      { title: "Student Achievements & Trophy Room — SIKSHASETU" },
      { name: "description", content: "Earn badges, level up, and track your milestone learning streak." },
      { property: "og:title", content: "Student Achievements — SIKSHASETU" },
      { property: "og:description", content: "Earn badges, level up, and track your milestone learning streak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  }),
  component: StudentAchievements
});
