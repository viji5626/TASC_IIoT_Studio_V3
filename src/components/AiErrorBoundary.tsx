import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

interface ComponentInterface {
  props: Props;
  state: State;
  setState(state: Partial<State> | ((prevState: State) => Partial<State>)): void;
  render(): ReactNode;
}

export class AiErrorBoundary extends (React.Component as unknown as { new(props: Props): ComponentInterface }) {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AiErrorBoundary] Caught exception in AI component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 border border-red-500/30 rounded-2xl text-center m-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl mb-4">
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">AI Copilot Encountered an Error</h3>
          <p className="text-sm text-slate-400 max-w-md mb-4">
            {this.state.error?.message || 'An unexpected error occurred within the AI Assistant panel.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md flex items-center space-x-2"
          >
            <i className="fas fa-rotate-right"></i>
            <span>Reload AI Panel</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
