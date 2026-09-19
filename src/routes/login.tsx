import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/siksha/brand";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/services/api/auth-api";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, School as SchoolIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { School } from "@/data/types";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — SIKHASETU" },
      { name: "description", content: "Sign in to SIKHASETU Adaptive Learning Intelligence Platform" }
    ]
  })
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, signup, setAuthSession } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<"student" | "teacher" | "parent">("student");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState(7);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([7, 9]);
  const [subjectSpecialization, setSubjectSpecialization] = useState("Mathematics");
  const [parentConnectionCode, setParentConnectionCode] = useState("");
  const [relationshipType, setRelationshipType] = useState<"parent" | "guardian">("parent");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [customSchoolName, setCustomSchoolName] = useState<string>("");
  const [isCustomSchool, setIsCustomSchool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleUserId, setGoogleUserId] = useState<string | null>(null);

  useEffect(() => {
    authApi.getSchools().then(res => {
      setSchools(res.schools || []);
      if (res.schools && res.schools.length > 0) {
        setSelectedSchoolId(res.schools[0].id);
      }
    }).catch(() => {
      // fallback default
    });
  }, []);

  useEffect(() => {
    // Process Supabase OAuth Session
    let isMounted = true;

    const processSession = async (session: any) => {
      if (!session?.user?.email || !isMounted) return;
      const gEmail = session.user.email;
      const gName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
      const gId = session.user.id;

      const searchParams = new URLSearchParams(window.location.search);
      const urlRole = searchParams.get("role") as "student" | "teacher" | null;
      const targetRole = urlRole && ["student", "teacher"].includes(urlRole) ? urlRole : role;

      try {
        const res = await authApi.googleAuth({
          email: gEmail,
          name: gName,
          supabaseUserId: gId,
          role: targetRole
        });

        if (!isMounted) return;

        if (res.isExistingUser && res.user && res.token) {
          setAuthSession(res.user, res.token);
          toast.success(`Welcome back, ${res.user.name || "Learner"}!`);
          const dest = res.user.role === "student" ? "/student" : res.user.role === "teacher" ? "/teacher" : "/parent";
          navigate({ to: dest as any });
        } else {
          // New User or Incomplete Profile -> Prompt full onboarding
          setEmail(res.email);
          if (res.name) setName(res.name);
          setGoogleUserId(res.supabaseUserId || gId);
          if (urlRole && ["student", "teacher"].includes(urlRole)) {
            setRole(urlRole);
          }
          setIsSignUp(true);
          // Clean URL params
          if (window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          toast.info("Google identity verified! Complete your school and class details below to activate your account.");
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("[Google Auth Check]", err.message);
        }
      }
    };

    // Check URL for OAuth errors
    const searchParams = new URLSearchParams(window.location.search);
    const errorDesc = searchParams.get("error_description");
    if (errorDesc) {
      console.error("[OAuth Error]", errorDesc);
      toast.error(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // 1. Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) processSession(session);
    });

    // 2. Listen for auth state changes on redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) processSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [role]);

  const handleGoogleAuth = async () => {
    if (role === "parent") return;
    setGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/login?role=${role}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes: "openid email profile"
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      toast.error(err.message || "Failed starting Google authentication");
      setGoogleLoading(false);
    }
  };

  const toggleTeacherClass = (cl: number) => {
    if (selectedClasses.includes(cl)) {
      if (selectedClasses.length > 1) {
        setSelectedClasses(selectedClasses.filter(c => c !== cl));
      }
    } else {
      setSelectedClasses([...selectedClasses, cl].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      let authenticatedUser: any;
      if (isSignUp) {
        if (!name) {
          toast.error("Please enter your full name");
          setLoading(false);
          return;
        }

        const signupPayload: any = {
          email,
          name,
          role,
          supabaseUserId: googleUserId || undefined,
          schoolId: isCustomSchool ? undefined : selectedSchoolId,
          school: isCustomSchool ? customSchoolName : undefined
        };

        if (role === "student") {
          signupPayload.classLevel = classLevel;
        } else if (role === "teacher") {
          signupPayload.classLevels = selectedClasses;
          signupPayload.subjectSpecialization = subjectSpecialization;
        } else if (role === "parent") {
          if (!parentConnectionCode.trim()) {
            toast.error("Please enter the 8-character connection code from your child.");
            setLoading(false);
            return;
          }
          signupPayload.parentConnectionCode = parentConnectionCode.trim();
          signupPayload.relationshipType = relationshipType;
        }

        authenticatedUser = await signup(signupPayload);
        toast.success(
          role === "parent"
            ? `Account created & connected to ${authenticatedUser?.linkedStudent?.name || "your child"}!`
            : `Account created! Welcome to SIKHASETU, ${name}.`
        );
      } else {
        authenticatedUser = await login(email);
        toast.success("Successfully signed in!");
      }

      // Authoritative navigation strictly based on authenticated user's role from database
      const userRole = authenticatedUser?.role || role;
      if (userRole === "student") {
        navigate({ to: isSignUp ? "/student/diagnostic" : "/student" });
      } else if (userRole === "teacher") {
        navigate({ to: "/teacher" });
      } else if (userRole === "parent") {
        navigate({ to: "/parent" });
      } else {
        navigate({ to: "/student" });
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col justify-between p-6 md:p-12">
      <header className="flex justify-between items-center max-w-5xl mx-auto w-full">
        <Brand />
        <Button asChild variant="ghost">
          <Link to="/">Back to Home</Link>
        </Button>
      </header>

      <div className="mx-auto w-full max-w-lg my-8">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-panel">
          {/* Role Pill Selector */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-1 mb-6">
            {(["student", "teacher", "parent"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-md capitalize transition-all",
                  role === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="text-left">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              {isSignUp ? `Create ${role} account` : `Sign in as ${role}`}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {role === "student"
                ? "Connect with your school classroom & experience learning adapted to your readiness."
                : role === "teacher"
                ? "Manage your classroom rosters, assign 1-click adaptive assessments & view diagnostic evidence."
                : "Follow your child's learning journey, milestones, and daily practice consistency."}
            </p>
          </div>

          {/* Google OAuth for Student and Teacher */}
          {role !== "parent" && (
            <div className="mt-6 space-y-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 border-border hover:bg-muted/50 py-2.5 h-11 text-sm font-semibold transition-all shadow-sm"
              >
                {googleLoading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative bg-card px-3 text-xs text-muted-foreground uppercase font-medium">
                  or with email
                </div>
              </div>
            </div>
          )}

          {googleUserId && isSignUp && (
            <div className="mt-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-start gap-2.5 text-xs text-foreground">
              <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">Google Identity Verified ({email})</p>
                <p className="text-muted-foreground mt-0.5">
                  Complete your school and class details below to activate your SIKHASETU {role} profile.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <label className="form-field">
                Full Name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "teacher" ? "e.g. Ms. Sunita Sharma" : "e.g. Aarav Kumar"}
                />
              </label>
            )}

            <label className="form-field">
              <div className="flex items-center justify-between">
                <span>Email Address</span>
                {googleUserId && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="size-3 text-emerald-500" /> Google Verified
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                value={email}
                readOnly={!!googleUserId}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(googleUserId && "bg-muted/40 cursor-not-allowed opacity-90")}
                placeholder={
                  role === "teacher"
                    ? "teacher@sikshasetu.edu"
                    : role === "student"
                    ? "aarav@sikshasetu.edu"
                    : "parent@sikshasetu.edu"
                }
              />
            </label>

            {/* School Selection for Sign-up */}
            {isSignUp && role !== "parent" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SchoolIcon className="size-3.5 text-primary" /> School / Institution
                </label>
                {!isCustomSchool ? (
                  <div className="space-y-1.5">
                    <select
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      value={selectedSchoolId}
                      onChange={(e) => {
                        if (e.target.value === "other") {
                          setIsCustomSchool(true);
                        } else {
                          setSelectedSchoolId(e.target.value);
                        }
                      }}
                    >
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.location ? `(${s.location})` : ""}
                        </option>
                      ))}
                      <option value="other">+ Enter another school name</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      placeholder="e.g. St. Xavier's High School"
                      value={customSchoolName}
                      onChange={(e) => setCustomSchoolName(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomSchool(false)}
                      className="text-xs text-primary hover:underline"
                    >
                      ← Select from recognized schools
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Student Class Level */}
            {isSignUp && role === "student" && (
              <label className="form-field">
                Declared Class
                <select value={classLevel} onChange={(e) => setClassLevel(Number(e.target.value))}>
                  {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>
              </label>
            )}

            {/* Teacher Classes & Subject Specialization */}
            {isSignUp && role === "teacher" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">
                    Classes You Teach (Select all that apply)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[6, 7, 8, 9, 10, 11, 12].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleTeacherClass(c)}
                        className={cn(
                          "py-1.5 px-2 rounded-md text-xs font-medium border text-center transition-all",
                          selectedClasses.includes(c)
                            ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                            : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                        )}
                      >
                        Class {c}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="form-field">
                  Subject Specialization
                  <select
                    value={subjectSpecialization}
                    onChange={(e) => setSubjectSpecialization(e.target.value)}
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science (Physics / Chem / Bio)</option>
                    <option value="English">English</option>
                    <option value="Mathematics & Science">Mathematics & Science</option>
                  </select>
                </label>
              </div>
            )}

            {/* Parent Connection Code & Relationship Type */}
            {isSignUp && role === "parent" && (
              <div className="space-y-3 pt-2">
                <label className="form-field">
                  Parent Connection Code
                  <input
                    type="text"
                    required
                    value={parentConnectionCode}
                    onChange={(e) => setParentConnectionCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB7K-92PX"
                    maxLength={9}
                    className="font-mono tracking-wider uppercase text-base"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1">
                    Ask your child for their 8-character connection code from their student profile.
                  </span>
                </label>

                <label className="form-field">
                  Relationship Type
                  <select
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value as "parent" | "guardian")}
                  >
                    <option value="parent">Parent</option>
                    <option value="guardian">Guardian / Mentor</option>
                  </select>
                </label>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full mt-3" disabled={loading}>
              {loading
                ? "Connecting..."
                : isSignUp
                ? role === "parent"
                  ? "Create Account & Connect Child"
                  : "Create Account & Join Classroom"
                : "Sign in to Dashboard"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "New to SIKHASETU? Create an account"}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" /> Authoritative School Database & Supabase Auth Security
          </p>
        </div>
      </div>

      <footer className="text-center text-xs text-muted-foreground">
        Bridging the gap between grade and actual learning. © 2026 SIKHASETU.
      </footer>
    </main>
  );
}
