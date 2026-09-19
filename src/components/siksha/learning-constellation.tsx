import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Circle,
  Sparkles,
  AlertTriangle,
  Lock,
  ArrowRight,
  X,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  Target,
  RefreshCw,
  Zap,
  TrendingUp,
  Award
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningPathNode, LearningPathNodeState } from "@/data/types";

interface LearningConstellationProps {
  nodes?: LearningPathNode[];
  compact?: boolean;
  className?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function LearningConstellation({
  nodes = [],
  compact = false,
  className,
  isLoading = false,
  emptyMessage,
  onRetry
}: LearningConstellationProps) {
  const [selectedNode, setSelectedNode] = useState<LearningPathNode | null>(null);

  // Loading State
  if (isLoading) {
    return (
      <div className={cn("constellation relative overflow-hidden flex flex-col items-center justify-center p-8", compact ? "min-h-72" : "min-h-[460px]", className)}>
        <div className="constellation-grid absolute inset-0" />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center">
          <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-foreground">Mapping your learning evidence...</p>
          <p className="text-xs text-muted-foreground">Deriving dynamic curriculum nodes from your database records</p>
        </div>
      </div>
    );
  }

  // Empty State (e.g. no evidence or not started)
  if (nodes.length === 0) {
    return (
      <div className={cn("constellation relative overflow-hidden flex flex-col items-center justify-center p-8 text-center", compact ? "min-h-72" : "min-h-[460px]", className)}>
        <div className="constellation-grid absolute inset-0" />
        <div className="relative z-10 max-w-md space-y-4">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto border border-primary/20">
            <GraduationCap className="size-7" />
          </div>
          <div>
            <h4 className="font-display text-lg font-bold text-foreground">
              Your Learning Path is Taking Shape
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
              {emptyMessage || "Complete your initial diagnostic check to establish your baseline and generate your personalized curriculum constellation."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button asChild size="sm">
              <Link to="/student/diagnostic">
                Start Initial Diagnostic <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="mr-1.5 size-3.5" /> Refresh
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Calculate SVG Polyline Path
  const linePoints = nodes.map((node) => `${node.x},${node.y}`).join(" ");

  const getNodeIcon = (status: LearningPathNodeState, type?: string) => {
    if (status === "complete") {
      return <Check className="size-4" />;
    }
    if (status === "needs_attention") {
      return <AlertTriangle className="size-4" />;
    }
    if (status === "active") {
      return <Sparkles className="size-4" />;
    }
    if (status === "locked") {
      return <Lock className="size-3.5" />;
    }
    if (type === "recommendation" || type === "target") {
      return <Target className="size-4" />;
    }
    return <Circle className="size-3" />;
  };

  const getNodeClass = (status: LearningPathNodeState) => {
    switch (status) {
      case "complete":
        return "is-complete bg-success text-success-foreground shadow-sm hover:scale-110";
      case "active":
        return "is-active bg-primary text-primary-foreground shadow-md hover:scale-110";
      case "needs_attention":
        return "bg-amber-500 text-white border-amber-600 shadow-md hover:scale-110";
      case "next":
        return "is-next border-dashed border-2 border-primary/70 text-primary bg-background hover:scale-110";
      case "locked":
        return "opacity-50 bg-muted text-muted-foreground border-dashed border-border cursor-not-allowed";
      default:
        return "bg-card text-foreground";
    }
  };

  return (
    <>
      <div
        className={cn(
          "constellation relative overflow-hidden select-none",
          compact ? "min-h-72" : "min-h-[500px]",
          className
        )}
        role="region"
        aria-label="Student Learning Constellation"
      >
        {/* Dotted Grid Background */}
        <div className="constellation-grid absolute inset-0" />

        {/* Connecting Animated Polyline */}
        <svg
          className="absolute inset-0 size-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.polyline
            points={linePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.45"
            strokeDasharray="2.5 1.5"
            className="text-primary/40"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>

        {/* Constellation Nodes */}
        {nodes.map((node, index) => {
          const isSelected = selectedNode?.id === node.id;

          return (
            <motion.div
              key={node.id || node.label + index}
              className="absolute z-10"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 * index, duration: 0.3 }}
            >
              <div className="group relative -translate-x-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "constellation-node grid size-11 place-items-center rounded-full transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    getNodeClass(node.status),
                    isSelected && "ring-2 ring-primary ring-offset-2 scale-110"
                  )}
                  title={`${node.label} - Click to view details`}
                >
                  {getNodeIcon(node.status, node.type)}
                </button>

                {/* Node Label Below */}
                <div
                  className={cn(
                    "absolute left-1/2 top-13 -translate-x-1/2 text-center pointer-events-none transition-all",
                    compact ? "w-28" : "w-36"
                  )}
                >
                  <p className="text-[11px] font-bold leading-tight text-foreground truncate px-1">
                    {node.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px] leading-tight truncate px-1",
                      node.status === "needs_attention"
                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                        : node.status === "complete"
                        ? "text-success font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {node.detail}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Bottom Status Legend */}
        <div className="absolute bottom-4 left-4 sm:left-6 flex flex-wrap items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/60 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            <span>Mastered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <span>Needs Practice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full border border-dashed border-primary" />
            <span>Target Milestone</span>
          </div>
        </div>

        {/* Quick Hint */}
        <div className="absolute top-4 right-4 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-border/50 hidden sm:block">
          💡 Click any node for details & actions
        </div>
      </div>

      {/* ========================================== */}
      {/* INTERACTIVE NODE DETAIL MODAL              */}
      {/* ========================================== */}
      <AnimatePresence>
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-11 rounded-xl grid place-items-center shadow-xs",
                      selectedNode.status === "complete" && "bg-success/15 text-success",
                      selectedNode.status === "active" && "bg-primary/15 text-primary",
                      selectedNode.status === "needs_attention" && "bg-amber-500/15 text-amber-600",
                      selectedNode.status === "next" && "bg-primary/10 text-primary border border-dashed border-primary/40",
                      selectedNode.status === "locked" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {getNodeIcon(selectedNode.status, selectedNode.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {selectedNode.type?.toUpperCase() || "CURRICULUM NODE"}
                      </span>
                      {selectedNode.subject && (
                        <span className="text-[10px] font-semibold text-primary">
                          {selectedNode.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground mt-0.5">
                      {selectedNode.title || selectedNode.label}
                    </h3>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedNode(null)}
                  className="rounded-full size-8"
                  aria-label="Close details"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Progress & Status Indicators */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase">Current Status</p>
                  <p className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    {selectedNode.status === "complete" && <span className="text-success font-semibold">● Mastered / Verified</span>}
                    {selectedNode.status === "active" && <span className="text-primary font-semibold">● Active Learning Focus</span>}
                    {selectedNode.status === "needs_attention" && <span className="text-amber-600 dark:text-amber-400 font-semibold">● Needs Practice</span>}
                    {selectedNode.status === "next" && <span className="text-foreground font-semibold">○ Recommended Target</span>}
                    {selectedNode.status === "locked" && <span className="text-muted-foreground font-semibold">🔒 Pending Prerequisite</span>}
                  </p>
                </div>
                {typeof selectedNode.progress === "number" && (
                  <div>
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase">Mastery Score</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            selectedNode.status === "needs_attention" ? "bg-amber-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(100, Math.max(5, selectedNode.progress))}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {selectedNode.progress}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Real Evidence Explanation */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-primary" /> Evidence & Rationale
                </p>
                <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>{selectedNode.evidenceSummary || selectedNode.detail}</p>
                  {selectedNode.reason && (
                    <p className="text-[11px] text-foreground font-medium pt-1 border-t border-border/40">
                      💡 {selectedNode.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>

                {selectedNode.actionUrl && (
                  <Button asChild size="sm">
                    <Link
                      to={selectedNode.actionUrl as any}
                      onClick={() => setSelectedNode(null)}
                    >
                      {selectedNode.actionLabel || "Go to Activity"} <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SignalNode({
  label,
  value,
  tone = "primary"
}: {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning";
}) {
  return (
    <div className="signal-node" data-tone={tone}>
      <span className="signal-node-dot" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}