import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number | string;
}

/**
 * Official OpenAI Spiral Swirl Logo SVG (Pixel-Perfect Canonical Geometry)
 */
export const OpenAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1638a.0804.0804 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.686zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.909 9.2298V6.8974a.0662.0662 0 0 1 .0331-.0615l4.9912-2.8764a4.4992 4.4992 0 0 1 6.6026 4.7188l-.0044.0483zM12 14.708l-2.9094-1.6806V9.6644L12 7.9838l2.9094 1.6806v3.363z" />
  </svg>
);

/**
 * Official Anthropic Geometric Logo SVG
 */
export const AnthropicLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13.827 3.5h3.693L24 20.5h-3.693l-6.48-17zm-7.347 0L0 20.5h3.693l1.455-3.818h6.294l1.455 3.818h3.693L10.173 3.5H6.48zm.287 10.364L8.327 7.182l1.553 6.682H6.767z" />
  </svg>
);

/**
 * Official Google Gemini 4-Pointed Sparkle Star Logo SVG
 */
export const GeminiLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12Z" />
  </svg>
);

/**
 * Official Groq Fast LPU Silicon Logo SVG
 */
export const GroqLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9H12v2h2.2c-.3 1.2-1.3 2-2.2 2-1.7 0-3-1.3-3-3s1.3-3 3-3c.8 0 1.5.3 2 .8l1.4-1.4C14.4 7.6 13.3 7 12 7 9.2 7 7 9.2 7 12s2.2 5 5 5c2.8 0 4.8-2 4.8-4.8 0-.4-.1-.8-.3-1.2z" />
  </svg>
);

/**
 * Official OpenRouter Gateway Logo SVG
 */
export const OpenRouterLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5zm0 6.86L5.3 7 12 3.64 18.7 7 12 8.86zM2 12l10 5 10-5-2.3-1.15L12 14.54 4.3 10.85 2 12zm0 5l10 5 10-5-2.3-1.15L12 19.54 4.3 15.85 2 17z" />
  </svg>
);

/**
 * Official DeepSeek Logo SVG
 */
export const DeepSeekLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2zm1 15.93V17a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-1v1.93A8.01 8.01 0 0 1 12 4a8 8 0 0 1 1 13.93z" />
  </svg>
);

/**
 * Official Together AI Logo SVG
 */
export const TogetherAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="7" cy="7" r="3.5" />
    <circle cx="17" cy="7" r="3.5" />
    <circle cx="7" cy="17" r="3.5" />
    <circle cx="17" cy="17" r="3.5" />
    <path d="M7 10.5v3M17 10.5v3M10.5 7h3M10.5 17h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Official vLLM High-Throughput Inference Engine Logo SVG
 */
export const VLLMLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M3.5 4h3.8l4.7 11.2L16.7 4h3.8l-6.7 16h-3.6L3.5 4zm13.2 0h3.8l-3.8 9.2-1.9-4.6L16.7 4z" />
  </svg>
);

/**
 * Official Ollama Terminal / Local AI Logo SVG
 */
export const OllamaLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2c-3.86 0-7 3.14-7 7 0 2.22 1.04 4.2 2.66 5.48L7 19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l-.66-4.52C17.96 13.2 19 11.22 19 9c0-3.86-3.14-7-7-7zm-2 15l.43-3h3.14l.43 3H10zm2-5a4.98 4.98 0 0 1-4.9-4c0-2.71 2.19-4.9 4.9-4.9s4.9 2.19 4.9 4.9c0 1.83-1.01 3.43-2.5 4.28L14 12h-2z" />
  </svg>
);

/**
 * Mock Engine / Synthetic Benchmarking CPU Silicon Logo SVG
 */
export const MockEngineLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
  </svg>
);

/**
 * AWS Bedrock Silicon Logo SVG
 */
export const AWSBedrockLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.3l6.7 3.7-6.7 3.7L5.3 8 12 4.3zM5 9.7l6 3.3v6.7l-6-3.3V9.7zm8 10v-6.7l6-3.3v6.7l-6 3.3z" />
  </svg>
);

/**
 * GCP Vertex AI Logo SVG
 */
export const VertexAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 8l10 6 10-6-10-6zm0 8.5L4.8 8 12 3.7 19.2 8 12 10.5zM2 12l10 6 10-6-2.5-1.5L12 15 4.5 10.5 2 12zm0 4l10 6 10-6-2.5-1.5L12 19 4.5 14.5 2 16z" />
  </svg>
);

/**
 * Dynamic Brand Logo Resolver Component
 */
export const ProviderLogo: React.FC<{
  vendor: string;
  className?: string;
  size?: number | string;
}> = ({ vendor, className = "h-4 w-4", size }) => {
  const v = (vendor || "").toLowerCase();

  if (v.includes("openai") && !v.includes("compatible")) {
    return <OpenAILogo className={className} size={size} />;
  }
  if (v.includes("anthropic") || v.includes("claude")) {
    return <AnthropicLogo className={className} size={size} />;
  }
  if (v.includes("gemini") || v.includes("google")) {
    return <GeminiLogo className={className} size={size} />;
  }
  if (v.includes("gcp") || v.includes("vertex")) {
    return <VertexAILogo className={className} size={size} />;
  }
  if (v.includes("aws") || v.includes("bedrock")) {
    return <AWSBedrockLogo className={className} size={size} />;
  }
  if (v.includes("groq")) {
    return <GroqLogo className={className} size={size} />;
  }
  if (v.includes("openrouter")) {
    return <OpenRouterLogo className={className} size={size} />;
  }
  if (v.includes("deepseek") || v.includes("r1")) {
    return <DeepSeekLogo className={className} size={size} />;
  }
  if (v.includes("together")) {
    return <TogetherAILogo className={className} size={size} />;
  }
  if (v.includes("vllm")) {
    return <VLLMLogo className={className} size={size} />;
  }
  if (v.includes("ollama")) {
    return <OllamaLogo className={className} size={size} />;
  }
  if (v.includes("mock")) {
    return <MockEngineLogo className={className} size={size} />;
  }

  // Fallback for generic OpenAI-compatible or custom endpoints
  return <OpenRouterLogo className={className} size={size} />;
};
