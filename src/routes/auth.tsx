import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Card, Input, Label, Select } from "@/components/ui-kit";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { CLASSES, LOCATIONS, SCHOOLS, formatSchoolWithLocation } from "@/lib/schools";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot", "reset"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Authentication — SafeSteps" },
      {
        name: "description",
        content:
          "Sign in, register, or reset your password on the SafeSteps road safety platform.",
      },
      { property: "og:title", content: "Authentication — SafeSteps" },
      {
        property: "og:description",
        content: "Access your SafeSteps road safety lessons, quizzes, badges and analytics.",
      },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

type AuthViewMode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useSession();
  const { data: me } = useProfile();

  const [viewMode, setViewMode] = useState<AuthViewMode>(() => {
    if (mode === "signup") return "signup";
    if (mode === "forgot") return "forgot";
    if (mode === "reset") return "reset";
    return "signin";
  });

  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetOtp, setResetOtp] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    location: LOCATIONS[0] as string,
    school: SCHOOLS[0] as string,
    class_name: CLASSES[4] as string, // default: Class 10
    role: "student",
  });

  // Check URL hash for Supabase password recovery token
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("type=recovery") || hash.includes("access_token")) {
        setViewMode("reset");
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setViewMode("reset");
        toast.info("Password recovery session verified. Please enter your new password.");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Redirect authenticated users (except when in reset password mode)
  useEffect(() => {
    if (!session || viewMode === "reset") return;

    const isTeacher = me?.isTeacher || session.user.user_metadata?.["role"] === "teacher";
    navigate({ to: isTeacher ? "/teacher" : "/dashboard", replace: true });
  }, [session, me?.isTeacher, navigate, viewMode]);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Handle Sign In and Sign Up
  async function onSubmitAuth(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }

    if (viewMode === "signup") {
      if (form.full_name.trim().length < 2) {
        toast.error("Please enter your full name");
        return;
      }
      if (!form.location) {
        toast.error("Please select your branch location");
        return;
      }
      if (!form.school) {
        toast.error("Please select your school");
        return;
      }
      if (form.role === "student" && !form.class_name) {
        toast.error("Please select your class");
        return;
      }
    }

    setLoading(true);
    try {
      if (viewMode === "signup") {
        const fullSchoolName = formatSchoolWithLocation(form.school, form.location);
        const selectedClass = form.role === "teacher" && form.class_name === "All Classes"
          ? ""
          : form.class_name.trim();

        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: {
              full_name: form.full_name.trim(),
              location: form.location.trim(),
              school_name: form.school.trim(),
              school: fullSchoolName,
              class_name: selectedClass,
              role: form.role,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created successfully! Welcome to SafeSteps.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in successfully");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  }

  // Handle Forgot Password Request
  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = form.email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth?mode=reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success("Password reset instructions and verification code sent to your email!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send password reset email");
    } finally {
      setLoading(false);
    }
  }

  // Handle OTP verification for Password Reset (Directly inside App or Web)
  async function onVerifyResetOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = form.email.trim();
    const token = resetOtp.trim();

    if (!token || token.length < 6) {
      toast.error("Please enter the 6-digit verification code sent to your email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "recovery",
      });

      if (error) throw error;

      toast.success("Verification code confirmed! You can now set your new password.");
      setViewMode("reset");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid or expired verification code",
      );
    } finally {
      setLoading(false);
    }
  }

  // Handle Setting New Password
  async function onUpdateNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) throw error;

      toast.success("Password changed successfully! You can now sign in with your new password.");
      setForm((prev) => ({ ...prev, password: "", confirm_password: "" }));
      setViewMode("signin");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Hero Left Panel */}
      <div className="hidden gradient-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <span className="flex items-center gap-2 font-display text-xl font-bold">
          <ShieldCheck className="size-6" /> SafeSteps
        </span>
        <div>
          <h2 className="max-w-sm font-display text-4xl font-extrabold leading-tight">
            Learn the road. Respect the road. Stay safe.
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-90">
            Road safety lessons, traffic signs, interactive quizzes, badges, and school analytics —
            tailored for students and teachers across Andhra Pradesh schools.
          </p>
        </div>
        <p className="text-xs opacity-75">
          SafeSteps Academy — A community safety initiative for students and educators.
        </p>
      </div>

      {/* Auth Content Right Panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-lg shadow-lift">
          {/* View: Forgot Password */}
          {viewMode === "forgot" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("signin");
                    setResetEmailSent(false);
                  }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Back to sign in"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <h1 className="font-display text-2xl font-bold">Forgot your password?</h1>
              </div>

              <p className="text-sm text-muted-foreground">
                Enter your registered email address. We'll send you a password reset link and a
                verification code to create a new password.
              </p>

              {!resetEmailSent ? (
                <form onSubmit={onForgotPassword} className="space-y-4">
                  <div>
                    <Label>Registered Email</Label>
                    <div className="relative mt-1">
                      <Input
                        type="email"
                        required
                        placeholder="student@example.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending reset instructions…" : "Send Reset Link & Code"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-primary/30 bg-primary-soft p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-primary">Instructions Sent!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          We sent a reset link to <strong className="text-foreground">{form.email}</strong>.
                          You can click the link in your email, or enter the 6-digit code below:
                        </p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={onVerifyResetOtp} className="space-y-4">
                    <div>
                      <Label>6-Digit Verification Code</Label>
                      <Input
                        type="text"
                        maxLength={8}
                        placeholder="Enter 6-digit code"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value)}
                      />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Verifying code…" : "Verify Code & Set Password"}
                    </Button>
                  </form>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span>Didn't receive the email?</span>
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Resend link
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("signin");
                    setResetEmailSent(false);
                  }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  ← Back to Sign in
                </button>
              </div>
            </div>
          )}

          {/* View: Reset Password (New Password Input) */}
          {viewMode === "reset" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Set New Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a new secure password for your SafeSteps account.
                </p>
              </div>

              <form onSubmit={onUpdateNewPassword} className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    value={form.confirm_password}
                    onChange={(e) => update("confirm_password", e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Updating password…" : "Update Password"}
                </Button>
              </form>

              <div className="border-t border-border pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode("signin")}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel and return to Sign in
                </button>
              </div>
            </div>
          )}

          {/* View: Sign In & Sign Up */}
          {(viewMode === "signin" || viewMode === "signup") && (
            <>
              <h1 className="font-display text-2xl font-bold mb-6">
                {viewMode === "signup" ? "Create your SafeSteps account" : "Sign in to SafeSteps"}
              </h1>

              <form onSubmit={onSubmitAuth} className="space-y-4">
                <div>
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    {viewMode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setViewMode("forgot")}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                  />
                </div>

                {viewMode === "signup" && (
                  <>
                    <div>
                      <Label>Full name</Label>
                      <Input
                        required
                        placeholder="e.g. Ramesh Varma"
                        value={form.full_name}
                        onChange={(e) => update("full_name", e.target.value)}
                      />
                    </div>

                    {/* Location Select */}
                    <div>
                      <Label>Location / Branch</Label>
                      <Select
                        value={form.location}
                        onChange={(e) => update("location", e.target.value)}
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </Select>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Select your school's city or branch location.
                      </p>
                    </div>

                    {/* School Select (Replacing text box!) */}
                    <div>
                      <Label>School</Label>
                      <Select
                        value={form.school}
                        onChange={(e) => update("school", e.target.value)}
                      >
                        {SCHOOLS.map((sch) => (
                          <option key={sch} value={sch}>
                            {sch}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Class Select (Replacing text box!) */}
                    <div>
                      <Label>Class / Grade</Label>
                      <Select
                        value={form.class_name}
                        onChange={(e) => update("class_name", e.target.value)}
                      >
                        {form.role === "teacher" && (
                          <option value="All Classes">All Classes / Whole School</option>
                        )}
                        {CLASSES.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label>Account Role</Label>
                      <Select
                        value={form.role}
                        onChange={(e) => update("role", e.target.value)}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher / Educator</option>
                      </Select>
                    </div>
                  </>
                )}

                <Button type="submit" disabled={loading} className="w-full mt-2">
                  {loading
                    ? viewMode === "signup"
                      ? "Creating account…"
                      : "Signing in…"
                    : viewMode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </form>

              <div className="mt-5 border-t border-border pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {viewMode === "signup"
                    ? "Already have an account?"
                    : "Need to create an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === "signup" ? "signin" : "signup")}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:shadow-soft active:scale-95 cursor-pointer"
                  >
                    {viewMode === "signup" ? "Sign in" : "Sign up"}
                  </button>
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
