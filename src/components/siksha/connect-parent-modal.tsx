import { useState, useEffect } from "react";
import { studentApi } from "@/services/api/student-api";
import { toast } from "sonner";
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserCheck,
  X,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectParentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectParentModal({ isOpen, onClose }: ConnectParentModalProps) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hasActiveCode, setHasActiveCode] = useState(false);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkedParents, setLinkedParents] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [codeStatus, parentsRes] = await Promise.all([
        studentApi.getParentCodeStatus(),
        studentApi.getLinkedParents()
      ]);

      setHasActiveCode(codeStatus.hasActiveCode);
      if (codeStatus.hasActiveCode) {
        setCodePreview(codeStatus.preview || null);
        setExpiresAt(codeStatus.expiresAt || null);
      } else {
        setCode(null);
        setCodePreview(null);
        setExpiresAt(null);
      }
      setLinkedParents(parentsRes.parents || []);
    } catch (err: any) {
      console.error("Failed loading parent link data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await studentApi.generateParentCode();
      setCode(res.code);
      setExpiresAt(res.expiresAt);
      setHasActiveCode(true);
      setCodePreview(`${res.code.slice(0, 4)}-****`);
      toast.success("New Parent Connection Code generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed generating code");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await studentApi.revokeParentCode();
      setCode(null);
      setHasActiveCode(false);
      setCodePreview(null);
      setExpiresAt(null);
      toast.success("Active connection code revoked.");
    } catch (err: any) {
      toast.error(err.message || "Failed revoking code");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Connection code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 md:p-8 shadow-2xl text-card-foreground">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Connect Parent or Guardian</h2>
            <p className="text-xs text-muted-foreground">
              Securely invite your family to follow your learning progress
            </p>
          </div>
        </div>

        <div className="space-y-6 pt-5">
          {/* Active Code Display Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Temporary Connection Code
              </span>
              {hasActiveCode && expiresAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[10px] font-bold text-warning-foreground">
                  <Clock className="size-3" /> Expires in 48h
                </span>
              )}
            </div>

            {code ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <span className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-primary">
                    {code}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(code)}
                    className="gap-1.5 shrink-0"
                  >
                    {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                    <span>{copied ? "Copied" : "Copy Code"}</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this code with your parent or guardian. They will enter it when creating their account or connecting in their dashboard.
                </p>
              </div>
            ) : hasActiveCode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div>
                    <span className="font-mono text-xl font-bold tracking-widest text-muted-foreground">
                      {codePreview || "••••-••••"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Active unredeemed code</p>
                  </div>
                  <Button size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
                    <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                    <span>View / Regenerate</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  No active parent connection code. Generate a single-use code to share with your parent.
                </p>
                <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                  <Users className="size-4" />
                  <span>Generate Connection Code</span>
                </Button>
              </div>
            )}

            {/* Code Actions (Regenerate / Revoke) */}
            {hasActiveCode && (
              <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <RefreshCw className="size-3" /> Regenerate Code
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={loading}
                  className="text-destructive hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ShieldAlert className="size-3" /> Revoke Code
                </button>
              </div>
            )}
          </div>

          {/* Connected Parents List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserCheck className="size-4 text-success" /> Connected Family ({linkedParents.length})
            </h3>

            {linkedParents.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {linkedParents.map((p) => (
                  <div key={p.relationshipId} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{p.parentName}</p>
                      <p className="text-xs text-muted-foreground">{p.parentEmail}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success capitalize">
                      <ShieldCheck className="size-3" /> {p.relationshipType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No parent accounts connected yet. Generate and share a connection code above.
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
            <span>
              Parents can view your learning progress, consistency, and achievements. Diagnostic raw scores and test questions remain completely private.
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
