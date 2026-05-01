import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onBack?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6 flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {this.props.fallbackMessage || 'This screen could not be loaded. You can retry or return to the previous page.'}
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-36 overflow-auto rounded-xl bg-slate-950 p-3 text-left text-xs text-slate-100">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 font-black text-slate-900 hover:bg-yellow-300"
            >
              <RefreshCw size={18} />
              Try again
            </button>
            <button
              type="button"
              onClick={this.props.onBack || (() => window.history.back())}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }
}
