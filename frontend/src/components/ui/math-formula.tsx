import React, { useMemo } from "react";
import katex from "katex";

interface MathFormulaProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  math,
  block = false,
  className = "",
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (e) {
      console.error("KaTeX rendering error:", e);
      return `<span class="text-rose-500">${math}</span>`;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={`my-1.5 overflow-x-auto py-1 text-center ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center mx-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
