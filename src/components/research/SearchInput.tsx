"use client";

import { KeyboardEvent } from "react";
import { Loader2, Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function SearchInput({ value, onChange, onSubmit, isLoading, disabled }: SearchInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="flex w-full gap-3">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={18}
        />
        <input
          id="company-search-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || disabled}
          placeholder="Enter company name (e.g. Apple, Nvidia, Tesla)"
          className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          aria-label="Company name for investment research"
        />
      </div>
      <button
        id="run-research-button"
        onClick={onSubmit}
        disabled={isLoading || disabled || !value.trim()}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
        aria-label={isLoading ? "Research in progress" : "Run research"}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Search size={16} />
            Run Research
          </>
        )}
      </button>
    </div>
  );
}
