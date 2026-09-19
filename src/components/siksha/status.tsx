import { Check, CircleDot, Sprout, Target, LucideIcon } from "lucide-react";
import type { MasteryStatus } from "@/data/types";
import { cn } from "@/lib/utils";

export type Status = MasteryStatus | "Ready for Challenge";

const styles: Record<Status, string> = {
  Strong: "bg-success-soft text-success",
  Good: "bg-info-soft text-info",
  Developing: "bg-warning-soft text-warning",
  "Needs Support": "bg-support-soft text-support",
  "Ready for Challenge": "bg-accent text-accent-foreground",
};

const icons: Record<Status, LucideIcon> = {
  Strong: Check,
  Good: CircleDot,
  Developing: Sprout,
  "Needs Support": Target,
  "Ready for Challenge": Check,
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const Icon = icons[status] || CircleDot;
  return (
    <span className={cn("inline-flex items-center gap-2 border-l-2 px-2.5 py-1 text-xs font-semibold", styles[status] || "bg-muted text-muted-foreground", className)}>
      <Icon className="size-3.5" aria-hidden />
      {status}
    </span>
  );
}

export function MasteryBar({ value, label }: { value: number; label?: string }) {
  const safeValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));
  return (
    <div className="space-y-2" aria-label={`${label ?? "Mastery"}: ${safeValue}%`}>
      <div className="relative h-1.5 bg-muted">
        <div className="absolute inset-y-0 left-0 bg-primary transition-all duration-700" style={{ width: `${safeValue}%` }} />
        <span className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-background bg-primary" style={{ left: `calc(${safeValue}% - 5px)` }} />
      </div>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono font-semibold text-foreground">{safeValue}%</span>
        </div>
      )}
    </div>
  );
}
