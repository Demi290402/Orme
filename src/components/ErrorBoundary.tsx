import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-scout-beige-light dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-200 dark:border-gray-700 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-black">Qualcosa è andato storto</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Si è verificato un errore imprevisto durante la visualizzazione di questa schermata.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl text-left border border-gray-200 dark:border-gray-700/60 max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-red-500 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-scout-green text-white text-xs font-bold rounded-xl hover:bg-scout-green-dark transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCw size={14} />
                <span>Ricarica Pagina</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Home size={14} />
                <span>Torna alla Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
