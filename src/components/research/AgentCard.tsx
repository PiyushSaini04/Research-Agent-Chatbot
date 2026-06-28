"use client";

import { AgentUpdate } from "@/types/research";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { clsx } from "clsx";

interface AgentCardProps {
  update: AgentUpdate;
  isPulsing?: boolean;
}

export function AgentCard({ update, isPulsing = false }: AgentCardProps) {
  const statusConfig = {
    running: {
      icon: <Loader2 size={18} className="animate-spin text-blue-400" />,
      border: "border-blue-500/40",
      bg: "bg-blue-950/30",
      badge: "bg-blue-500/20 text-blue-300",
      label: "Running",
    },
    completed: {
      icon: <CheckCircle size={18} className="text-emerald-400" />,
      border: "border-emerald-500/40",
      bg: "bg-emerald-950/20",
      badge: "bg-emerald-500/20 text-emerald-300",
      label: "Completed",
    },
    failed: {
      icon: <XCircle size={18} className="text-red-400" />,
      border: "border-red-500/40",
      bg: "bg-red-950/20",
      badge: "bg-red-500/20 text-red-300",
      label: "Failed",
    },
    pending: {
      icon: <Clock size={18} className="text-slate-400" />,
      border: "border-slate-600/40",
      bg: "bg-slate-800/20",
      badge: "bg-slate-600/20 text-slate-400",
      label: "Pending",
    },
  };

  const config = statusConfig[update.status] || statusConfig.pending;

  return (
    <div
      className={clsx(
        "relative flex items-start gap-3 rounded-xl border p-4 transition-all duration-500",
        config.border,
        config.bg,
        isPulsing && "animate-pulse"
      )}
      role="listitem"
      aria-label={`${update.agent}: ${config.label}`}
    >
      {/* Status Icon */}
      <div className="mt-0.5 flex-shrink-0">{config.icon}</div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {update.agent}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {update.duration_ms != null && (
              <span className="text-xs text-muted-foreground">
                {(update.duration_ms / 1000).toFixed(1)}s
              </span>
            )}
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                config.badge
              )}
            >
              {config.label}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {update.message}
        </p>
      </div>
    </div>
  );
}
