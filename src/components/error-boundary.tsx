'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isChunkLoadError, reloadWithCacheBypass, tryChunkErrorReload } from '@/lib/chunk-error';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    if (typeof window !== 'undefined' && isChunkLoadError(error)) {
      tryChunkErrorReload();
    }
  }

  handleRetry = () => {
    if (isChunkLoadError(this.state.error)) {
      reloadWithCacheBypass();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const chunkError = isChunkLoadError(this.state.error);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text)] mb-2">
              Что-то пошло не так
            </h2>
            <p className="text-[var(--muted)] mb-4">
              {chunkError
                ? 'Не удалось загрузить часть страницы (часто после обновления сайта). Нажмите «Обновить страницу» — загрузка пойдёт заново без кэша.'
                : 'Произошла ошибка. Попробуйте обновить страницу.'}
            </p>
            {this.state.error?.message && (
              <p className="text-sm text-[var(--muted)] bg-black/10 dark:bg-white/10 rounded-lg px-3 py-2 mb-6 font-mono break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {chunkError ? 'Обновить страницу' : 'Попробовать снова'}
              </Button>
              {!chunkError && (
                <Button onClick={reloadWithCacheBypass} className="gap-2">
                  Обновить страницу
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
