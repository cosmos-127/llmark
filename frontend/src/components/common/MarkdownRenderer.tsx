import React, { useState } from "react";
import katex from "katex";
import { Check, Copy, Terminal } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Render KaTeX inline math safely
const renderKatexInline = (math: string): string => {
  try {
    return katex.renderToString(math.trim(), {
      displayMode: false,
      throwOnError: false,
    });
  } catch {
    return math;
  }
};

// Render KaTeX block math safely
const renderKatexBlock = (math: string): string => {
  try {
    return katex.renderToString(math.trim(), {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    return math;
  }
};

// Helper component for rendered code blocks with copy functionality
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-[#2C2C2C]/15 dark:border-white/10 bg-[#181719] dark:bg-[#050507] text-[#F3F4F4] overflow-hidden text-xs shadow-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252426] dark:bg-[#0D0D12] border-b border-[#2C2C2C]/10 dark:border-white/[0.08] text-[10px] text-[#F3F4F4]/60 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-[#853953] dark:text-[#E05284]" />
          <span className="font-mono uppercase">{language || "text"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 font-mono text-[11px] overflow-x-auto leading-relaxed text-[#F3F4F4]/90 dark:text-slate-200 whitespace-pre">
        {code}
      </pre>
    </div>
  );
};

// Helper for rendering inline text formatting (bold, italic, code, math)
const renderInlineFormatting = (text: string): React.ReactNode[] => {
  // Regex tokenizes:
  // 1. Math formulas ($...$ or $$...$$)
  // 2. Bold (**...**)
  // 3. Italic (*...* or _..._)
  // 4. Inline code (`...`)
  const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*|_[^_]+?_)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Block math $$...$$
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const math = part.slice(2, -2);
      const html = renderKatexBlock(math);
      return (
        <span
          key={idx}
          className="block my-1.5 text-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // Inline math $...$
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const math = part.slice(1, -1);
      const html = renderKatexInline(math);
      return (
        <span
          key={idx}
          className="inline-flex items-center mx-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // Bold **...**
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={idx} className="font-bold text-[#2C2C2C] dark:text-white">
          {renderInlineFormatting(inner)}
        </strong>
      );
    }

    // Inline code `...`
    if (part.startsWith("`") && part.endsWith("`")) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md font-mono text-[11px] bg-[#2C2C2C]/10 dark:bg-[#F3F4F4]/10 text-[#853953] dark:text-[#E270BB] font-semibold border border-[#2C2C2C]/10 dark:border-white/10"
        >
          {inner}
        </code>
      );
    }

    // Italic *...* or _..._
    if (
      (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) ||
      (part.startsWith("_") && part.endsWith("_") && !part.startsWith("__"))
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={idx} className="italic text-[#2C2C2C]/90 dark:text-white/90">
          {renderInlineFormatting(inner)}
        </em>
      );
    }

    return <span key={idx}>{part}</span>;
  });
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Split into lines/blocks
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockContent: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-[#853953] dark:marker:text-[#A74B6A] text-xs">
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-[#2C2C2C]/15 dark:border-white/10 shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#853953]/10 dark:bg-[#D84577]/15 text-[#853953] dark:text-[#F06A9A] border-b border-[#2C2C2C]/10 dark:border-white/10">
              <tr>
                {headerRow.map((cell, idx) => (
                  <th key={idx} className="px-3 py-2 font-semibold">
                    {renderInlineFormatting(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C2C2C]/10 dark:divide-[#F3F4F4]/10 bg-white/50 dark:bg-[#0F0F13]/50">
              {bodyRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[#853953]/5 dark:hover:bg-[#A74B6A]/5">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-3 py-2">
                      {renderInlineFormatting(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBlockContent.join("\n")}
            language={codeBlockLanguage}
          />
        );
        codeBlockContent = [];
        codeBlockLanguage = "";
        inCodeBlock = false;
      } else {
        // Start code block
        flushList();
        flushTable();
        inCodeBlock = true;
        codeBlockLanguage = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Markdown Table lines
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      // Skip separator row like |---|---|
      if (/^\|[-:\s|]+\|$/.test(trimmed)) {
        continue;
      }
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      inTable = true;
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // Block KaTeX Math $$...$$ on its own line
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      flushList();
      const math = trimmed.slice(2, -2);
      const html = renderKatexBlock(math);
      elements.push(
        <div
          key={`math-${elements.length}`}
          className="my-3 p-2.5 rounded-xl bg-[#F3F4F4]/70 dark:bg-[#0B0B0E] border border-[#2C2C2C]/10 dark:border-white/10 overflow-x-auto text-center shadow-2xs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h4-${elements.length}`}
          className="text-xs font-bold tracking-tight text-[#853953] dark:text-[#F06A9A] pt-3 pb-1 border-b border-[#853953]/20 dark:border-[#E05284]/20 flex items-center gap-1.5"
        >
          {renderInlineFormatting(trimmed.slice(4))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${elements.length}`}
          className="text-sm font-bold text-[#2C2C2C] dark:text-white pt-3.5 pb-1.5 border-b border-[#2C2C2C]/10 dark:border-white/10"
        >
          {renderInlineFormatting(trimmed.slice(3))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${elements.length}`}
          className="text-base font-bold text-[#2C2C2C] dark:text-white pt-4 pb-2"
        >
          {renderInlineFormatting(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet Lists (- or * or •)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      inList = true;
      const itemContent = trimmed.replace(/^[-*•]\s+/, "");
      listItems.push(renderInlineFormatting(itemContent));
      continue;
    }

    // Numbered Lists (1. 2. 3.)
    if (/^\d+\.\s+/.test(trimmed)) {
      inList = true;
      const itemContent = trimmed.replace(/^\d+\.\s+/, "");
      listItems.push(renderInlineFormatting(itemContent));
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith("> ")) {
      flushList();
      const quoteText = trimmed.slice(2);
      elements.push(
        <div
          key={`quote-${elements.length}`}
          className="my-2.5 p-3 rounded-xl bg-[#853953]/5 dark:bg-[#D84577]/10 border-l-3 border-[#853953] dark:border-[#E05284] text-xs text-[#2C2C2C]/80 dark:text-slate-200 italic"
        >
          {renderInlineFormatting(quoteText)}
        </div>
      );
      continue;
    }

    // Empty line / Spacing
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Standard Paragraph
    flushList();
    elements.push(
      <p key={`p-${elements.length}`} className="my-1.5 text-xs text-[#2C2C2C]/85 dark:text-white/85 leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
