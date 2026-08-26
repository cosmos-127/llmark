import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMs(ms?: number | null): string {
  if (ms === undefined || ms === null || isNaN(ms)) return "0.0 ms";
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(1)} ms`;
}

export function formatPct(pct?: number | null): string {
  if (pct === undefined || pct === null || isNaN(pct)) return "0.0%";
  return `${pct.toFixed(1)}%`;
}

export function formatUsd(usd?: number | null): string {
  if (usd === undefined || usd === null || isNaN(usd)) return "$0.00";
  if (usd < 0.01 && usd > 0) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export async function downloadFile(urlOrContent: string, filename: string, mimeType: string = "application/octet-stream") {
  try {
    if (urlOrContent.startsWith("/") || urlOrContent.startsWith("http://") || urlOrContent.startsWith("https://")) {
      const response = await fetch(urlOrContent);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return;
    }

    if (urlOrContent.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = urlOrContent;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const blob = new Blob([urlOrContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (error) {
    console.error("Error executing file download:", error);
  }
}
