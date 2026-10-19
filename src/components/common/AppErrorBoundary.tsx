import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorTracker } from '../../utils/errorTracking.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary] Uncaught application error:', error, errorInfo);
    try {
      errorTracker.captureException(error, {
        component: 'AppErrorBoundary',
        extra: { componentStack: errorInfo.componentStack }
      });
    } catch {
      // Ignore tracker failure in error boundary
    }
  }

  handleReload = () => {
    // Keep local progress intact, but reload the document cleanly
    window.location.reload();
  };

  handleResetToHome = () => {
    try {
      // Clear any session-level transient flags if needed, then redirect to root
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06140F] text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl space-y-6 backdrop-blur">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-950/80 border-2 border-emerald-400/50 flex items-center justify-center text-4xl shadow-inner">
              🦁
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white tracking-wide">
                Pole Sana!
              </h1>
              <p className="text-sm text-emerald-300 font-semibold">
                Don't worry, your stars and XP are safe!
              </p>
              <p className="text-xs text-slate-400">
                Kuna hitilafu ndogo imetokea. Bonyeza kitufe hapa chini kuendelea na safari yako ya elimu.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wider uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer min-h-[48px]"
              >
                Jaribu Tena (Try Again) ➔
              </button>

              <button
                type="button"
                onClick={this.handleResetToHome}
                className="w-full py-3 px-6 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              >
                Rudi Mwanzo (Back to Home)
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">
              Jifuno CBC Learning • Safe for Children
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
