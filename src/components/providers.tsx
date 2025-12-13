"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/auth-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-background-elevated)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "var(--color-text-primary)",
          },
          className: "sonner-toast",
        }}
        theme="dark"
        richColors
      />
    </QueryClientProvider>
  );
}
