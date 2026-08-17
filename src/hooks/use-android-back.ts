import { useEffect, useRef } from "react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

/**
 * Handles the Android hardware back button via Capacitor.
 * - Works seamlessly with TanStack Router used on Vercel deployments.
 * - Checks current TanStack Router path to determine if user is on root/dashboard.
 * - If on a child route or has history → navigates back via TanStack Router.
 * - If on root/dashboard → double-press within 2s to exit with a toast notification.
 *
 * Safely no-ops in a browser/Vercel environment where Capacitor is absent.
 */
export function useAndroidBack() {
  const router = useRouter();
  const location = useLocation();
  const backPressedAt = useRef<number | null>(null);
  const toastId = useRef<string | number | null>(null);

  // Maintain a reference to current location so event listeners access fresh path data
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function register() {
      try {
        // Dynamic imports so non-Capacitor web environments (like Vercel) won't break
        const { App } = await import("@capacitor/app");
        const { Capacitor } = await import("@capacitor/core");

        // Only register back button behavior on native Android
        if (!Capacitor.isNativePlatform()) return;

        const handle = await App.addListener("backButton", () => {
          const currentPath = locationRef.current.pathname;

          // Define root routes where back button triggers "Exit App"
          const isRootPage =
            currentPath === "/" ||
            currentPath === "/dashboard" ||
            currentPath === "/_authenticated/dashboard";

          // 1. If user is on a child screen or history exists, navigate back using TanStack
          if (!isRootPage && window.history.length > 1) {
            if (toastId.current !== null) {
              toast.dismiss(toastId.current);
              toastId.current = null;
            }
            backPressedAt.current = null;
            router.history.back();
            return;
          }

          // 2. Root screen — double-back-to-exit handler
          const now = Date.now();
          if (backPressedAt.current && now - backPressedAt.current < 2000) {
            if (toastId.current !== null) toast.dismiss(toastId.current);
            App.exitApp();
            return;
          }

          // 3. First press on root screen — show toast hint
          backPressedAt.current = now;
          toastId.current = toast("Press back again to exit", {
            duration: 2000,
            position: "bottom-center",
          });
        });

        cleanup = () => handle.remove();
      } catch {
        // Capacitor modules omitted in standard Vercel browser build — safely ignore
      }
    }

    register();

    return () => {
      cleanup?.();
    };
  }, [router]);
}