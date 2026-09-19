import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Home,
  LayoutDashboard,
  Route as RouteIcon,
  Sparkles,
  Users,
  LogOut,
  RefreshCw,
  FlaskConical,
  Trophy,
  Compass
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/services/api/auth-api";
import { systemApi } from "@/services/api/system-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConnectParentModal } from "./connect-parent-modal";

type Role = "student" | "teacher" | "parent";

const links = {
  student: [
    { to: "/student", label: "Home", icon: Home },
    { to: "/student/disha", label: "Disha", icon: Compass },
    { to: "/student/diagnostic", label: "Initial Diagnostic", icon: GraduationCap },
    { to: "/student/assessments", label: "Adaptive Assessments", icon: ClipboardCheck },
    { to: "/student/progress", label: "Subject Progress", icon: BarChart3 },
    { to: "/student/practice", label: "Practice & Quizzes", icon: BookOpen },
    { to: "/student/profile", label: "Learning Path", icon: RouteIcon }
  ],
  teacher: [
    { to: "/teacher", label: "Class Overview", icon: LayoutDashboard },
    { to: "/teacher/assessments", label: "Adaptive Assessments", icon: ClipboardCheck },
    { to: "/teacher/class", label: "Detailed Reports", icon: Users }
  ],
  parent: [
    { to: "/parent", label: "Learning Journey", icon: Home }
  ]
} as const;

