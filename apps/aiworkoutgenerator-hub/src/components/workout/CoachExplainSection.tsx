"use client";

import { useState, useId } from "react";
import { ChevronDown, ChevronUp, FileEdit } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface CoachExplainSectionProps {
  content: string;
  size?: "small" | "large"; // small for ExerciseCard, large for ExerciseModal
}

/**
 * Reusable component for displaying Coach Explain content.
 * Features citron green styling, paper/pencil icon, and markdown formatting.
 */
export function CoachExplainSection({
  content,
  size = "small",
}: CoachExplainSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();

  const iconSize = size === "small" ? "w-3 h-3" : "w-5 h-5";
  const buttonPadding = size === "small" ? "p-2" : "p-4";
  const contentPadding = size === "small" ? "p-3" : "p-6";
  const textSize = size === "small" ? "text-xs" : "text-sm";
  const contentTextSize = size === "small" ? "text-sm" : "text-base";
  const borderRadius = size === "small" ? "rounded" : "rounded-xl";

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={`w-full flex items-center justify-between ${buttonPadding} bg-muted/50 ${borderRadius} border border-border/30 ${textSize} font-bold text-[hsl(82.7,77.9%,55.5%)] hover:text-[hsl(82.7,77.9%,50%)] hover:border-[hsl(82.7,77.9%,55.5%)]/50 transition-all`}
      >
        <div className="flex items-center gap-2">
          <FileEdit className={`${iconSize} text-[hsl(82.7,77.9%,55.5%)]`} />
          <span>Coach Explain</span>
        </div>
        {isExpanded ? (
          <ChevronUp className={iconSize} />
        ) : (
          <ChevronDown className={iconSize} />
        )}
      </button>

      {isExpanded && (
        <div
          id={contentId}
          className={`mt-2 ${contentPadding} bg-background ${borderRadius} border border-border ${contentTextSize} text-muted-foreground leading-relaxed animate-in slide-in-from-top-2 duration-200 prose prose-sm max-w-none`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              h2: ({ ...props }) => (
                <h2
                  className="text-primary font-bold text-lg mt-8 mb-4 first:mt-0 leading-tight"
                  {...props}
                />
              ),
              h3: ({ ...props }) => (
                <h3
                  className="text-primary font-semibold text-base mt-6 mb-3 leading-tight"
                  {...props}
                />
              ),
              p: ({ ...props }) => (
                <p className="mb-4 leading-relaxed last:mb-0" {...props} />
              ),
              ul: ({ ...props }) => (
                <ul className="list-none mb-6 space-y-4 last:mb-0" {...props} />
              ),
              ol: ({ ...props }) => (
                <ol className="list-none mb-6 space-y-4 last:mb-0" {...props} />
              ),
              li: ({ children, ...props }) => (
                <li className="leading-relaxed mb-0" {...props}>
                  {children}
                </li>
              ),
              strong: ({ ...props }) => (
                <strong className="font-bold text-foreground" {...props} />
              ),
              em: ({ ...props }) => <em className="italic" {...props} />,
              // Add spacing after headings to create clear section breaks
              blockquote: ({ ...props }) => (
                <blockquote
                  className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground"
                  {...props}
                />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
