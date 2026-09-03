import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center text-[#f9fafb] font-sans">
          <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.06)] p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <AlertCircle className="w-12 h-12 text-[#ef4444] mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-[#6b7280] text-sm mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred in the application."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3.5 bg-[#6366f1] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out rounded-xl font-bold text-[#f9fafb]"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children || null;
  }
}
