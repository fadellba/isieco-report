import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './app/auth-context';
import { App } from './App';
import './styles.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-2xl font-black">
              🍃
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-900">
              ISIECO · Chargement interrompu
            </h1>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Une erreur inattendue est survenue lors de l’initialisation de l’application.
            </p>
            {this.state.error?.message && (
              <pre className="mt-4 p-3 bg-slate-50 rounded-xl text-[11px] text-red-600 font-mono text-left overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-3.5 bg-[#174C3D] hover:bg-[#0A261E] text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>,
);
