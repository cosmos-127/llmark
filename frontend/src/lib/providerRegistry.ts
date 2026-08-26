export interface ProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  category: "Aggregator" | "Fast Inference" | "Frontier Provider" | "Local Self-Hosted";
  suggestedModels?: string[];
  description?: string;
}

export const POPULAR_BASE_URLS: ProviderPreset[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    category: "Aggregator",
    suggestedModels: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1"],
    description: "Unified gateway to 200+ models with auto fallback",
  },
  {
    id: "groq",
    name: "Groq LPU",
    baseUrl: "https://api.groq.com/openai/v1",
    category: "Fast Inference",
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"],
    description: "Ultra-low latency LPU engine reaching 500+ tok/s",
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    category: "Fast Inference",
    suggestedModels: ["meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3"],
    description: "High-throughput cloud GPU inference",
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    category: "Fast Inference",
    suggestedModels: ["accounts/fireworks/models/deepseek-v3", "accounts/fireworks/models/llama-v3p1-70b-instruct"],
    description: "Fast speculative decoding & fine-tuned serving",
  },
  {
    id: "deepseek",
    name: "DeepSeek API",
    baseUrl: "https://api.deepseek.com/v1",
    category: "Frontier Provider",
    suggestedModels: ["deepseek-reasoner", "deepseek-chat"],
    description: "Direct official DeepSeek V3 and R1 endpoints",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    category: "Frontier Provider",
    suggestedModels: ["grok-2-1212", "grok-2-vision-1212"],
    description: "Official xAI Grok inference endpoint",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    category: "Frontier Provider",
    suggestedModels: ["mistral-large-latest", "codestral-latest", "mistral-small-latest"],
    description: "Official European frontier model platform",
  },
  {
    id: "vllm",
    name: "vLLM (Local / Server)",
    baseUrl: "http://localhost:8000/v1",
    category: "Local Self-Hosted",
    suggestedModels: ["meta-llama/Llama-3.1-8B-Instruct"],
    description: "High-throughput PagedAttention local inference engine",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    category: "Local Self-Hosted",
    suggestedModels: ["llama3.1", "deepseek-r1:8b", "mistral", "qwen2.5-coder"],
    description: "Run open models locally on macOS/Linux/Windows",
  },
  {
    id: "sglang",
    name: "SGLang (Self-Hosted)",
    baseUrl: "http://localhost:30000/v1",
    category: "Local Self-Hosted",
    suggestedModels: ["deepseek-ai/DeepSeek-V3"],
    description: "RadixAttention fast inference serving engine",
  },
  {
    id: "tgi",
    name: "Text Generation Inference (TGI)",
    baseUrl: "http://localhost:8080/v1",
    category: "Local Self-Hosted",
    suggestedModels: ["tgi"],
    description: "Hugging Face production LLM container",
  },
];
