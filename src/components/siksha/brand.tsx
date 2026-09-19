import { Link } from "@tanstack/react-router";
export function Brand({compact=false}:{compact?:boolean}){
 return <Link to="/" aria-label="SIKHASETU home" className="group inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
   <span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>
   {!compact && <span><span className="block font-sans text-[15px] font-bold leading-none text-foreground">SIKHASETU</span><span className="mt-1 block text-[8px] font-semibold uppercase text-muted-foreground">Learning intelligence</span></span>}
 </Link>;
}