export function AppShell({
  role,
  children,
  title,
  eyebrow,
  actions,
  fullWidth,
  contentClassName
}: {
  role: Role;
  children: ReactNode;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  fullWidth?: boolean;
  contentClassName?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout, setAuthSession } = useAuth();
  const [demoAccounts, setDemoAccounts] = useState<any>(null);
  const [showDemoBar, setShowDemoBar] = useState(false); // Isolated in dev
  const [isResetting, setIsResetting] = useState(false);
  const [isParentModalOpen, setIsParentModalOpen] = useState(false);

  useEffect(() => {
    // Check if in dev mode
    if (process.env.NODE_ENV !== "production") {
      authApi.getDemoAccounts()
        .then(setDemoAccounts)
        .catch((e) => console.warn("[Demo Accounts] Not loaded:", e));
    }
  }, []);

  const handleDemoSwitch = (account: any, targetPath: string) => {
    setAuthSession(
      {
        id: account.userId,
        email: account.email,
        role: account.role,
        profileId: account.profileId,
        name: account.name,
        classLevel: account.classLevel,
        school: account.school
      },
      account.token
    );
    toast.success(`Switched active persona to ${account.name} (${account.role.toUpperCase()})`);
    navigate({ to: targetPath as any });
  };

  const handleResetSeed = async () => {
    setIsResetting(true);
    try {
      await systemApi.resetSeed();
      toast.success("Database re-seeded with fresh Classes 6-12 questions and demo students!");
      window.location.reload();
    } catch (err: any) {
      toast.error(`Seed reset failed: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : role === "teacher"
    ? "TS"
    : role === "parent"
    ? "PK"
    : "AK";

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Development / Demo Mode Toggle Header (isolated) */}
      {demoAccounts && showDemoBar && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-foreground px-4 py-2 text-xs text-primary-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary-foreground uppercase">
              <FlaskConical className="size-3 text-primary" /> Dev Environment
            </span>
            <span className="hidden text-primary-foreground/60 sm:inline">Quick Switcher:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {demoAccounts.students?.map((std: any) => (
              <button
                key={std.userId}
                onClick={() => handleDemoSwitch(std, "/student")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
                  user?.id === std.userId
                    ? "bg-primary font-bold text-primary-foreground shadow-sm"
                    : "bg-background/10 text-primary-foreground/80 hover:bg-background/20"
                )}
                title={`Class ${std.classLevel} · Diagnostic: ${std.diagnosticScore ?? "N/A"}`}
              >
                {std.name.split(" ")[0]} (C{std.classLevel})
              </button>
            ))}

            {demoAccounts.teachers?.map((t: any) => (
              <button
                key={t.userId}
                onClick={() => handleDemoSwitch(t, "/teacher")}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium transition-all",
                  user?.id === t.userId
                    ? "bg-primary font-bold text-primary-foreground shadow-sm"
                    : "bg-background/10 text-primary-foreground/80 hover:bg-background/20"
                )}
              >
                {t.name.split(" ")[1] || t.name} ({t.subject})
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSeed}
              disabled={isResetting}
              className="h-6 border-primary-foreground/20 bg-transparent px-2 text-[10px] text-primary-foreground hover:bg-primary-foreground/10"
              title="Reset database to initial clean seed state"
            >
              <RefreshCw className={cn("size-3 mr-1", isResetting && "animate-spin")} />
              {isResetting ? "Resetting..." : "Reset DB"}
            </Button>

            <button
              onClick={() => setShowDemoBar(false)}
              className="ml-2 text-primary-foreground/50 hover:text-primary-foreground text-xs"
              title="Hide dev bar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="ink-panel fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col lg:flex">
        <div className="border-b border-primary-foreground/10 p-6 [&_*]:text-primary-foreground">
          <Brand />
        </div>

        <div className="px-4 py-3 border-b border-primary-foreground/10">
          <p className="text-[10px] uppercase font-bold text-primary-foreground/45 tracking-wider">Active Account</p>
          <p className="font-semibold text-sm text-primary-foreground truncate mt-0.5">{user?.name || "Active User"}</p>
          <p className="text-[11px] text-primary-foreground/60 capitalize truncate">
            {user?.role === "student"
              ? (user?.classLevel ? `Class ${user.classLevel} · ${user.school || "Delhi Public School"}` : (user?.school || "Student"))
              : user?.role === "teacher"
              ? `Teacher · ${user?.school || "Delhi Public School"}`
              : "Parent"}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label={`${role} navigation`}>
          {links[role].map(({ to, label, icon: Icon }, index) => (
            <Link
              key={label}
              to={to}
              className={cn(
                "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-xs text-primary-foreground/60 transition-all hover:bg-primary-foreground/5 hover:text-primary-foreground",
                path === to && "bg-primary-foreground/10 text-primary-foreground font-semibold"
              )}
            >
              <span className={cn("absolute inset-y-1.5 left-0 w-1 rounded-r bg-transparent", path === to && "bg-primary")} />
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-primary-foreground/10 p-4 space-y-2">
          {process.env.NODE_ENV !== "production" && !showDemoBar && (
            <button
              onClick={() => setShowDemoBar(true)}
              className="w-full text-left text-[10px] text-primary-foreground/40 hover:text-primary-foreground flex items-center gap-1 py-1"
            >
              <FlaskConical className="size-3" /> Show Dev Persona Switcher
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-primary-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              Live PostgreSQL
            </span>
            <span className="font-mono text-[9px] text-primary-foreground/40">v2.1</span>
          </div>

          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-primary-foreground/60 hover:bg-destructive/20 hover:text-destructive-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[240px]">
        <header className="sticky top-0 z-20 grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{eyebrow ?? role}</p>
              <h1 className="truncate font-display text-2xl font-bold md:text-3xl text-foreground">{title}</h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {actions}

            {role === "student" && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/student/ai-tutor"
                  aria-label="AI Tutor"
                  title="AI Tutor"
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full border border-border/80 bg-card text-muted-foreground transition-all cursor-pointer",
                    "hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                    path === "/student/ai-tutor" && "border-primary/40 bg-primary/15 text-primary shadow-xs"
                  )}
                >
                  <Sparkles className="size-4" />
                  <span className="sr-only">AI Tutor</span>
                </Link>

                <Link
                  to="/student/achievements"
                  aria-label="Achievements"
                  title="Achievements"
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full border border-border/80 bg-card text-muted-foreground transition-all cursor-pointer",
                    "hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1",
                    path === "/student/achievements" && "border-amber-500/40 bg-amber-500/15 text-amber-500 shadow-xs"
                  )}
                >
                  <Trophy className="size-4" />
                  <span className="sr-only">Achievements</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsParentModalOpen(true)}
                  aria-label="Connect Parent"
                  title="Connect Parent or Guardian"
                  className={cn(
                    "relative grid size-9 place-items-center rounded-full border border-border/80 bg-card text-muted-foreground transition-all cursor-pointer",
                    "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                  )}
                >
                  <Users className="size-4" />
                  <span className="sr-only">Connect Parent</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="grid size-9 place-items-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </span>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-tight text-foreground">{user?.name || "User"}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user?.role || role}</p>
              </div>
            </div>
          </div>
        </header>

        {role === "student" && (
          <ConnectParentModal
            isOpen={isParentModalOpen}
            onClose={() => setIsParentModalOpen(false)}
          />
        )}

        <main className={cn(
          "w-full",
          fullWidth ? "p-3 sm:p-4 max-w-none" : "mx-auto max-w-[1500px] p-4 md:p-8 xl:p-10",
          contentClassName
        )}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-flow-col auto-cols-fr rounded-lg border border-primary-foreground/10 bg-foreground/95 p-1.5 shadow-panel backdrop-blur-xl lg:hidden"
        aria-label={`${role} mobile navigation`}
      >
        {links[role].map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 text-[9px] text-primary-foreground/55 transition-colors",
              path === to && "bg-primary text-primary-foreground font-semibold"
            )}
          >
            <Icon className="size-4" />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
