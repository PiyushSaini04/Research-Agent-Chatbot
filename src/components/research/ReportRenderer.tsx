"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Download, Check, Printer } from "lucide-react";
import { useState } from "react";

interface ReportRendererProps {
  markdown: string;
}

export function ReportRenderer({ markdown }: ReportRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <span className="text-sm font-semibold text-foreground">
          Full Research Report
        </span>
        <div className="flex gap-2">
          <button
            id="copy-markdown-button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            aria-label="Copy markdown to clipboard"
          >
            {copied ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            id="download-markdown-button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            aria-label="Download report as markdown file"
          >
            <Download size={12} />
            Download .md
          </button>
          <button
            id="print-report-button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            aria-label="Print report"
          >
            <Printer size={12} />
            Print
          </button>
        </div>
      </div>

      {/* Markdown content */}
      <div className="prose prose-invert prose-sm max-w-none p-6 prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-table:text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Open all links in new tab
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                {...props}
              >
                {children}
              </a>
            ),
            // Styled tables
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-muted/50">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-border px-3 py-2 text-muted-foreground">
                {children}
              </td>
            ),
            // Code blocks with syntax highlighting
            code: ({ className, children, ...props }) => {
              const isBlock = className?.includes("language-");
              return isBlock ? (
                <code
                  className={`${className} block rounded-lg bg-muted p-4 text-xs overflow-x-auto`}
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
