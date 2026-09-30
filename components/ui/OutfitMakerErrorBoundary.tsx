"use client";

import React, { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class OutfitMakerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error("OutfitMaker canvas crashed", error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 className="mb-1 font-serif text-lg font-light tracking-tight text-foreground">
            Canvas Temporarily Unavailable
          </h3>
          <p className="mb-6 max-w-sm text-xs text-muted leading-relaxed">
            An issue occurred while manipulating lookbook layers. Your saved outfits and pieces are unaffected.
          </p>

          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground shadow-xs transition-all duration-150 hover:bg-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Canvas
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default OutfitMakerErrorBoundary;
