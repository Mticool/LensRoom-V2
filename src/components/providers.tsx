"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { GenerationProvider } from "@/contexts/generation-context";
import { GenerationIndicator } from "@/components/generation-indicator";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

function ThemedToaster() {
  const { theme } = useTheme();
  
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--color-background-elevated)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "var(--color-text-primary)",
        },
        className: "sonner-toast",
      }}
      theme={theme}
      richColors
      expand
      visibleToasts={5}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <GenerationProvider>
            {children}
            <GenerationIndicator />
          </GenerationProvider>
        </AuthProvider>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}