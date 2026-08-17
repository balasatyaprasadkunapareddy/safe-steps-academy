import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Handles the Android hardware back button via Capacitor.
 * - If there is navigation history  → go back.
 * - If this is the first / root page → exit the app.
 *
 * Safely no-ops in a browser environment where Capacitor is absent.
 */
export function useAndroidBack() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function register() {
      try {
        // Dynamically import so the bundle still works in browsers
        const { App } = await import("@capacitor/app");
        const { Capacitor } = await import("@capacitor/core");

        // Only register on native Android
        if (!Capacitor.isNativePlatform()) return;

        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            router.history.back();
          } else {
            App.exitApp();
          }
        });

        cleanup = () => handle.remove();
      } catch {
        // Capacitor not available (web build) — silently ignore
      }
    }

    register();

    return () => {
      cleanup?.();
    };
  }, [router]);
}
