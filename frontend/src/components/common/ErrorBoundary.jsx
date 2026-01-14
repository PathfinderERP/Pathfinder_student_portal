import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6 text-red-500">
                        <AlertTriangle size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Something went <span className="text-red-500">Wrong</span></h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
                        The component encountered a technical error. This could be due to a network glitch or a code reference error.
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={this.handleReset}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-black active:scale-95"
                        >
                            <RefreshCw size={14} />
                            Reload Page
                        </button>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95"
                        >
                            <Home size={14} />
                            Back to Home
                        </button>
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-slate-100 rounded-xl text-left overflow-auto max-w-2xl w-full">
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Developer Logs:</p>
                            <pre className="text-xs font-mono text-red-600 whitespace-pre-wrap">{this.state.error?.toString()}</pre>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
