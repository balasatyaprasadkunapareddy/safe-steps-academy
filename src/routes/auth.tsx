import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Card, Input, Label, Select } from "@/components/ui-kit";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — SafeSteps" },
      { name: "description", content: "Sign in or register as a student or teacher on the SafeSteps road safety platform." },
      { property: "og:title", content: "Sign in — SafeSteps" },
      { property: "og:description", content: "Access your SafeSteps road safety lessons, quizzes and badges." },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useSession();
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    school: "",
    class_name: "",
    role: "student",
  });

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credentials.safeParse({ email: form.email, password: form.password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }
    if (isSignUp && form.full_name.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: form.full_name.trim(),
              school: form.school.trim(),
              class_name: form.class_name.trim(),
              role: form.role,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to SafeSteps!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden gradient-hero p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <span className="flex items-center gap-2 font-display text-xl font-bold">
          <ShieldCheck className="size-6" /> SafeSteps
        </span>
        <div>
          <h2 className="max-w-sm font-display text-4xl font-extrabold leading-tight">
            Learn the road. Respect the road. Stay safe.
          </h2>
          <p className="mt-4 max-w-sm text-sm opacity-90">
            Lessons, traffic signs, quizzes and badges — designed for school students and their teachers.
          </p>
        </div>
        <p className="text-xs opacity-75">A community service initiative on road safety awareness.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md animate-rise">
          <h1 className="font-display text-2xl font-bold">{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Register as a student or teacher." : "Sign in to continue your safety journey."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    maxLength={80}
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    placeholder="Aarav Sharma"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="school">School</Label>
                    <Input
                      id="school"
                      maxLength={120}
                      value={form.school}
                      onChange={(e) => update("school", e.target.value)}
                      placeholder="City Public School"
                    />
                  </div>
                  <div>
                    <Label htmlFor="class_name">Class</Label>
                    <Input
                      id="class_name"
                      maxLength={20}
                      value={form.class_name}
                      onChange={(e) => update("class_name", e.target.value)}
                      placeholder="8-B"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role">I am a</Label>
                  <Select id="role" value={form.role} onChange={(e) => update("role", e.target.value)}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@school.edu"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setIsSignUp((v) => !v)}
          >
            {isSignUp ? "Already registered? Sign in" : "New here? Create a student account"}
          </button>
        </Card>
      </div>
    </div>
  );
}
