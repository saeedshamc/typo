import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  label: string; // which subtree this guards, shown in the fallback + logs
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Wrap each major UI section (typing area, timer, stats panel, ...) in its
 * own instance of this boundary. If one throws, only that section falls
 * back to a small recovery message instead of blanking or crashing the
 * whole window.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary:${this.props.label}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback" role="alert">
          <p>
            بخش «{this.props.label}» با خطا مواجه شد. بقیه‌ی برنامه همچنان کار می‌کند.
          </p>
          <button onClick={this.reset}>تلاش دوباره</button>
        </div>
      );
    }
    return this.props.children;
  }
}
