import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Card, Input, Label, Select } from "@/components/ui-kit";
import { useProfile, useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import {
  CLASSES,
  LOCATIONS,
  SCHOOLS,
  SECTIONS,
  formatClassWithSection,
  formatSchoolWithLocation,
} from "@/lib/schools";

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

  const [resetStatus, setResetStatus] = useState<
    "idle" | "checking" | "ready" | "no_session" | "error"
  >(() => {
    if (mode === "reset") return "checking";
    return "idle";
  });
  const [resetErrorMessage, setResetErrorMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirm_password: "",
    full_name: "",
    location: LOCATIONS[0] as string,
    school: SCHOOLS[0] as string,
    class_name: CLASSES[5] as string, // default: Class 10
    section: SECTIONS[0] as string, // default: Section A
    role: "student",
  });

  // Inspect URL parameters, tokens, PKCE codes, and Supabase password recovery session
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;

    async function handleUrlTokens() {
      const hash = window.location.hash;
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

      // 1. Check for error parameters (e.g. from expired, cancelled, or duplicate links)
      const errorDesc =
        urlParams.get("error_description") || hashParams.get("error_description");
      const errorMsg = urlParams.get("error") || hashParams.get("error");
      if (errorDesc || errorMsg) {
        const decoded = decodeURIComponent((errorDesc || errorMsg || "").replace(/\+/g, " "));
        if (isMounted) {
          setResetErrorMessage(decoded);
          setResetStatus("error");
          setViewMode("reset");
        }
        return;
      }

      // 2. Check for PKCE auth code (?code=...)
      const code = urlParams.get("code");
      if (code) {
        if (isMounted) {
          setViewMode("reset");
          setResetStatus("checking");
        }
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("exchangeCodeForSession error:", error);
            if (isMounted) {
              setResetErrorMessage(error.message || "Password reset link is invalid or has expired.");
              setResetStatus("error");
            }
          } else if (data?.session) {
            if (isMounted) {
              setResetStatus("ready");
              setResetErrorMessage("");
              toast.success("Password recovery verified! Enter your new password below.");
            }
          }
        } catch (err: unknown) {
          if (isMounted) {
            setResetErrorMessage(
              err instanceof Error ? err.message : "Failed to exchange reset code.",
            );
            setResetStatus("error");
          }
        }
        return;
      }

      // 3. Check for implicit token in hash (#access_token=...&refresh_token=...)
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        if (isMounted) {
          setViewMode("reset");
          setResetStatus("checking");
        }
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            if (isMounted) {
              setResetErrorMessage(error.message);
              setResetStatus("error");
            }
          } else if (data?.session) {
            if (isMounted) {
              setResetStatus("ready");
              setResetErrorMessage("");
              toast.success("Password recovery session active! Enter your new password below.");
            }
          }
        } catch (err: unknown) {
          if (isMounted) {
            setResetErrorMessage(
              err instanceof Error ? err.message : "Failed to establish recovery session.",
            );
            setResetStatus("error");
          }
        }
        return;
      }

      // 4. If URL mode is reset or hash has type=recovery, check existing session
      if (mode === "reset" || hash.includes("type=recovery") || viewMode === "reset") {
        if (isMounted) setResetStatus("checking");
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (isMounted) {
            setResetStatus("ready");
            setResetErrorMessage("");
          }
        } else {
          if (isMounted) {
            setResetStatus("no_session");
            setResetErrorMessage(
              "No active password reset session was found. Reset links are single-use and expire quickly.",
            );
          }
        }
      }
    }

    handleUrlTokens();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && viewMode === "reset")) {
        if (session && isMounted) {
          setViewMode("reset");
          setResetStatus("ready");
          setResetErrorMessage("");
        }
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [mode, viewMode]);

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
        const selectedClass =
          form.role === "teacher" && form.class_name === "All Classes"
            ? ""
            : formatClassWithSection(form.class_name, form.section);

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
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const baseOrigin = isLocal
        ? window.location.origin
        : "https://safe-steps-academy.vercel.app";
      const redirectUrl = `${baseOrigin}/auth?mode=reset`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success("Password reset email sent! Check your inbox.");
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
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "recovery",
      });

      if (error) throw error;

      if (data?.session) {
        setResetStatus("ready");
        setResetErrorMessage("");
      }
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
      // Pre-flight check: ensure active session exists
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setResetStatus("no_session");
        setResetErrorMessage(
          "Your password reset session has expired or is missing. Please request a fresh reset link.",
        );
        toast.error("Session expired or missing. Please request a new reset email.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) throw error;

      toast.success("Password changed successfully! You can now sign in with your new password.");
      setForm((prev) => ({ ...prev, password: "", confirm_password: "" }));

      // Clean up session and URL
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setResetStatus("idle");
      setViewMode("signin");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not update password";
      if (
        message.toLowerCase().includes("session") ||
        message.toLowerCase().includes("auth session missing")
      ) {
        setResetStatus("no_session");
        setResetErrorMessage(
          "Your password reset session has expired or is invalid. Please request a fresh reset link.",
        );
        toast.error("Reset session expired. Please request a fresh reset email.");
      } else {
        toast.error(message);
      }
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
                    {loading ? "Sending reset email…" : "Send Password Reset Email"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-primary/30 bg-primary-soft p-5 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="size-6 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-bold text-primary">Check your email!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          We sent a password reset link to <strong className="text-foreground">{form.email}</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-background/80 p-3 text-xs text-muted-foreground space-y-1.5 border border-border/60">
                      <p className="font-semibold text-foreground">How to reset:</p>
                      <p>1. Open your inbox (or spam folder) for an email from <strong>SafeSteps / Supabase</strong>.</p>
                      <p>2. Click the <strong>"Reset Password"</strong> link in the email.</p>
                      <p>3. It will open SafeSteps directly to let you create your new password!</p>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <Mail className="size-3.5" /> Open Gmail
                      </a>

                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Resend email
                      </button>
                    </div>
                  </div>

                  {!showOtpInput ? (
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOtpInput(true)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        Have a 6-digit OTP code instead? Click here
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Enter 6-Digit OTP Code
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowOtpInput(false)}
                          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Hide
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        If your email contains a 6-digit code, enter it below to set your password directly:
                      </p>
                      <form onSubmit={onVerifyResetOtp} className="space-y-3">
                        <Input
                          type="text"
                          maxLength={8}
                          placeholder="Enter 6-digit code (e.g. 123456)"
                          value={resetOtp}
                          onChange={(e) => setResetOtp(e.target.value)}
                        />

                        <Button type="submit" disabled={loading} className="w-full">
                          {loading ? "Verifying code…" : "Verify Code & Set Password"}
                        </Button>
                      </form>
                    </div>
                  )}
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

          {/* View: Reset Password (New Password Input or Session Expired Card) */}
          {viewMode === "reset" && (
            <div className="space-y-6">
              {resetStatus === "checking" ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <Loader2 className="size-8 text-primary animate-spin" />
                  </div>
                  <h2 className="font-display text-xl font-bold">Verifying reset session…</h2>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we verify your password recovery link.
                  </p>
                </div>
              ) : resetStatus === "error" || resetStatus === "no_session" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="size-6 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <h2 className="text-base font-bold text-destructive">
                          Reset Link Expired or Session Missing
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          {resetErrorMessage ||
                            "Your password reset link has expired, was already used, or is invalid. For your security, reset links are single-use."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Why did this happen?</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Password reset links expire quickly for security reasons.</li>
                      <li>Reset links can only be clicked once. If clicked multiple times, they expire.</li>
                      <li>The link was generated before your Supabase Site URL was configured.</li>
                    </ul>
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setResetEmailSent(false);
                      setResetStatus("idle");
                      setViewMode("forgot");
                      if (typeof window !== "undefined") {
                        window.history.replaceState({}, document.title, window.location.pathname);
                      }
                    }}
                    className="w-full"
                  >
                    Request a Fresh Reset Link
                  </Button>

                  <div className="border-t border-border pt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStatus("idle");
                        setViewMode("signin");
                        if (typeof window !== "undefined") {
                          window.history.replaceState({}, document.title, window.location.pathname);
                        }
                      }}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ← Back to Sign in
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20">
                      <CheckCircle2 className="size-3.5" />
                      Recovery link verified
                    </div>
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
                      onClick={() => {
                        setResetStatus("idle");
                        setViewMode("signin");
                      }}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel and return to Sign in
                    </button>
                  </div>
                </div>
              )}
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

                    {/* Class & Section Selects */}
                    <div className="grid gap-3 sm:grid-cols-2">
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

                      {form.class_name !== "All Classes" && (
                        <div>
                          <Label>Section</Label>
                          <Select
                            value={form.section}
                            onChange={(e) => update("section", e.target.value)}
                          >
                            {form.role === "teacher" && (
                              <option value="All Sections">All Sections (A–E)</option>
                            )}
                            {SECTIONS.map((sec) => (
                              <option key={sec} value={sec}>
                                {sec}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}
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
