import React from 'react';
import { AlertOctagon, RefreshCw, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleCopy = () => {
    const errorText = `${this.state.error?.name}: ${this.state.error?.message}\n${this.state.error?.stack}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 md:p-8 m-4 rounded-xl border border-red-200 bg-red-50/50 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 text-red-600 rounded-lg shrink-0">
              <AlertOctagon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-red-900 mb-1">
                {this.props.title || "Se produjo un error al renderizar esta sección"}
              </h3>
              <p className="text-xs text-red-700 font-medium mb-3">
                Ocurrió una excepción no controlada. Puedes revisar el detalle técnico abajo o intentar recargar la sección.
              </p>

              <div className="bg-red-950 text-red-200 p-3 rounded-lg font-mono text-xs overflow-x-auto mb-4 border border-red-900/50 max-h-48 custom-scrollbar">
                <p className="font-bold text-red-400 mb-1">
                  {this.state.error?.name}: {this.state.error?.message}
                </p>
                {this.state.error?.stack && (
                  <pre className="text-[11px] leading-relaxed opacity-80 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleReset}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  <RefreshCw size={14} /> Reintentar
                </button>
                <button
                  onClick={this.handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all"
                >
                  {this.state.copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {this.state.copied ? "Copiado" : "Copiar Error"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
