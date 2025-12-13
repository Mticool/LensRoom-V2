"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Here you could send to error tracking service like Sentry
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg)]">
          <Card variant="glass" className="p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-[rgba(255,255,255,0.55)] mb-6">
              {this.state.error?.message || "Произошла непредвиденная ошибка"}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="text-left text-xs text-red-400 bg-red-500/10 p-4 rounded-lg mb-6 overflow-auto max-h-40">
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Перезагрузить
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for use with hooks
interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function WithErrorBoundary({
  children,
  fallback,
}: ErrorBoundaryWrapperProps) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}

