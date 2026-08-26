import { WorkloadPreset } from "./types";

export interface PresetPromptDetails {
  id: WorkloadPreset;
  name: string;
  category: string;
  tag: string;
  purpose: string;
  targetStressDimension: string;
  promptTokens: number;
  genTokens: number;
  prompt: string;
}

export const WORKLOAD_PROMPT_PREVIEWS: Record<WorkloadPreset, PresetPromptDetails> = {
  rate_limit_probe: {
    id: "rate_limit_probe",
    name: "Rate Limit & Quota Probing",
    category: "rate_limit",
    tag: "Micro-call / 429 Probe",
    purpose: "Probe RPM/TPM ceilings, HTTP 429 backoff thresholds, and ingress queue capacity with near-zero token cost.",
    targetStressDimension: "API Gateway 429 Quota & Concurrency Ceilings",
    promptTokens: 5,
    genTokens: 2,
    prompt: "PING. Reply with exactly: PONG",
  },
  prefill_ttft: {
    id: "prefill_ttft",
    name: "Prefill Scaling & TTFT",
    category: "latency",
    tag: "Prefill & TTFT",
    purpose: "Heavy architecture context with minimal 1-token output isolating pure KV prefill computation speed and prompt tok/s.",
    targetStressDimension: "KV Prefill Velocity (Prompt tok/s) & TTFT Tail Percentiles (P95/P99)",
    promptTokens: 4000,
    genTokens: 2,
    prompt: `# HIGH-THROUGHPUT DISTRIBUTED INFERENCE ENGINE SPECIFICATION
Document ID: SPEC-INF-2026-V4 | Revision: 4.8.2-PROD | Classification: Internal Infrastructure Standard

## 1. DISTRIBUTED MEMORY HIERARCHY & KV CACHE ARCHITECTURE
The serving engine utilizes a unified paged memory virtualizer (PagedAttention v3) across multi-GPU tensor-parallel domains. 
Physical High Bandwidth Memory (HBM3e) is partitioned into fixed-size physical memory blocks of 16 tokens each (128 bytes per token per layer at FP16, or 64 bytes at FP8 quantization).
Logical key-value cache sequences are mapped to non-contiguous physical blocks via a centralized Block Table Manager operating at sub-microsecond lookup latency.

### 1.1 Block Allocation and Fragmentation Management
- Zero internal fragmentation is maintained by allocating blocks on-demand during autoregressive decode iterations.
- External fragmentation is bounded below 0.4% through a lock-free buddy allocation bitmap operating over NUMA-aligned host staging memory.
- Cross-GPU synchronization utilizes NVIDIA NVLink 4.0 interconnects delivering 900 GB/s bidirectional bandwidth per GPU in an 8-GPU SXM5 topology.

### 1.2 Prefix Caching & Radix Tree Virtualization
The engine maintains an in-memory Radix Tree indexing hash digests of all processed prompt prefixes.
When an incoming request arrives:
1. The prefix tokenizer hashes token ID chunks of size N=64 using xxHash64.
2. The Radix Tree is traversed from root to leaf to identify the longest matching cached prefix block chain.
3. Matching physical KV blocks are pinned in VRAM, incrementing their reference count without recomputing self-attention matrices.
4. Prefill compute is scheduled exclusively for the un-cached delta tokens, reducing Time-to-First-Token (TTFT) by up to 85% on recurrent prompt templates.

## 2. CONTINUOUS ITERATION-LEVEL BATCHING & CHUNKED PREFILL
To eliminate head-of-line blocking caused by disparate prompt lengths, the scheduler executes dynamic chunked prefill co-scheduled with decode steps:
- A global compute budget C_max = 4096 tokens per iteration is enforced across the accelerator cluster.
- Long prompt prefills are partitioned into contiguous chunks of size B_prefill = 512 tokens.
- Decode requests currently in progress are prioritized to guarantee steady Inter-Token Latency (ITL) under 25ms.
- Remaining iteration compute capacity is allocated to prefill chunks in ascending order of arrival timestamps.

Task: Acknowledge complete ingestion and validation of the distributed inference engine architectural specification. Reply with the single word 'READY' and no additional text.`,
  },
  decode_throughput: {
    id: "decode_throughput",
    name: "Streaming Decode & Jitter",
    category: "throughput",
    tag: "Decode & ITL",
    purpose: "Light prompt with long decode stream measuring sustained decode TPS, ITL jitter percentiles, and memory bandwidth stalls.",
    targetStressDimension: "Sustained Decode Throughput (tok/s), ITL Jitter (P95/P99), and TPOT Stability",
    promptTokens: 40,
    genTokens: 800,
    prompt: `Author an exhaustive, production-grade technical engineering guide on Designing Low-Latency Streaming Telemetry Systems at Massive Scale. Provide in-depth architectural explanations, concrete algorithmic implementations, and failure modes across five core domains: 1. Zero-copy ring-buffer memory management and kernel bypass (eBPF / io_uring); 2. Sliding-window stream aggregation and high-throughput lock-free data structures; 3. Adaptive backpressure and credit-based flow control mechanisms; 4. Fault-tolerant distributed consensus and sub-millisecond failover protocols; 5. Inter-Token Latency (ITL) jitter elimination and tail latency SLA governance. Write with rigorous technical depth and comprehensive operational insights.`,
  },
  reasoning_cot: {
    id: "reasoning_cot",
    name: "Reasoning & CoT Deep-Dive",
    category: "reasoning",
    tag: "Reasoning & TTFA",
    purpose: "Complex multi-constraint fleet scheduling and mathematical DAG optimization triggering deep Chain-of-Thought thinking.",
    targetStressDimension: "Time-to-First-Answer (TTFA), Thinking Token Multiplier & Reasoning Efficiency",
    promptTokens: 300,
    genTokens: 800,
    prompt: `You are the Principal Infrastructure Architect designing a multi-tier distributed scheduling engine for a heterogeneous inference fleet. You have three node classes:
- Cluster Alpha: 8x H100 SXM5, 640GB VRAM, $24.00/hr, prefill throughput 4200 tok/s, decode throughput 160 tok/s.
- Cluster Beta: 4x A100 SXM4, 320GB VRAM, $12.00/hr, prefill throughput 1800 tok/s, decode throughput 85 tok/s.
- Cluster Gamma: 64-core AMD EPYC CPU nodes, 512GB DDR5 RAM, $1.50/hr, embedding/reranking throughput 12,000 items/s.

You must schedule an incoming stream of 500 concurrent requests with the following interdependent execution pipeline DAG:
1. Task T1 (Context Chunking & Embedding): 120ms CPU or 15ms GPU.
2. Task T2 (Prefill & KV Cache Insertion): 2,000 prompt tokens per request.
3. Task T3 (Speculative Draft Decoding): 50 candidate tokens.
4. Task T4 (Target Verification): 50 tokens with 78% acceptance rate.
5. Task T5 (Post-processing & Guardrail JSON Validation): 25ms CPU or 8ms GPU.

Constraints & Objectives:
1. Strict P99 End-to-End SLA deadline is 450ms per request.
2. GPU VRAM occupancy cannot exceed 88% on any node to prevent OOM panics.
3. Minimize total hourly operating cost while maintaining zero SLA breaches.

Formulate the formal optimization problem, evaluate all partitioning combinations across clusters Alpha, Beta, and Gamma, prove the mathematical bottleneck on the critical path under queueing saturation (M/M/k model), and output the exact provably optimal resource assignment matrix with step-by-step reasoning.`,
  },
  agentic_tool_calling: {
    id: "agentic_tool_calling",
    name: "Agentic Tool & Function Calling",
    category: "agentic",
    tag: "Function Invocation",
    purpose: "Multi-tool JSON schema signatures evaluating function invocation latency, schema correctness, and argument precision under incident pressure.",
    targetStressDimension: "Tool Calling Latency, Argument Validity % & Constrained TPS",
    promptTokens: 1200,
    genTokens: 150,
    prompt: `You are an Autonomous Site Reliability Engineering (SRE) Agent for a global cloud platform.
Tools Available: query_cluster_telemetry, trigger_remediation_playbook, create_incident_ticket, schedule_canary_rollback.

[ACTIVE PRODUCTION INCIDENT ALERT]
Target: Service 'inference-gateway-prod' on Cluster 'k8s-gpu-cluster-04' (us-east-1).
Symptoms: P99 TTFT degraded to 2450ms, KV cache VRAM at 99.8% with 42 consecutive block eviction stalls.
Policy: When P99 TTFT > 1500ms and VRAM > 95%, invoke 'PB-AUTOSCALE-KV-04' to scale replicas by +4 and evict stale KV cache.

Output strictly the single JSON function call invocation for trigger_remediation_playbook.`,
  },
  fewshot_classification: {
    id: "fewshot_classification",
    name: "Few-Shot In-Context Classification",
    category: "latency",
    tag: "Classification / ICL",
    purpose: "12 rich enterprise incident exemplars evaluating in-context classification latency and rapid single-turn routing.",
    targetStressDimension: "In-Context Learning TTFT, E2E Latency & Classification Goodput",
    promptTokens: 1200,
    genTokens: 10,
    prompt: `Classify incoming enterprise support escalations into strict JSON schema with fields:
category: ["billing_dispute", "auth_sso_failure", "gpu_hardware_fault", "rate_limit_breach", "data_corruption_risk", "security_vulnerability"]
severity: ["SEV-1", "SEV-2", "SEV-3", "SEV-4"]
tier: ["tier_1_mission_critical", "tier_2_business_standard", "tier_3_basic"]
requires_human_pager: boolean
confidence: float between 0.00 and 1.00

### Exemplars (12 production cases including SAML SSO auth, double-bit ECC GPU faults, WAL checksum mismatch, S3 bucket permissions)...
### Input Escalation:
Message: "URGENT ESCALATION: All production inference calls to cluster 'k8s-gpu-us-east-1' are returning HTTP 429 Rate Limit Exceeded with Retry-After 60s, completely halting payment processing across our entire e-commerce checkout flow ($2.4M/hr volume). We require immediate quota expansion and executive bridge."

Classification:`,
  },
  code_generation: {
    id: "code_generation",
    name: "Code Generation & Syntax Stream",
    category: "code_structured",
    tag: "Developer Workflow",
    purpose: "Complex typed rate limiter implementation measuring code generation throughput, syntactic indentation speed, and token jitter.",
    targetStressDimension: "Code Syntax Token Rate, Indentation ITL Jitter & TPOT Mean",
    promptTokens: 1500,
    genTokens: 800,
    prompt: `You are a Principal Systems Engineer implementing a mission-critical, high-concurrency Rate Limiting and Token Bucket engine in Python 3.12 for an asynchronous LLM gateway.
Implement AdaptiveSlidingWindowRateLimiter supporting fractional token refilling, per-client striped locks, full jitter exponential backoff, background state eviction, strict typing (mypy strict), and complete pytest test cases.`,
  },
  rag_synthesis: {
    id: "rag_synthesis",
    name: "Enterprise RAG Synthesis",
    category: "heavy_context",
    tag: "Enterprise RAG",
    purpose: "Dense 5-document enterprise architectural specification evaluating multi-source cross-referencing, conflict resolution, and citation synthesis.",
    targetStressDimension: "RAG Ingestion TTFT, Prefill/Decode Balance & Grounded Goodput",
    promptTokens: 3500,
    genTokens: 400,
    prompt: `Synthesize 5 enterprise technical documents ([DOC-ARCH-001: Consensus Protocols], [DOC-OPS-004: Database Failover], [DOC-SLA-012: Tier-1 Recovery Targets], [DOC-SEC-019: Cross-Zone Encryption], [DOC-NET-033: BGP Failover]) to answer a disaster recovery audit inquiry with exact document citations.`,
  },
  multimodal_vision: {
    id: "multimodal_vision",
    name: "Multimodal Vision & OCR",
    category: "heavy_context",
    tag: "Vision & OCR",
    purpose: "High-resolution 4K system topology diagram and telemetry heatmap evaluating vision encoder projection latency and OCR layout extraction.",
    targetStressDimension: "Multimodal Prefill Latency, Vision Encoder Overhead & TTFT P95",
    promptTokens: 1800,
    genTokens: 200,
    prompt: `[MULTIMODAL VISION TOKEN PAYLOAD: High-Resolution 4K Architecture Topology Diagram & Telemetry Dashboard]
Perform exhaustive OCR and topological analysis: identify the primary saturated hardware bottleneck, report VRAM allocation and decode throughput for degraded nodes, and recommend architectural remediation.`,
  },
  multiturn_agentic: {
    id: "multiturn_agentic",
    name: "Multi-Turn Session Context",
    category: "agentic",
    tag: "Session Continuity",
    purpose: "Deep 5-turn collaborative DevOps incident response history evaluating KV cache expansion and turn latency drift.",
    targetStressDimension: "Turn Latency Drift, KV Memory Expansion & Context Retention",
    promptTokens: 2500,
    genTokens: 350,
    prompt: `System: You are an expert Site Reliability Engineer collaborating on an active triage incident in a high-concurrency LLM inference platform.
[Turns 1 through 4 detailing HoL blocking diagnosis, chunked prefill tuning, NUMA binding, Envoy circuit breaker tuning, leading into Turn 4 evaluation of cross-region KV cache synchronization vs local prefill]`,
  },
  kv_cache_reuse: {
    id: "kv_cache_reuse",
    name: "Prompt Prefix Cache Warm / Hit",
    category: "latency",
    tag: "KV Cache Hit",
    purpose: "Deterministic static architecture specification measuring KV cache hit speedup ratio, TTFT reduction, and caching discount throughput.",
    targetStressDimension: "Cached TTFT Speedup Factor, Cache Hit % & Token Discount Velocity",
    promptTokens: 3200,
    genTokens: 150,
    prompt: `[STATIC SYSTEM ARCHITECTURE & API REFERENCE DOCUMENTATION - PREFIX CACHE TARGET]
Comprehensive LLMark Platform Architecture Standard defining TTFT, TPOT, ITL, Goodput, and Radix-Tree prefix caching algorithms, followed by a dynamic query testing instant cached retrieval.`,
  },
  long_context_retrieval: {
    id: "long_context_retrieval",
    name: "Long-Context & Needle Retrieval",
    category: "heavy_context",
    tag: "16k Needle Context",
    purpose: "Massive 16k-token distributed trace log stream with 3 embedded cryptographic and operational needles at 15%, 50%, and 85% depth.",
    targetStressDimension: "16k Context Attention Compute Scaling, Memory Pressure & Tail TTFT P99",
    promptTokens: 16000,
    genTokens: 300,
    prompt: `# ENTERPRISE DISTRIBUTED SYSTEM AUDIT TRACE LOG (16k tokens)
Contains 3 distinct configuration needles embedded across context depth:
1. PRIMARY_SECURITY_CERTIFICATE_THUMBPRINT
2. OPTIMAL_KV_BLOCK_SIZE_BYTES
3. GLOBAL_DISASTER_RECOVERY_OVERRIDE
Extract all 3 values and calculate peak memory saturation percentage.`,
  },
  summarization_distill: {
    id: "summarization_distill",
    name: "Document Summarization & Distillation",
    category: "throughput",
    tag: "Text Distillation",
    purpose: "Dense 4,500-token Annual Platform Scalability, Infrastructure Unit Economics, and FinOps Audit Report evaluating information compression speed.",
    targetStressDimension: "Dense Document Prefill TTFT, Compression Speed & Structured Extraction",
    promptTokens: 4500,
    genTokens: 300,
    prompt: `# ANNUAL INFRASTRUCTURE SCALABILITY, RELIABILITY & FINANCIAL AUDIT REPORT (4.5k tokens)
Synthesize an Executive Briefing covering: 1. Core Scalability & Workload Metrics; 2. Latency & Architectural Wins; 3. Unit Economics & FinOps Impact; 4. Critical Incident Vulnerabilities & 12-Month Roadmap.`,
  },
  structured_json: {
    id: "structured_json",
    name: "Structured JSON & Grammar",
    category: "code_structured",
    tag: "Grammar Constraint",
    purpose: "Guided JSON grammar decoding with schema constraints evaluating parser compliance, syntax validity, and constrained decode speed.",
    targetStressDimension: "Grammar Constraint Compliance %, Constrained TPS & Schema Parse Validity",
    promptTokens: 600,
    genTokens: 300,
    prompt: `Return a strictly valid JSON object representing a real-time cluster health and telemetry snapshot matching the defined JSON schema with nodes array, aggregated metrics, and active alerts.`,
  },
  chat_interactive: {
    id: "chat_interactive",
    name: "Interactive Conversational",
    category: "latency",
    tag: "Conversational UI",
    purpose: "Balanced conversational prompt evaluating end-user perceived responsiveness, reading speed, and decode cadence.",
    targetStressDimension: "Interactive TTFT (P50/P95), ITL Streaming Smoothness & Reading Speed",
    promptTokens: 200,
    genTokens: 150,
    prompt: `As a Principal Distributed Systems Architect, explain the core technical trade-offs between Server-Sent Events (SSE), WebSockets, and HTTP/2 Long-Polling when building high-concurrency real-time streaming dashboards for LLM inference monitoring.`,
  },
  custom: {
    id: "custom",
    name: "Custom Workload Studio",
    category: "custom",
    tag: "User Custom",
    purpose: "User-defined prompt payload, custom token bounds, and full telemetry matrix.",
    targetStressDimension: "Full Multi-Metric Evaluation Suite (User Defined)",
    promptTokens: 500,
    genTokens: 500,
    prompt: `Provide a detailed technical evaluation of speculative decoding, chunked prefill, and paged KV memory architectures in modern LLM serving engines.`,
  },
  // Legacy aliases
  tool_calling: {
    id: "tool_calling",
    name: "Agentic Tool & Function Calling",
    category: "agentic",
    tag: "Function Invocation",
    purpose: "Legacy alias for agentic_tool_calling",
    targetStressDimension: "Tool Calling Latency & Schema Validity",
    promptTokens: 1200,
    genTokens: 150,
    prompt: "See agentic_tool_calling",
  },
  code: {
    id: "code",
    name: "Code Generation & Syntax Stream",
    category: "code_structured",
    tag: "Developer Workflow",
    purpose: "Legacy alias for code_generation",
    targetStressDimension: "Code Syntax Token Rate & Jitter",
    promptTokens: 1500,
    genTokens: 800,
    prompt: "See code_generation",
  },
  long_context: {
    id: "long_context",
    name: "Long-Context & Needle Retrieval",
    category: "heavy_context",
    tag: "16k Needle Context",
    purpose: "Legacy alias for long_context_retrieval",
    targetStressDimension: "16k Context Attention Scaling",
    promptTokens: 16000,
    genTokens: 300,
    prompt: "See long_context_retrieval",
  },
  summarization: {
    id: "summarization",
    name: "Document Summarization & Distillation",
    category: "throughput",
    tag: "Text Distillation",
    purpose: "Legacy alias for summarization_distill",
    targetStressDimension: "Document Prefill TTFT & Compression Speed",
    promptTokens: 4500,
    genTokens: 300,
    prompt: "See summarization_distill",
  },
  chat: {
    id: "chat",
    name: "Interactive Conversational",
    category: "latency",
    tag: "Conversational UI",
    purpose: "Legacy alias for chat_interactive",
    targetStressDimension: "Interactive TTFT & Reading Speed",
    promptTokens: 200,
    genTokens: 150,
    prompt: "See chat_interactive",
  },
  rag: {
    id: "rag",
    name: "Enterprise RAG Synthesis",
    category: "heavy_context",
    tag: "Enterprise RAG",
    purpose: "Legacy alias for rag_synthesis",
    targetStressDimension: "RAG Ingestion TTFT & Grounded Goodput",
    promptTokens: 3500,
    genTokens: 400,
    prompt: "See rag_synthesis",
  },
  vision: {
    id: "vision",
    name: "Multimodal Vision & OCR",
    category: "heavy_context",
    tag: "Vision & OCR",
    purpose: "Legacy alias for multimodal_vision",
    targetStressDimension: "Multimodal Prefill Latency",
    promptTokens: 1800,
    genTokens: 200,
    prompt: "See multimodal_vision",
  },
  json_schema: {
    id: "json_schema",
    name: "Structured JSON & Grammar",
    category: "code_structured",
    tag: "Grammar Constraint",
    purpose: "Legacy alias for structured_json",
    targetStressDimension: "Grammar Constraint Compliance %",
    promptTokens: 600,
    genTokens: 300,
    prompt: "See structured_json",
  },
};
