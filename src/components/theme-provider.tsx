"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Applies the theme class to <html> before first paint (next-themes injects the
 * blocking script), so dark mode never flashes a light frame.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="ems-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
