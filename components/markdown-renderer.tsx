'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-border text-sm" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted" {...props}>{children}</thead>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-border px-3 py-2 text-left font-semibold text-xs" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-3 py-2 text-xs" {...props}>
              {children}
            </td>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2" {...props}>{children}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-lg font-bold mt-4 mb-2" {...props}>{children}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-base font-semibold mt-3 mb-1" {...props}>{children}</h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2" {...props}>{children}</ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 my-2" {...props}>{children}</ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-sm" {...props}>{children}</li>
          ),
          p: ({ children, ...props }) => (
            <p className="text-sm mb-2 leading-relaxed" {...props}>{children}</p>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold" {...props}>{children}</strong>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-primary/30 pl-3 my-2 italic text-muted-foreground" {...props}>
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={`block bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto ${codeClassName ?? ''}`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
