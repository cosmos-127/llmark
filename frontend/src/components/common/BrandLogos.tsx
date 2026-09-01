import React from "react";
import Openai from "@thesvg/react/openai";
import Anthropic from "@thesvg/react/anthropic";
import ClaudeAi from "@thesvg/react/claude-ai";
import GoogleGemini from "@thesvg/react/google-gemini";
import GoogleCloud from "@thesvg/react/google-cloud";
import MicrosoftAzure from "@thesvg/react/microsoft-azure";
import AwsAmazonBedrock from "@thesvg/react/aws-amazon-bedrock";
import Deepseek from "@thesvg/react/deepseek";
import Groq from "@thesvg/react/groq";
import Ollama from "@thesvg/react/ollama";
import Openrouter from "@thesvg/react/openrouter";
import TogetherAi from "@thesvg/react/together-ai";
import Vllm from "@thesvg/react/vllm";
import MistralAi from "@thesvg/react/mistral-ai";
import Meta from "@thesvg/react/meta";
import HuggingFace from "@thesvg/react/hugging-face";

export interface BrandLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * Official OpenAI Spiral Swirl Logo from @thesvg/react (thesvg)
 */
export const OpenAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Openai
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="OpenAI"
  />
);

/**
 * Official Anthropic / Claude Logo from @thesvg/react (thesvg)
 */
export const AnthropicLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <ClaudeAi
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Anthropic Claude"
  />
);

export const ClaudeLogo = AnthropicLogo;

/**
 * Official Google Gemini Multi-Color Sparkle Star from @thesvg/react (thesvg)
 */
export const GeminiLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <GoogleGemini
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Google Gemini"
  />
);

/**
 * Official Google Cloud Platform / Vertex AI from @thesvg/react (thesvg)
 */
export const VertexAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <GoogleCloud
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Google Cloud Vertex AI"
  />
);

export const GoogleCloudLogo = VertexAILogo;

/**
 * Official Microsoft Azure Cloud Logo from @thesvg/react (thesvg)
 */
export const AzureLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <MicrosoftAzure
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Microsoft Azure"
  />
);

/**
 * Official AWS Bedrock Silicon Cube Logo from @thesvg/react (thesvg)
 */
export const AWSBedrockLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <AwsAmazonBedrock
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="AWS Bedrock"
  />
);

/**
 * Official DeepSeek Logo from @thesvg/react (thesvg)
 */
export const DeepSeekLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Deepseek
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="DeepSeek"
  />
);

/**
 * Official Groq Fast LPU Silicon Logo from @thesvg/react (thesvg)
 */
export const GroqLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Groq
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Groq"
  />
);

/**
 * Official OpenRouter Gateway Logo from @thesvg/react (thesvg)
 */
export const OpenRouterLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Openrouter
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="OpenRouter"
  />
);

/**
 * Official Together AI Logo from @thesvg/react (thesvg)
 */
export const TogetherAILogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <TogetherAi
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Together AI"
  />
);

/**
 * Official vLLM High-Throughput Inference Engine from @thesvg/react (thesvg)
 */
export const VLLMLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Vllm
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="vLLM"
  />
);

/**
 * Official Ollama Terminal / Local AI Logo from @thesvg/react (thesvg)
 */
export const OllamaLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Ollama
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Ollama"
  />
);

/**
 * Official Mistral AI Logo from @thesvg/react (thesvg)
 */
export const MistralLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <MistralAi
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Mistral AI"
  />
);

/**
 * Official Meta / Llama Logo from @thesvg/react (thesvg)
 */
export const MetaLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <Meta
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Meta"
  />
);

/**
 * Official Hugging Face Logo from @thesvg/react (thesvg)
 */
export const HuggingFaceLogo: React.FC<BrandLogoProps> = ({ className = "h-4 w-4", size }) => (
  <HuggingFace
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="Hugging Face"
  />
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
  if (v.includes("mistral")) {
    return <MistralLogo className={className} size={size} />;
  }
  if (v.includes("meta") || v.includes("llama")) {
    return <MetaLogo className={className} size={size} />;
  }
  if (v.includes("hugging")) {
    return <HuggingFaceLogo className={className} size={size} />;
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

/**
 * Official LLMark Brand Logo Mark
 * Minimalist, high-craft benchmark impulse glyph
 */
export const LLMarkLogo: React.FC<BrandLogoProps> = ({ className = "h-5 w-5", size = 28 }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 select-none ${className}`}
    width={size}
    height={size}
    aria-label="LLMark"
  >
    <defs>
      <linearGradient id="llmark-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E05284" />
        <stop offset="50%" stopColor="#853953" />
        <stop offset="100%" stopColor="#612D53" />
      </linearGradient>
    </defs>
    <rect width="28" height="28" rx="7.5" fill="url(#llmark-logo-grad)" />
    {/* Twin L latency bars with high-speed benchmark tick */}
    <path
      d="M7.5 7.5V18.5C7.5 19.3 8.2 20 9 20H13M14.5 7.5V18.5C14.5 19.3 15.2 20 16 20H20.5"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Precision latency impulse spark dot */}
    <circle cx="20.5" cy="8" r="1.75" fill="#FCE7F3" />
  </svg>
);
