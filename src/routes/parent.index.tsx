import { createFileRoute } from "@tanstack/react-router";
import { ParentHome } from "@/components/siksha/parent-view";
export const Route = createFileRoute("/parent/")({head:()=>({meta:[{title:"Learning Journey — SIKSHASETU"},{name:"description",content:"A reassuring view of meaningful learning progress."},{property:"og:title",content:"Learning Journey — SIKSHASETU"},{property:"og:description",content:"A reassuring view of meaningful learning progress."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:ParentHome});
