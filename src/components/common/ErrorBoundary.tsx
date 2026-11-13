import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Catches render errors in the route tree and shows the actual error instead
 * of a blank white screen — essential on mobile where there are no dev tools.
 * The surrounding navigation stays mounted so the user can move away.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = () => this.setState({ error: null, componentStack: null });

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="h-full overflow-y-auto bg-stone-50 p-4">
        <div className="max-w-md mx-auto mt-6 rounded-lg border border-red-200 bg-white overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h1 className="text-base font-semibold text-red-800">Something went wrong</h1>
            <p className="text-sm text-red-700 mt-0.5">
              This screen hit an error. The details below help pin it down.
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Error
              </p>
              <pre className="text-xs text-stone-800 whitespace-pre-wrap break-words bg-stone-50 rounded p-2 border border-stone-200">
                {error.name}: {error.message}
              </pre>
            </div>
            {(error.stack || componentStack) && (
              <details>
                <summary className="text-xs text-stone-500 cursor-pointer">Stack</summary>
                <pre className="mt-1 text-[11px] leading-snug text-stone-600 whitespace-pre-wrap break-words bg-stone-50 rounded p-2 border border-stone-200 max-h-64 overflow-y-auto">
                  {error.stack}
                  {componentStack ? `\n\nComponent stack:${componentStack}` : ''}
                </pre>
              </details>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={this.reset}
                className="flex-1 px-3 py-2 text-sm font-medium bg-stone-100 text-stone-800 rounded-lg hover:bg-stone-200"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
