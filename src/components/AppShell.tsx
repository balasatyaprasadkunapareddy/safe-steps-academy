import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  SignpostBig,
  Sun,
  Trophy,
  GraduationCap,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui-kit";
import { useProfile } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const studentNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/signs", label: "Signs", icon: SignpostBig },
  { to: "/quiz", label: "Quiz", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/survey", label: "Survey", icon: ShieldCheck },
] as const;

const teacherNav = [{ to: "/teacher", label: "Teacher Dashboard", icon: GraduationCap }] as const;

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("safesteps-theme");
    const isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("safesteps-theme", next ? "dark" : "light");
      return next;
    });
  };

  return { dark, toggle };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const nav = data?.isTeacher ? teacherNav : studentNav;
  const homePath = data?.isTeacher ? "/teacher" : "/dashboard";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur transition-shadow duration-300">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to={homePath} className="flex items-center gap-2 font-display text-lg font-bold hover-scale">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground animate-pulse-glow">
              <ShieldCheck className="size-5" />
            </span>
            SafeSteps
          </Link>

          <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
            {nav.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-primary-soft text-primary" }}
                className={`rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted press-scale animate-fade-in stagger-${(i + 1) as 1 | 2 | 3 | 4 | 5}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {data?.profile?.full_name}
              {data?.isTeacher ? " · Teacher" : ""}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut} className="hidden sm:inline-flex">
              <LogOut className="size-4" /> Sign out
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Animated mobile drawer */}
        <div
          style={{
            maxHeight: open ? "600px" : "0px",
            opacity: open ? 1 : 0,
            overflow: "hidden",
            transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
          }}
          className="border-t border-border px-4 py-3 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-2">
            {nav.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeProps={{ className: "bg-primary-soft text-primary" }}
                style={{ animationDelay: `${i * 50}ms` }}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted press-scale animate-slide-up"
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-muted press-scale"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
