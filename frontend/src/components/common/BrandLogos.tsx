import React from "react";
import awsBedrockIcon from "@/assets/svg/aws-bedrock-icon.svg";
import azureIcon from "@/assets/svg/azure-icon.svg";
import claudeAiIcon from "@/assets/svg/claude-ai-icon.svg";
import deepseekLogoIcon from "@/assets/svg/deepseek-logo-icon.svg";
import googleCloudIcon from "@/assets/svg/google-cloud-icon.svg";
import googleGeminiIcon from "@/assets/svg/google-gemini-svg.svg";
import openaiIcon from "@/assets/svg/openai-icon.svg";

export interface BrandLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * Official OpenAI Spiral Swirl Logo SVG (Tier 1 AI Wire Protocol & Frontier Driver)
 */
export const OpenAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "OpenAI" }) => (
  <img
    src={openaiIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none dark:invert ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

/**
 * Official Claude / Anthropic Logo SVG (Tier 1 Frontier Model & Messages Protocol)
 */
export const AnthropicLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "Anthropic Claude" }) => (
  <img
    src={claudeAiIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none rounded-xs ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

export const ClaudeLogo = AnthropicLogo;

/**
 * Official Google Gemini Multi-Color Sparkle Star SVG (Tier 1 Frontier AI Protocol)
 */
export const GeminiLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "Google Gemini" }) => (
  <img
    src={googleGeminiIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

/**
 * Official Google Cloud Platform / Vertex AI Cloud Logo SVG (Tier 1 Cloud Enterprise Protocol)
 */
export const VertexAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "Google Cloud Vertex AI" }) => (
  <img
    src={googleCloudIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

export const GoogleCloudLogo = VertexAILogo;

/**
 * Official Microsoft Azure Cloud Logo SVG (Tier 1 Enterprise Cloud Protocol)
 */
export const AzureLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "Microsoft Azure" }) => (
  <img
    src={azureIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

/**
 * Official AWS Bedrock Silicon Cube Logo SVG (Tier 1 Cloud Enterprise SigV4 Protocol)
 */
export const AWSBedrockLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "AWS Bedrock" }) => (
  <img
    src={awsBedrockIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
);

/**
 * Official DeepSeek Logo SVG (Tier 1 Frontier Reasoning & AI Model Protocol)
 */
export const DeepSeekLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size, alt = "DeepSeek" }) => (
  <img
    src={deepseekLogoIcon}
    alt={alt}
    className={`inline-block object-contain shrink-0 select-none ${className}`}
    style={size ? { width: size, height: size } : undefined}
    draggable={false}
  />
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
 * Dynamic Brand Logo Resolver Component
 */
export const ProviderLogo: React.FC<{
  vendor: string;
  className?: string;
  size?: number | string;
}> = ({ vendor, className = "h-4 w-4", size }) => {
  const v = (vendor || "").toLowerCase();

  if (v.includes("azure")) {
    return <AzureLogo className={className} size={size} />;
  }
  if (v.includes("aws") || v.includes("bedrock")) {
    return <AWSBedrockLogo className={className} size={size} />;
  }
  if (v.includes("anthropic") || v.includes("claude")) {
    return <AnthropicLogo className={className} size={size} />;
  }
  if (v.includes("deepseek") || v.includes("r1") || v.includes("v3")) {
    return <DeepSeekLogo className={className} size={size} />;
  }
  if (v.includes("gemini")) {
    return <GeminiLogo className={className} size={size} />;
  }
  if (v.includes("vertex") || v.includes("gcp") || (v.includes("google") && !v.includes("gemini"))) {
    return <VertexAILogo className={className} size={size} />;
  }
  if (v.includes("openai")) {
    return <OpenAILogo className={className} size={size} />;
  }
  if (v.includes("groq")) {
    return <GroqLogo className={className} size={size} />;
  }
  if (v.includes("openrouter")) {
    return <OpenRouterLogo className={className} size={size} />;
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
  if (v.includes("mock") || v.includes("simulat") || v.includes("local")) {
    return <MockEngineLogo className={className} size={size} />;
  }

  // Fallback for generic OpenAI-compatible or custom endpoints
  return <OpenRouterLogo className={className} size={size} />;
};
