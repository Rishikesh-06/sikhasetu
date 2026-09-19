import { createFileRoute } from "@tanstack/react-router";
import { TeacherHome } from "@/components/siksha/teacher-views";
export const Route = createFileRoute("/teacher/")({head:()=>({meta:[{title:"Teacher Overview — SIKSHASETU"},{name:"description",content:"See hidden learning differences and take clear action."},{property:"og:title",content:"Teacher Overview — SIKSHASETU"},{property:"og:description",content:"See hidden learning differences and take clear action."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:TeacherHome});
