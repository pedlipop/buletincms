import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reset selection in store to clear problematic inspector state if any
    try {
      window.location.reload();
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">界面渲染遇到异常</h2>
              <p className="text-xs text-zinc-400 mt-1">
                操作时发生意外错误，已为您安全拦截，未丢失您的本地编辑内容。
              </p>
            </div>
            {this.state.error && (
              <div className="text-left bg-zinc-950 rounded p-3 text-[11px] font-mono text-red-300/80 overflow-auto max-h-32 border border-zinc-800">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30"
              >
                <RefreshCw size={14} />
                刷新恢复 (Reload & Recover)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

