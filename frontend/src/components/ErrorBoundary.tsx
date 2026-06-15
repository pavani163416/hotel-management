import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
        }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.75rem", color: "#111" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              An unexpected error occurred. Please refresh the page.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: 8, padding: "1rem", fontSize: "0.75rem",
                color: "#b91c1c", textAlign: "left", overflowX: "auto",
                marginBottom: "1.5rem", whiteSpace: "pre-wrap",
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#111", color: "#fff", border: "none",
                padding: "0.65rem 1.5rem", borderRadius: 10,
                fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
