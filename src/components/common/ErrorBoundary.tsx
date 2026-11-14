import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

const BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

/**
 * Catches render errors in the route tree and shows the actual error instead
 * of a blank white screen — essential on mobile where there are no dev tools.
 * The surrounding navigation stays mounted so the user can move away.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = () => this.setState({ error: null, componentStack: null, copied: false });

  private detailsText(): string {
    const { error, componentStack } = this.state;
    return [
      `Build: ${BUILD_ID}`,
      `Error: ${error?.name}: ${error?.message}`,
      '',
      error?.stack ?? '',
      componentStack ? `\nComponent stack:${componentStack}` : '',
    ].join('\n');
  }

  private copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(this.detailsText());
      this.setState({ copied: true });
    } catch {
      /* clipboard unavailable */
    }
  };

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
            {componentStack && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                  Component stack · build {BUILD_ID}
                </p>
                <pre className="text-[11px] leading-snug text-stone-600 whitespace-pre-wrap break-words bg-stone-50 rounded p-2 border border-stone-200 max-h-56 overflow-y-auto">
                  {componentStack.trim()}
                </pre>
              </div>
            )}
            <button
              onClick={this.copyDetails}
              className="w-full px-3 py-2 text-sm font-medium bg-amber-100 text-amber-900 rounded-lg hover:bg-amber-200"
            >
              {this.state.copied ? 'Copied ✓ — paste it to Claude' : 'Copy error details'}
            </button>
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
