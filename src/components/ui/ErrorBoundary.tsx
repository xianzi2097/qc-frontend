import { Component, type ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界 —— 包裹功能模块，一个模块崩不影响其他
 * 用法：<ErrorBoundary label="消息">...</ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.label} 崩溃:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-8 text-center">
          <p className="text-rose-400 text-sm mb-2">⚠ {this.props.label}加载出错</p>
          <p className="text-xs text-slate-500 font-mono mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs text-cyan-400 hover:text-white px-4 py-2 rounded-lg border border-cyan-400/30 hover:bg-cyan-400/10 transition-colors"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
