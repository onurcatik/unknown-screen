import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { Button } from "../button";

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error("UnknownScreen frontend boundary caught an error", error, errorInfo);
    }
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-error-boundary" role="alert">
        <div>
          <span className="eyebrow">Frontend safety boundary</span>
          <h1>The Studio UI recovered from a rendering error.</h1>
          <p>
            Backend state has not been modified. Reload the current view or return to Dashboard before retrying the action.
          </p>
          <pre>{this.state.error.message}</pre>
          <div className="app-error-actions">
            <Button variant="primary" onClick={this.reset}>Try rendering again</Button>
            <a className="ui-button ui-button-secondary ui-button-md" href="/dashboard">Back to Dashboard</a>
          </div>
        </div>
      </div>
    );
  }
}
