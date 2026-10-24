import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('SnapTask crashed', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal">
        <h1>Something went wrong</h1>
        <p>{this.state.error.message}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload SnapTask</button>
      </div>
    );
  }
}
