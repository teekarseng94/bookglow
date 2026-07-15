/**
 * BookingErrorBoundary — contains unexpected V2 rendering errors.
 *
 * Any crash inside the V2 subtree is caught here and shown as a governed error
 * state. Crucially this boundary lives entirely within /book-v2, so a V2
 * failure can never affect the existing live /book route.
 */
import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional reset handler (e.g. reload merchant / clear state). */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class BookingErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    };
  }

  componentDidCatch(error: unknown): void {
    // Developer-only console trace; no internal details are shown to customers
    // (the fallback UI below renders a generic message, never the error text).
    console.error('[booking-v2] render error:', error);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Wrapped in `.bg-v2` so the fallback is styled with V2 tokens even when
      // this boundary sits ABOVE the layout (top-level usage).
      return (
        <div className="bg-v2">
          <div className="bgv2-state" role="alert">
            <h1>We hit a snag</h1>
            <p className="bgv2-supporting">
              The booking experience ran into an unexpected error. Your existing booking
              information is safe.
            </p>
            <div style={{ marginTop: 'var(--space-5)' }}>
              <button
                type="button"
                className="bgv2-btn bgv2-btn--primary"
                onClick={this.handleReset}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
