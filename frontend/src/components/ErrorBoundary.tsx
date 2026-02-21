/**
 * ErrorBoundary — Week 8
 *
 * Catches unhandled React render errors so the whole app doesn't
 * white-screen. Shows a friendly recovery UI instead.
 *
 * Must be a class component — React's error boundary API
 * (componentDidCatch / getDerivedStateFromError) is class-only.
 *
 * Usage — three patterns:
 *
 *   1. Wrap the entire app (catches everything):
 *      In main.tsx:
 *        <ErrorBoundary>
 *          <App />
 *        </ErrorBoundary>
 *
 *   2. Wrap a single page (isolated recovery):
 *        <ErrorBoundary label="Trip Details">
 *          <TripDetailsPage />
 *        </ErrorBoundary>
 *
 *   3. Inline reset after a recoverable action:
 *        <ErrorBoundary resetOnChange={tripId}>
 *          <ItineraryTab ... />
 *        </ErrorBoundary>
 *      The boundary resets automatically when `resetOnChange` changes,
 *      so navigating to a different trip clears any previous error.
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

// ── Props & State ─────────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label shown in the error card, e.g. "Trip Details" */
  label?: string;
  /**
   * When this value changes the boundary resets itself.
   * Pass a route param (e.g. tripId) so navigating away clears the error.
   */
  resetOnChange?: unknown;
  /** Optional custom fallback — overrides the default error card */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── SVG Icons ─────────────────────────────────────────────────
function AlertIcon() {
  return (
    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

// ── Default fallback UI ───────────────────────────────────────
function DefaultFallback({
  label,
  error,
  onRetry,
}: {
  label?: string;
  error: Error | null;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-[320px] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.06] shadow-sm p-8 max-w-md w-full text-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <AlertIcon />
        </div>

        {/* Heading */}
        <h2 className="font-display text-xl text-ink mb-2">
          {label ? `${label} failed to load` : 'Something went wrong'}
        </h2>

        {/* Subtitle */}
        <p className="text-ink-secondary text-sm mb-6 leading-relaxed">
          An unexpected error occurred. This has been noted — try refreshing
          the section or returning home.
        </p>

        {/* Error detail — collapsed, dev-friendly */}
        {error && (
          <details className="mb-6 text-left">
            <summary className="text-xs text-ink-tertiary cursor-pointer hover:text-ink transition-colors select-none">
              Show error details
            </summary>
            <pre className="mt-2 p-3 bg-surface-bg rounded-xl text-xs text-ink-secondary overflow-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-xl hover:bg-ink/80 transition-colors"
          >
            <RefreshIcon />
            Try again
          </button>
          <button
            onClick={() => window.location.assign('/')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-ink text-sm font-semibold rounded-xl ring-1 ring-surface-muted hover:bg-surface-bg transition-colors"
          >
            <HomeIcon />
            Go home
          </button>
        </div>

      </div>
    </div>
  );
}

// ── ErrorBoundary class ───────────────────────────────────────
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Called during render when a descendant throws.
  // Returns the state update that triggers the fallback UI.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Called after render with the error + component stack.
  // Good place to send to an error reporting service.
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
    // Future: send to Sentry / LogRocket / etc.
    // reportError(error, info);
  }

  // When resetOnChange prop changes (e.g. user navigates to a
  // different trip), clear the error so children can re-render.
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      prevProps.resetOnChange !== this.props.resetOnChange
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback takes priority
      if (this.props.fallback) return this.props.fallback;

      return (
        <DefaultFallback
          label={this.props.label}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}