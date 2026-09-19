import { createFileRoute } from "@tanstack/react-router";
import { StudentHome } from "@/components/siksha/student-views";
export const Route = createFileRoute("/student/")({head:()=>({meta:[{title:"Student Home — SIKSHASETU"},{name:"description",content:"Personalized learning steps and focused practice."},{property:"og:title",content:"Student Home — SIKSHASETU"},{property:"og:description",content:"Personalized learning steps and focused practice."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:StudentHome});
