"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center border border-red-500/40 bg-red-950/20 rounded-xl">
          <AlertCircle className="text-red-400 mb-2" size={24} />
          <h2 className="text-sm font-semibold text-red-300">Something went wrong</h2>
          <p className="text-xs text-red-400/80 mt-1 max-w-sm">
            {this.props.fallbackMessage || this.state.error?.message || "An unexpected error occurred."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
