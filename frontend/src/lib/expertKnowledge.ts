export interface ExpertArticle {
  id: string;
  topic: string;
  badge: string;
  defaultQuestion: string;
  suggestedFollowups: string[];
  markdown: string;
}

export interface QuestionAnswer {
  question: string;
  keywords: string[];
  topic: string;
  badge: string;
  answer: string;
  followups: string[];
}

export const EXPERT_KNOWLEDGE: Record<string, ExpertArticle> = {
  "workload-preset": {
    id: "workload-preset",
    topic: "Workload Scenarios & Prompt-to-Gen Ratios",
    badge: "Step 2A • Workloads",
    defaultQuestion: "How do token ratios (prefill vs. decode) affect benchmarking results?",
    suggestedFollowups: [
      "Why is TTFT critical for RAG vs. Chat?",
      "How to benchmark reasoning (CoT) models?",
      "What is the difference between TTFT and TTFA?",
    ],
    markdown: `### 🧩 Workload Profiles & Token Arithmetic

In LLM inference, performance is split into two fundamentally different compute phases:

1. **Prefill Phase (Prompt Ingestion)**:
   - **Compute Bound (FLOPs)**: Processing thousands of prompt tokens concurrently saturates GPU Tensor Cores.
   - **Metric**: Time to First Token (**TTFT**), measured in milliseconds.
   - **Workload examples**: Enterprise RAG, Document Summarization, Long-Context Q&A.

2. **Decode Phase (Autoregressive Generation)**:
   - **Memory Bandwidth Bound (GB/s)**: Fetching gigabytes of model weights and KV cache tensors from High Bandwidth Memory (HBM) for every single generated token.
   - **Metric**: Time Per Output Token (**TPOT**) or Inter-Token Latency (**ITL**).
   - **Workload examples**: Creative Writing, Code Generation, Reasoning Steps.

> **💡 Best Practice**: Always benchmark with realistic input/output distributions rather than arbitrary dummy tokens.`,
  },
  "sampling-params": {
    id: "sampling-params",
    topic: "Sampling Hyperparameters & Output Entropy",
    badge: "Step 2B • Sampling",
    defaultQuestion: "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
    suggestedFollowups: [
      "Why use Temperature = 0 for throughput tests?",
      "How does sampling affect token jitter & ITL?",
      "What happens when Max Tokens is reached?",
    ],
    markdown: `### 🌡️ Sampling Parameters & Jitter Analysis

- **Temperature = 0.0 (Argmax / Greedy)**:
  - Selects the single highest probability token at each step ($T \\to 0$).
  - **Zero Entropy Variance**: Every run with the same prompt produces identical token count and output trajectory.
  - **Recommended for Hardware & Concurrency Sizing**: Removes token length variance across worker streams.

- **Temperature > 0.7 (Creative Softmax)**:
  - Flattens the probability distribution across vocabulary tokens.
  - Introduces non-deterministic stop token timings and slight decode jitter.

- **Top-P (Nucleus Sampling)**:
  - Dynamically truncates the probability mass to the cumulative top $P$ tokens (e.g., top 90%).
  - Prevents low-probability tail tokens from being sampled without restricting diversity.`,
  },
  "traffic-concurrency": {
    id: "traffic-concurrency",
    topic: "Concurrency Workers & Queue Saturation",
    badge: "Step 3A • Concurrency",
    defaultQuestion: "How do I choose the right concurrency worker pool for stress testing?",
    suggestedFollowups: [
      "How to find the saturation cliff of a cluster?",
      "What is the relationship between RPS and concurrency?",
      "When does TTFT degrade exponentially?",
    ],
    markdown: `### ⚡ Concurrency & Worker Streams

**Concurrency ($N$)** represents the number of simultaneous active HTTP streaming connections hitting the model endpoint:

$$\\text{Throughput (RPS)} = \\frac{\\text{Concurrency}}{\\text{Mean Latency (seconds)}}$$

- **Under-saturation ($N < N_{\\text{knee}}$)**: GPU compute units are under-utilized. TTFT remains low and stable.
- **Optimal Saturation ($N = N_{\\text{knee}}$)**: Continuous batching (e.g. vLLM, TensorRT-LLM, TGI) achieves maximum aggregate tokens/second throughput.
- **Over-saturation ($N > N_{\\text{knee}}$)**: KV cache slots run out in VRAM. The inference scheduler buffers incoming requests in CPU queue, causing TTFT tail latencies (P95/P99) to spike dramatically (Little's Law: $L_q = \\lambda W_q$).`,
  },
  "load-curve": {
    id: "load-curve",
    topic: "Traffic Load Curves & Saturation Knee Probe",
    badge: "Step 3B • Load Geometry",
    defaultQuestion: "What is the Saturation Knee Probe and how does it detect cluster limits?",
    suggestedFollowups: [
      "Why is Constant load not enough for production testing?",
      "How does Poisson arrival model human traffic?",
      "How to simulate traffic spikes safely?",
    ],
    markdown: `### 📈 Load Curve Geometries

1. **Constant**: Steady stream of workers for baseline throughput measurement.
2. **Step Ramp (Staircase)**: Gradually scales concurrency (e.g. $5 \\to 10 \\to 25 \\to 50$) to visualize where latency inflection begins.
3. **Poisson Arrival**: Stochastic inter-arrival times ($P(t) = \\lambda e^{-\\lambda t}$) simulating random real-world client requests.
4. **Spike / Stress Wave**: Instantaneous 4x surge to test gateway rate limiters and autoscaler warm-up lag.
5. **Saturation Knee Probe (1→3→8→16→50)**:
   - Progressively loads the model until the KV cache exhaustion cliff is identified.
   - Pinpoints the exact capacity limit before requests suffer queuing timeouts.`,
  },
  "caching-vram": {
    id: "caching-vram",
    topic: "KV Cache Semantics, Cold Nonce & Hardware VRAM",
    badge: "Step 3C • Hardware & Cache",
    defaultQuestion: "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
    suggestedFollowups: [
      "How much speedup does prompt prefix caching provide?",
      "How is KV cache memory calculated per stream?",
      "Why do warmup requests matter?",
    ],
    markdown: `### 🧊 Cold Prefill vs. Warm KV Cache

Modern LLM endpoints (OpenAI, Anthropic Claude, vLLM, DeepSeek) implement **shared prefix caching** (e.g., Radix Attention or PagedAttention). Repeated prompts hit cached KV states in GPU memory, bypassing prefill compute.

- **Bypass KV Cache (Unique Nonce)**:
  - Appends a dynamic timestamp nonce to the prompt.
  - **Forces true cold GPU prefill** across all tensor cores on every stream.
  - Essential for benchmarking hardware capacity and worst-case SLA guarantees.

- **Warmup Requests**:
  - Discard first $N$ requests to prime TCP handshakes, TLS negotiation, and DNS pools so connection latency doesn't distort model metrics.`,
  },
  "slo-goodput": {
    id: "slo-goodput",
    topic: "SLO Reliability Sieve & Goodput Formula",
    badge: "Step 4A • SLOs",
    defaultQuestion: "What is Goodput and why is it superior to Raw Throughput?",
    suggestedFollowups: [
      "What are standard production SLO thresholds?",
      "How does TPOT differ from ITL?",
      "How does the 3-stage reliability sieve work?",
    ],
    markdown: `### 🎯 Goodput vs. Raw Throughput

**Raw Throughput** counts every token generated, even if a user waited 20 seconds for the first token or experienced frozen streams.

**Goodput** only counts requests that pass **all 4 SLA Gates**:
1. $\\text{TTFT} \\le \\text{Max TTFT threshold}$ (e.g. $\\le 800\\text{ms}$)
2. $\\text{TPOT} \\le \\text{Max TPOT threshold}$ (e.g. $\\le 35\\text{ms/tok}$)
3. $\\text{E2E Duration} \\le \\text{Max E2E threshold}$ (e.g. $\\le 10\\text{s}$)
4. $\\text{Status Code} = 200\\text{ OK}$ (No 429 rate limit or 5xx failures)

$$\\text{Goodput (tok/s)} = \\frac{\\sum \\text{Tokens of Passing Requests}}{\\text{Total Benchmark Elapsed Time (s)}}$$`,
  },
  "spend-guardrails": {
    id: "spend-guardrails",
    topic: "Token Economics & Hard Spend Cap Circuit Breaker",
    badge: "Step 4B • Budget",
    defaultQuestion: "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
    suggestedFollowups: [
      "How is benchmark cost calculated in real time?",
      "What happens when the spend cap is hit?",
      "How to input custom provider token pricing?",
    ],
    markdown: `### 💰 Financial Guardrails & Spend Caps

- **Zero Bill-Shock Circuit Breaker**:
  - LLMark continuously tallies input and output tokens across all active threads.
  - If cumulative cost reaches the **Hard Spend Cap** ($), the orchestrator triggers an immediate abort signal within $\\le 50\\text{ms}$.
  - Partial results are saved cleanly to database history.

- **Cost Formula**:
  $$\\text{Estimated Cost} = \\left(\\frac{T_{\\text{prompt}} \\times P_{\\text{in}}}{10^6}\\right) + \\left(\\frac{T_{\\text{gen}} \\times P_{\\text{out}}}{10^6}\\right) \\times N_{\\text{reqs}}$$`,
  },
  "provider-routing": {
    id: "provider-routing",
    topic: "Provider Wire Protocols & Connection Routing",
    badge: "Step 1A • Protocols",
    defaultQuestion: "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
    suggestedFollowups: [
      "What causes connection latency overhead in cloud endpoints?",
      "How to configure custom vLLM / Ollama endpoints?",
      "Why is HTTP/2 or HTTP/3 connection reuse critical?",
    ],
    markdown: `### 🌐 Provider Wire Protocols & Telemetry Overhead

- **Server-Sent Events (SSE)**:
  - Standard streaming protocol across OpenAI, Anthropic, and vLLM.
  - Generates \`data: { ... }\` chunks for every decoded token.
  - **Latency impact**: Network chunk aggregation and Nagle's algorithm can cause artificial token jitter unless \`TCP_NODELAY\` is enabled.

- **Authentication & Handshake Physics**:
  - TLS 1.3 negotiation adds $\\approx 1\\text{ RTT}$ (Round Trip Time) before prefill starts ($30\\text{--}80\\text{ms}$ based on cloud region proximity).
  - Use **Warmup Requests** to establish persistent TCP/TLS sockets before capturing production latency metrics.`,
  },
  "model-sizing": {
    id: "model-sizing",
    topic: "Model Architecture & Parameter Sizing",
    badge: "Step 1B • Model Sizing",
    defaultQuestion: "How does model parameter size influence prefill vs decode memory bandwidth?",
    suggestedFollowups: [
      "How do MoE (Mixture of Experts) models behave under load?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "How does quantization (FP8/INT4) affect TPS?",
    ],
    markdown: `### 🧠 Model Architecture & Memory Bandwidth

- **Dense Models (e.g. Llama-3-8B / 70B)**:
  - Every token during decode requires reading 100% of active model parameters from GPU HBM.
  - Decode speed is strictly bounded by HBM bandwidth:
    $$\\text{Max TPOT} \\approx \\frac{\\text{Model Weight Bytes}}{\\text{GPU Memory Bandwidth (TB/s)}}$$

- **Mixture of Experts (MoE, e.g. DeepSeek-V3 / Mixtral)**:
  - Ingests prompts through active expert sub-networks (e.g. 37B active out of 671B total).
  - Offers higher decode generation throughput per GPU while maintaining high reasoning quality.`,
  },
};

export interface TopicPromptGroup {
  title: string;
  badge: string;
  defaultQuestion: string;
  questions: string[];
}

export const TOPIC_SUGGESTED_QUESTIONS: Record<string, TopicPromptGroup> = {
  "workload-preset": {
    title: "Workload Profiles & Token Ratios",
    badge: "Step 2A • Workloads",
    defaultQuestion: "How do token ratios (prefill vs. decode) affect benchmarking results?",
    questions: [
      "How do token ratios (prefill vs. decode) affect benchmarking results?",
      "Why is TTFT critical for RAG vs. Chat?",
      "How to benchmark reasoning (CoT) models?",
      "What is the difference between TTFT and TTFA?",
      "How does model parameter size influence prefill vs decode memory bandwidth?",
    ],
  },
  "sampling-params": {
    title: "Sampling Hyperparameters & Output Entropy",
    badge: "Step 2B • Sampling",
    defaultQuestion: "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
    questions: [
      "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
      "Why use Temperature = 0 for throughput tests?",
      "How does sampling affect token jitter & ITL?",
      "What happens when Max Tokens is reached?",
    ],
  },
  "traffic-concurrency": {
    title: "Concurrency Workers & Queue Saturation",
    badge: "Step 3A • Concurrency",
    defaultQuestion: "How do I choose the right concurrency worker pool for stress testing?",
    questions: [
      "How do I choose the right concurrency worker pool for stress testing?",
      "How to find the saturation cliff of a cluster?",
      "What is the relationship between RPS and concurrency?",
      "When does TTFT degrade exponentially?",
    ],
  },
  "load-curve": {
    title: "Traffic Load Curves & Saturation Knee",
    badge: "Step 3B • Load Geometry",
    defaultQuestion: "What is the Saturation Knee Probe and how does it detect cluster limits?",
    questions: [
      "What is the Saturation Knee Probe and how does it detect cluster limits?",
      "Why is Constant load not enough for production testing?",
      "How does Poisson arrival model human traffic?",
      "How to simulate traffic spikes safely?",
    ],
  },
  "caching-vram": {
    title: "KV Cache Semantics & Hardware VRAM",
    badge: "Step 3C • Hardware & Cache",
    defaultQuestion: "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
    questions: [
      "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
      "How much speedup does prompt prefix caching provide?",
      "How is KV cache memory calculated per stream?",
      "Why do warmup requests matter?",
      "What is the VRAM footprint of 8B vs 70B models?",
    ],
  },
  "slo-goodput": {
    title: "SLO Reliability Sieve & Goodput Formula",
    badge: "Step 4A • SLOs",
    defaultQuestion: "What is Goodput and why is it superior to Raw Throughput?",
    questions: [
      "What is Goodput and why is it superior to Raw Throughput?",
      "What are standard production SLO thresholds?",
      "How does TPOT differ from ITL?",
      "How does the 3-stage reliability sieve work?",
    ],
  },
  "spend-guardrails": {
    title: "Token Economics & Hard Spend Cap Circuit Breaker",
    badge: "Step 4B • Budget",
    defaultQuestion: "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
    questions: [
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
      "How is benchmark cost calculated in real time?",
      "What happens when the spend cap is hit?",
      "How to input custom provider token pricing?",
    ],
  },
  "provider-routing": {
    title: "Wire Protocols & Connection Latency",
    badge: "Step 1A • Wire Protocols",
    defaultQuestion: "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
    questions: [
      "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
      "What causes connection latency overhead in cloud endpoints?",
      "Why is HTTP/2 or HTTP/3 connection reuse critical?",
      "How to configure custom vLLM / Ollama endpoints?",
    ],
  },
  "model-sizing": {
    title: "Model Parameter Sizing & Quantization",
    badge: "Step 1B • Model Sizing",
    defaultQuestion: "How does quantization (FP8/INT4) affect TPS?",
    questions: [
      "How does quantization (FP8/INT4) affect TPS?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "How do MoE (Mixture of Experts) models behave under load?",
      "How does model parameter size influence prefill vs decode memory bandwidth?",
    ],
  },
};

/**
 * Dedicated Question-Answer mappings for every prefilled & suggested question.
 */
export const DEDICATED_QA_ANSWERS: QuestionAnswer[] = [
  {
    question: "Why is TTFT critical for RAG vs. Chat?",
    keywords: ["ttft", "rag", "chat", "prefill", "retrieval", "context"],
    topic: "TTFT Dynamics in RAG Architectures",
    badge: "Step 2A • RAG Latency",
    answer: `### 🔍 Why TTFT Dominates RAG Latency

In **Retrieval-Augmented Generation (RAG)** systems, prompts contain extensive retrieved context (typically $3{,}000\\text{--}16{,}000$ tokens of vector embeddings, chunked markdown, or SQL schemas).

1. **Compute Phase Breakdown**:
   - In standard Chat ($200$ prompt tokens), prefill finishes in under $\\le 40\\text{ms}$.
   - In heavy RAG ($8{,}000$ prompt tokens), the GPU must calculate self-attention across $(8000)^2 = 6.4 \\times 10^7$ token pairs during the prefill phase.
2. **User Perceived Latency**:
   - The user stares at a blank screen until the first token streams back. TTFT represents **85%+ of the total perceived response time** in RAG pipelines.
3. **KV Cache Optimization**:
   - Using prefix caching or prompt compression is essential to keep RAG TTFT below $\\le 1.2\\text{s}$.`,
    followups: [
      "How to benchmark reasoning (CoT) models?",
      "What is the difference between TTFT and TTFA?",
      "How much speedup does prompt prefix caching provide?",
    ],
  },
  {
    question: "How to benchmark reasoning (CoT) models?",
    keywords: ["reasoning", "cot", "chain of thought", "deepseek-r1", "o1", "thinking"],
    topic: "Reasoning (Chain-of-Thought) Benchmarking",
    badge: "Step 2A • Reasoning Models",
    answer: `### 🧠 Benchmarking Chain-of-Thought (CoT) & Reasoning Models

Reasoning models (e.g. **DeepSeek-R1**, **OpenAI o1/o3-mini**) generate hidden internal "thinking tokens" before streaming the final user-facing response.

- **TTFT vs. TTFA (Time to First Answer)**:
  - Standard TTFT captures when the *first thinking token* is emitted.
  - **TTFA** measures the latency until the model finishes its reasoning chain and outputs the actual answer.
- **Generation Token Sizing**:
  - Reasoning runs routinely output $2{,}000\\text{--}8{,}000$ tokens per request. Set **Max Tokens $\\ge 4096$** to avoid cut-off calculations.
- **Concurrency Bottlenecks**:
  - Because each request stays in the GPU decode loop for $5\\text{--}30$ seconds, KV-cache memory fills up rapidly. Lower your concurrency pool ($N \\le 10$) when stress-testing reasoning endpoints.`,
    followups: [
      "What is the difference between TTFT and TTFA?",
      "How does model parameter size influence prefill vs decode memory bandwidth?",
      "How to find the saturation cliff of a cluster?",
    ],
  },
  {
    question: "What is the difference between TTFT and TTFA?",
    keywords: ["ttft", "ttfa", "first answer", "first token", "thinking"],
    topic: "TTFT vs. TTFA Metric Dissection",
    badge: "Step 2A • Latency Metrics",
    answer: `### ⏱️ TTFT vs. TTFA Explained

| Metric | Definition | Target Workloads | Production SLA Target |
| :--- | :--- | :--- | :--- |
| **TTFT** (Time to First Token) | Time elapsed from HTTP request dispatch until the very first SSE byte/token chunk arrives. | Standard Chat, RAG, Code Completion | $\\le 400\\text{--}800\\text{ms}$ |
| **TTFA** (Time to First Answer) | Time elapsed until the first **visible, user-facing answer token** is emitted (after stripping reasoning/thinking tokens). | CoT Reasoning (o1, R1), Agentic Planning | $\\le 3.0\\text{--}8.0\\text{s}$ |

> **Formula**: $\\text{TTFA} = \\text{TTFT} + (\\text{Thinking Tokens} \\times \\text{TPOT})$`,
    followups: [
      "Why is TTFT critical for RAG vs. Chat?",
      "What is Goodput and why is it superior to Raw Throughput?",
      "How does TPOT differ from ITL?",
    ],
  },
  {
    question: "Why use Temperature = 0 for throughput tests?",
    keywords: ["temperature = 0", "temp 0", "deterministic", "reproducible", "greedy", "throughput"],
    topic: "Deterministic Decoding at Temperature = 0",
    badge: "Step 2B • Determinism",
    answer: `### 🎯 Why Temperature = 0.0 is the Gold Standard for Benchmarks

Setting $\\text{Temperature} = 0.0$ forces **Argmax (Greedy) decoding**:

1. **Exact Reproducibility**:
   - At $T=0$, the model always picks the token with maximum probability $\\text{argmax}_i P(y_t = w_i)$.
   - Eliminates stochastic variance so you can compare two cloud providers or GPU instances with identical token output trajectories.
2. **Fixed Token Lengths**:
   - With temperature $> 0.7$, one worker stream might generate 180 tokens while another generates 420 tokens due to sampling paths.
   - At $T=0$, all concurrent streams stop at predictable token counts, isolating pure hardware throughput from entropy variance.`,
    followups: [
      "How does sampling affect token jitter & ITL?",
      "What happens when Max Tokens is reached?",
      "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
    ],
  },
  {
    question: "How does sampling affect token jitter & ITL?",
    keywords: ["jitter", "itl", "inter-token", "sampling", "entropy", "variance"],
    topic: "Sampling Entropy & Inter-Token Latency Jitter",
    badge: "Step 2B • Token Jitter",
    answer: `### 📊 Token Jitter & Inter-Token Latency (ITL)

**Inter-Token Latency (ITL)** is the time interval between consecutive token frames in an SSE stream.

- **High Temperature ($T > 1.0$)**:
  - Probability mass is spread evenly across vocabulary tokens.
  - Softmax sampling requires searching wider token tails, creating slight microsecond variance and variable sequence terminations.
- **Nucleus Top-P Filtering**:
  - Dynamically truncates the probability mass, which reduces the tail candidates and stabilizes decode loop step timing.
- **Continuous Batching Jitter**:
  - Real jitter in production is primarily caused by **iteration-level scheduling** (e.g. new requests entering prefill while other streams are decoding).`,
    followups: [
      "Why use Temperature = 0 for throughput tests?",
      "How does TPOT differ from ITL?",
      "What is Goodput and why is it superior to Raw Throughput?",
    ],
  },
  {
    question: "What happens when Max Tokens is reached?",
    keywords: ["max tokens", "generation bound", "finish_reason", "length"],
    topic: "Generation Bounds & Finish Reasons",
    badge: "Step 2B • Bounds",
    answer: `### 🛑 Max Tokens & Generation Bounds

When an autoregressive generation reaches the configured \`max_tokens\` bound:

1. The inference engine halts decoding immediately and returns \`finish_reason: "length"\` instead of \`"stop"\`.
2. **Benchmarking Impact**:
   - Setting a fixed \`max_tokens\` guarantees exact decode turn length across all concurrent worker threads.
   - Prevents runaway generation loops when testing uncalibrated prompts.`,
    followups: [
      "Why use Temperature = 0 for throughput tests?",
      "How do token ratios (prefill vs. decode) affect benchmarking results?",
      "How is KV cache memory calculated per stream?",
    ],
  },
  {
    question: "How to find the saturation cliff of a cluster?",
    keywords: ["saturation cliff", "saturation knee", "cluster limits", "knee probe", "overload"],
    topic: "Identifying the Saturation Cliff",
    badge: "Step 3A • Saturation",
    answer: `### 📉 Finding the Saturation Cliff ($N_{\\text{knee}}$)

The **Saturation Cliff** is the exact concurrency load where an LLM serving cluster transitions from hardware-limited to queue-delayed.

1. **Step-by-Step Probe**:
   - Run the **Saturation Knee Probe (1→3→8→16→32→64)**.
   - Measure **TTFT P95** and **Tokens/Second** at each step.
2. **The Inflection Signature**:
   - **Before Knee ($N < N_{\\text{knee}}$)**: TTFT is flat (e.g. $400\\text{ms}$), Throughput scales linearly ($100 \\to 300 \\to 800\\text{ tok/s}$).
   - **At the Knee ($N = N_{\\text{knee}}$)**: KV Cache slots reach $90\\%$ GPU allocation. Throughput plateaus.
   - **Past the Knee ($N > N_{\\text{knee}}$)**: Requests queue in CPU RAM. TTFT spikes exponentially ($400\\text{ms} \\to 4{,}500\\text{ms}$), and Goodput drops toward $0\\%$.`,
    followups: [
      "What is the relationship between RPS and concurrency?",
      "When does TTFT degrade exponentially?",
      "What is Goodput and why is it superior to Raw Throughput?",
    ],
  },
  {
    question: "What is the relationship between RPS and concurrency?",
    keywords: ["rps", "concurrency", "littles law", "throughput", "formula"],
    topic: "Little's Law & Concurrency-to-RPS Conversion",
    badge: "Step 3A • Queuing Theory",
    answer: `### 📐 Little's Law in LLM Queuing

$$\\text{Concurrency } (N) = \\text{Throughput } (\\lambda) \\times \\text{Mean Latency } (W)$$

- If your average request duration is $2.0\\text{ seconds}$ and you configure $20\\text{ concurrent streams}$:
  $$\\text{Target RPS} = \\frac{20}{2.0\\text{ s}} = 10\\text{ requests/second}$$
- In autoregressive LLMs, request duration depends on generation length. Long responses ($2{,}000$ tokens $\\approx 8\\text{s}$) require much higher concurrency pools to achieve the same target RPS.`,
    followups: [
      "How to find the saturation cliff of a cluster?",
      "When does TTFT degrade exponentially?",
      "How does Poisson arrival model human traffic?",
    ],
  },
  {
    question: "When does TTFT degrade exponentially?",
    keywords: ["ttft degrade", "exponential", "queue", "delay", "tail latency"],
    topic: "Exponential TTFT Queue Degradation",
    badge: "Step 3A • Queuing Delays",
    answer: `### ⚡ Why TTFT Spikes Exponentially

TTFT consists of two components:

$$\\text{TTFT} = W_q \\text{ (Queue Waiting Time)} + T_{\\text{prefill}} \\text{ (Compute Execution Time)}$$

1. **Under Normal Load ($M/M/1$ Queuing)**:
   - When GPU utilization $\\rho < 0.8$, queue wait $W_q \\approx 0$. $\\text{TTFT} \\approx T_{\\text{prefill}} \\approx 300\\text{ms}$.
2. **At Over-Saturation ($\\rho \\to 1.0$)**:
   - As GPU utilization approaches capacity:
     $$W_q = \\frac{\\rho}{\\mu (1 - \\rho)}$$
   - When $\\rho = 0.95$, queue time multiplies by $20\\times$. Incoming requests must wait for active decode turns to yield GPU memory slots before prefill can begin.`,
    followups: [
      "How to find the saturation cliff of a cluster?",
      "What is Goodput and why is it superior to Raw Throughput?",
      "How is KV cache memory calculated per stream?",
    ],
  },
  {
    question: "Why is Constant load not enough for production testing?",
    keywords: ["constant load", "synthetic", "realistic", "burst", "poisson", "production"],
    topic: "Why Constant Load Masks Production Bottlenecks",
    badge: "Step 3B • Load Profiles",
    answer: `### ⚠️ The Blind Spot of Constant Load Benchmarks

- **Artificial Uniformity**:
  - Constant load dispatches requests at clockwork intervals. In reality, human traffic arrives in stochastic clusters.
- **Hides Queue Head-of-Line Blocking**:
  - A real-world burst of 5 simultaneous $8{,}000$-token RAG requests will freeze all active decodes for $800\\text{ms}$. Constant load tests miss this phenomenon completely.
- **Recommendation**:
  - Always pair a Constant baseline with a **Poisson Arrival** test and a **Spike Waveform** to stress test rate limiters and memory pressure buffers.`,
    followups: [
      "How does Poisson arrival model human traffic?",
      "How to simulate traffic spikes safely?",
      "What is the Saturation Knee Probe and how does it detect cluster limits?",
    ],
  },
  {
    question: "How does Poisson arrival model human traffic?",
    keywords: ["poisson", "human traffic", "stochastic", "exponential", "lambda"],
    topic: "Poisson Arrival Process Dynamics",
    badge: "Step 3B • Poisson Dynamics",
    answer: `### 🌊 Poisson Arrival Process in LLM Benchmarking

Human client requests arrive independently at random timestamps. In LLMark:

1. Inter-arrival time $\\Delta t$ is sampled from an **Exponential Distribution**:
   $$P(\\Delta t) = \\lambda e^{-\\lambda \\Delta t}$$
   where $\\lambda$ is the target requests per second (RPS).
2. **Testing Benefit**:
   - Naturally produces micro-bursts followed by idle windows.
   - Tests how effectively continuous batching schedulers (e.g. vLLM chunked prefill) interleave prompt prefills with ongoing decode iterations.`,
    followups: [
      "Why is Constant load not enough for production testing?",
      "How to simulate traffic spikes safely?",
      "What is Goodput and why is it superior to Raw Throughput?",
    ],
  },
  {
    question: "How to simulate traffic spikes safely?",
    keywords: ["spike", "safely", "stress wave", "rate limit", "circuit breaker"],
    topic: "Safe Traffic Spike Simulation",
    badge: "Step 3B • Stress Testing",
    answer: `### ⚡ Safely Simulating Concurrency Spikes

1. **Configure Hard Spend Cap**:
   - Set a hard spend ceiling (e.g. $\$1.50$) in Step 4B to guarantee that runaway spike tests terminate immediately if cost accelerates.
2. **Use 3x Surge Waveform**:
   - The **Spike Waveform** maintains baseline concurrency for 10 seconds, injects a 3x concurrency surge for 5 seconds, and steps back down.
3. **Monitor Rate Limits (HTTP 429)**:
   - LLMark tracks HTTP 429 backoff responses to reveal cloud gateway throttling thresholds.`,
    followups: [
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
      "What are standard production SLO thresholds?",
      "How to find the saturation cliff of a cluster?",
    ],
  },
  {
    question: "How much speedup does prompt prefix caching provide?",
    keywords: ["prefix caching", "speedup", "radix", "paged attention", "cache hit"],
    topic: "Prompt Prefix Caching Speedup Metrics",
    badge: "Step 3C • Cache Speedup",
    answer: `### 🚀 Prompt Prefix Caching Speedup

When a prompt shares a common system prefix or RAG document with previously processed requests:

- **TTFT Reduction**:
  - **Cold TTFT (No Cache)**: $800\\text{--}1{,}800\\text{ms}$ for $4{,}000$ tokens.
  - **Warm TTFT (Cache Hit)**: $60\\text{--}120\\text{ms}$ (up to **$15\\times$ faster**).
- **Cost Savings**:
  - OpenAI, Anthropic, and DeepSeek offer **$50\\%\\text{ to }80\\%$ discounts** for cached prompt tokens.
- **Testing Recommendation**:
  - Toggle **Bypass KV Cache (Nonce)** ON to measure raw compute and hardware capacity, and OFF to benchmark live user conversational experience.`,
    followups: [
      "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
      "How is KV cache memory calculated per stream?",
      "Why do warmup requests matter?",
    ],
  },
  {
    question: "How is KV cache memory calculated per stream?",
    keywords: ["kv cache memory", "vram formula", "heads", "layers", "dimensions"],
    topic: "KV Cache VRAM Memory Sizing Formula",
    badge: "Step 3C • VRAM Sizing",
    answer: `### 💾 KV Cache VRAM Formula

For a Transformer model with Multi-Head Attention (MHA) or Grouped Query Attention (GQA):

$$\\text{VRAM}_{\\text{KV}} = 2 \\times L \\times H_{\\text{kv}} \\times D_{\\text{head}} \\times \\text{SeqLen} \\times B_{\\text{prec}}$$

- $L$: Number of layers (e.g. 32 for 8B, 80 for 70B)
- $H_{\\text{kv}}$: Number of Key-Value attention heads (e.g. 8 for GQA)
- $D_{\\text{head}}$: Head dimension (typically 128)
- $B_{\\text{prec}}$: Bytes per element (2 bytes for FP16/BF16, 1 byte for FP8)

**Rule of Thumb**:
A 70B model with GQA requires $\\approx 1.25\\text{ MB}$ of KV Cache per stream per 1,000 tokens in FP16. With 50 concurrent streams of 4K context, KV cache occupies $\\approx 25\\text{ GB}$ of VRAM!`,
    followups: [
      "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "How to find the saturation cliff of a cluster?",
    ],
  },
  {
    question: "Why do warmup requests matter?",
    keywords: ["warmup", "tcp", "tls", "handshake", "dns", "connection pool"],
    topic: "Warmup Request Rationale & Connection Priming",
    badge: "Step 3C • Socket Warmup",
    answer: `### 🔌 Why Warmup Requests are Essential

When dispatching the first request to an inference endpoint:

1. **DNS Resolution**: Adds $10\\text{--}40\\text{ms}$.
2. **TCP 3-Way Handshake + TLS 1.3**: Adds $30\\text{--}80\\text{ms}$ of round-trip latency.
3. **GPU JIT Kernel Compilation / Cache Ingestion**: The first query to a self-hosted engine primes the GPU memory registers.

**The Fix**:
LLMark dispatches 1-3 warmup requests before recording metrics. This ensures measured TTFT reflects pure model inference rather than cold network handshakes.`,
    followups: [
      "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
      "What causes connection latency overhead in cloud endpoints?",
      "What is Goodput and why is it superior to Raw Throughput?",
    ],
  },
  {
    question: "What is Goodput and why is it superior to Raw Throughput?",
    keywords: ["goodput", "raw throughput", "superior", "slo", "yield", "reliability"],
    topic: "Goodput vs. Raw Throughput Deep Dive",
    badge: "Step 4A • Goodput",
    answer: `### 🏆 Goodput: The True Metric of Production LLM Performance

- **The Flaw of Raw Throughput**:
  - An engine generating $2{,}000\\text{ tok/s}$ sounds fast, but if TTFT was 15 seconds and $12\\%$ of requests threw HTTP 429 rate limits, users experienced failure.
- **The Goodput Sieve**:
  - Evaluates each request through **4 concurrent SLA gates**:
    1. $\\text{TTFT} \\le \\text{Threshold}$ (e.g. $\\le 800\\text{ms}$)
    2. $\\text{TPOT} \\le \\text{Threshold}$ (e.g. $\\le 35\\text{ms/tok}$)
    3. $\\text{E2E Duration} \\le \\text{Threshold}$ (e.g. $\\le 10\\text{s}$)
    4. $\\text{HTTP Status} = 200\\text{ OK}$
  - Only tokens from requests that passed **all 4 gates** are counted.
- **Goodput Yield**:
  $$\\text{Yield (\\%)} = \\frac{\\text{Conforming Completed Requests}}{\\text{Total Dispatched Requests}} \\times 100\\%$$`,
    followups: [
      "What are standard production SLO thresholds?",
      "How does the 3-stage reliability sieve work?",
      "How does TPOT differ from ITL?",
    ],
  },
  {
    question: "What are standard production SLO thresholds?",
    keywords: ["standard slo", "thresholds", "production", "interactive", "batch", "voice"],
    topic: "Production LLM SLO Threshold Guidelines",
    badge: "Step 4A • SLO Standards",
    answer: `### 🎯 Standard Production SLO Thresholds

| Workload Category | Max TTFT | Max TPOT | Max E2E | Max Error Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Interactive Voice Agent** | $\\le 300\\text{ ms}$ | $\\le 20\\text{ ms/tok}$ | $\\le 3.0\\text{ s}$ | $\\le 0.1\\%$ |
| **Customer Chatbot** | $\\le 800\\text{ ms}$ | $\\le 35\\text{ ms/tok}$ | $\\le 10.0\\text{ s}$ | $\\le 1.0\\%$ |
| **Enterprise RAG / Search** | $\\le 1{,}500\\text{ ms}$ | $\\le 40\\text{ ms/tok}$ | $\\le 15.0\\text{ s}$ | $\\le 2.0\\%$ |
| **Offline Batch Processing** | $\\le 5{,}000\\text{ ms}$ | $\\le 80\\text{ ms/tok}$ | $\\le 60.0\\text{ s}$ | $\\le 5.0\\%$ |`,
    followups: [
      "What is Goodput and why is it superior to Raw Throughput?",
      "How does TPOT differ from ITL?",
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
    ],
  },
  {
    question: "How does TPOT differ from ITL?",
    keywords: ["tpot", "itl", "difference", "output token", "inter-token"],
    topic: "TPOT vs. ITL Distinction",
    badge: "Step 4A • Latency Metrics",
    answer: `### ⏱️ TPOT vs. ITL Dissection

- **TPOT (Time Per Output Token)**:
  $$\\text{TPOT} = \\frac{\\text{E2E Duration} - \\text{TTFT}}{\\text{Generated Tokens} - 1}$$
  Calculates the **average** decode duration per token across the entire generation turn.
- **ITL (Inter-Token Latency)**:
  Measures the individual timestamp differences $\\Delta t_i = t_{i} - t_{i-1}$ between every consecutive token chunk streamed over SSE.
- **Why Both Matter**:
  - TPOT measures aggregate generation speed.
  - ITL reveals stutter, pauses, or buffering hiccups during live UI streaming.`,
    followups: [
      "What is Goodput and why is it superior to Raw Throughput?",
      "What are standard production SLO thresholds?",
      "How does sampling affect token jitter & ITL?",
    ],
  },
  {
    question: "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
    keywords: ["bill-shock", "circuit breaker", "cloud costs", "hard spend cap", "abort"],
    topic: "Zero Bill-Shock Circuit Breaker Architecture",
    badge: "Step 4B • Cost Safety",
    answer: `### 🛡️ Zero Bill-Shock Protection

Running high-concurrency benchmarks on frontier models (e.g. GPT-4o, Claude 3.5 Sonnet) can quickly incur hundreds of dollars if left unchecked.

1. **Sub-50ms Reactive Abort**:
   - Every worker stream reports token usage in real time.
   - If cumulative spend $\\ge \\text{Hard Spend Cap}$ (e.g. $\$2.00$), the orchestrator dispatches an atomic cancellation token to immediately kill all active HTTP sockets.
2. **Pre-Flight Cost Bounds**:
   - The configurator pre-calculates the maximum theoretical spend before you click Launch.`,
    followups: [
      "How is benchmark cost calculated in real time?",
      "What happens when the spend cap is hit?",
      "How to input custom provider token pricing?",
    ],
  },
  {
    question: "How is benchmark cost calculated in real time?",
    keywords: ["cost calculated", "formula", "pricing", "real time", "token cost"],
    topic: "Real-Time Benchmark Cost Model",
    badge: "Step 4B • Cost Model",
    answer: `### 💵 Real-Time Cost Formula

$$\\text{Total Spend ($)} = \\sum_{i=1}^{N} \\left[ \\left(\\frac{\\text{Prompt Tokens}_i \\times P_{\\text{in}}}{10^6}\\right) + \\left(\\frac{\\text{Gen Tokens}_i \\times P_{\\text{out}}}{10^6}\\right) \\right]$$

- $P_{\\text{in}}$: Cost per 1 Million prompt tokens (USD).
- $P_{\\text{out}}$: Cost per 1 Million generation tokens (USD).
- Self-hosted engines (vLLM, Ollama) can be set to $\$0.00$ or customized with your GPU hourly instance amortization rate.`,
    followups: [
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
      "What happens when the spend cap is hit?",
      "How to input custom provider token pricing?",
    ],
  },
  {
    question: "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
    keywords: ["anthropic", "openai", "wire protocol", "streaming performance", "messages api"],
    topic: "OpenAI vs. Anthropic Wire Protocol Differences",
    badge: "Step 1A • Protocols",
    answer: `### 🌐 OpenAI vs. Anthropic Wire Protocols

| Dimension | OpenAI (\`/v1/chat/completions\`) | Anthropic (\`/v1/messages\`) |
| :--- | :--- | :--- |
| **Framing** | \`data: {"choices": [{"delta": {"content": "..."}}]}\` | \`event: content_block_delta\`<br>\`data: {"delta": {"text": "..."}}\` |
| **Usage Telemetry** | Streamed in final chunk with \`stream_options: {"include_usage": true}\` | Streamed across \`message_start\` and \`message_delta\` events |
| **System Prompt** | Passed as \`{"role": "system"}\` in messages array | Passed as dedicated top-level \`system\` parameter |
| **Streaming Overhead** | Standard JSON chunk parsing | Event-type header parsing prior to JSON extraction |`,
    followups: [
      "What causes connection latency overhead in cloud endpoints?",
      "How to configure custom vLLM / Ollama endpoints?",
      "Why is HTTP/2 or HTTP/3 connection reuse critical?",
    ],
  },
  {
    question: "How do MoE (Mixture of Experts) models behave under load?",
    keywords: ["moe", "mixture of experts", "deepseek-v3", "mixtral", "experts"],
    topic: "Mixture-of-Experts (MoE) Inference Dynamics",
    badge: "Step 1B • MoE Architecture",
    answer: `### 🧩 Mixture of Experts (MoE) Performance Dynamics

In MoE models (e.g. **DeepSeek-V3**, **Mixtral 8x22B**):

1. **Sparse Activation**:
   - Total model weights may be $671\\text{B}$, but each token dynamically routes to only $37\\text{B}$ active parameters.
2. **High Decode Throughput**:
   - Because only a fraction of total parameters must be loaded into registers per token, decode speed is significantly faster than an equivalent dense model.
3. **High VRAM Requirement**:
   - 100% of all expert weights must still reside in GPU VRAM, requiring multi-GPU tensor parallelism (e.g. 8x H100s).`,
    followups: [
      "What is the VRAM footprint of 8B vs 70B models?",
      "How does quantization (FP8/INT4) affect TPS?",
      "How does model parameter size influence prefill vs decode memory bandwidth?",
    ],
  },
  {
    question: "How does quantization (FP8/INT4) affect TPS?",
    keywords: ["quantization", "fp8", "int4", "tps", "throughput", "precision"],
    topic: "Quantization & Memory Bandwidth Scaling",
    badge: "Step 1B • Quantization",
    answer: `### ⚡ Quantization Impact on Inference Speed

Autoregressive decode is strictly **memory bandwidth bound**:

$$\\text{Speedup} \\approx \\frac{\\text{Original Precision (16-bit)}}{\\text{Quantized Precision (8-bit or 4-bit)}}$$

- **FP8 Quantization**:
  - Reduces model weight size by $50\\%$.
  - Doubles decode throughput on NVIDIA Ada/Hopper architectures (native FP8 Tensor Cores) with minimal perplexity degradation.
- **INT4 (AWQ / GPTQ)**:
  - Cuts weights to $25\\%$, allowing a 70B model to fit on a single 48GB GPU (e.g. RTX 6000 Ada).`,
    followups: [
      "How do MoE (Mixture of Experts) models behave under load?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "How does model parameter size influence prefill vs decode memory bandwidth?",
    ],
  },
  {
    question: "How do token ratios (prefill vs. decode) affect benchmarking results?",
    keywords: ["token ratios", "prefill vs decode", "prompt ratio", "workload ratio", "prompt to generation"],
    topic: "Token Ratios & Workload Archetypes",
    badge: "Step 2A • Workload Ratio",
    answer: `### ⚖️ Prefill vs. Decode Ratios in Benchmarking

LLM inference comprises two distinct compute regimes:

1. **Prefill Phase (FLOP-Bound)**:
   - Ingests the entire prompt in parallel using Tensor Cores.
   - Computational complexity scales with context length squared ($O(N^2)$ attention).
   - Governs **TTFT** (Time to First Token).
2. **Decode Phase (Memory-Bandwidth-Bound)**:
   - Generates tokens autoregressively, loading all weights once per token.
   - Governs **TPOT** and **ITL**.

**Benchmark Sizing Strategy**:
- **RAG**: 8,000 prompt / 200 gen $\\to$ Measures cold matrix prefill density.
- **Chat**: 250 prompt / 150 gen $\\to$ Measures interactive human conversational responsiveness.
- **Reasoning/Code**: 300 prompt / 2,000 gen $\\to$ Measures sustained autoregressive decode bandwidth.`,
    followups: [
      "Why is TTFT critical for RAG vs. Chat?",
      "How to benchmark reasoning (CoT) models?",
      "What is the difference between TTFT and TTFA?",
    ],
  },
  {
    question: "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
    keywords: ["temperature top p max tokens impact", "sampling parameters accuracy", "sampling benchmark impact"],
    topic: "Sampling Parameter Rigor in Benchmarks",
    badge: "Step 2B • Sampling Settings",
    answer: `### 🔬 Benchmark Calibration via Sampling Settings

1. **Temperature = 0.0 (Argmax / Greedy)**:
   - Guarantees 100% deterministic output paths across all runs and providers.
   - Eliminates stochastic token variance, ensuring that throughput comparisons reflect pure hardware differences.
2. **Top-P (Nucleus Sampling)**:
   - Limits sampling to the cumulative probability mass $P$ (e.g. 0.9).
   - Setting Top-P lower avoids rare token paths that cause early or late sequence termination.
3. **Max Tokens**:
   - Acts as a deterministic decode budget ceiling across all worker streams.`,
    followups: [
      "Why use Temperature = 0 for throughput tests?",
      "How does sampling affect token jitter & ITL?",
      "What happens when Max Tokens is reached?",
    ],
  },
  {
    question: "How do I choose the right concurrency worker pool for stress testing?",
    keywords: ["choose concurrency worker pool", "right concurrency", "worker pool size", "how many workers"],
    topic: "Concurrency Pool Sizing Strategy",
    badge: "Step 3A • Pool Sizing",
    answer: `### 👥 Concurrency Pool Sizing Guidelines

1. **Baseline Single-Stream ($N = 1$)**:
   - Captures minimal theoretical TTFT and maximum single-user token streaming speed.
2. **Production Multi-Tenant ($N = 10\\text{--}32$)**:
   - Saturated continuous batching sweet spot for standard 8x H100 or hosted enterprise endpoints.
3. **Stress Testing / Saturation Knee Probe ($N = 50\\text{--}128$)**:
   - Overloads the serving engine to identify where the KV cache fills up and queue delay spikes exponentially.`,
    followups: [
      "How to find the saturation cliff of a cluster?",
      "What is the relationship between RPS and concurrency?",
      "When does TTFT degrade exponentially?",
    ],
  },
  {
    question: "What is the Saturation Knee Probe and how does it detect cluster limits?",
    keywords: ["saturation knee probe detect cluster limits", "knee probe explained", "detect cluster limits"],
    topic: "Saturation Knee Probe Architecture",
    badge: "Step 3B • Knee Probe",
    answer: `### 🔍 Saturation Knee Probe Architecture

The **Saturation Knee Probe** runs a geometric load progression ($1 \\to 3 \\to 8 \\to 16 \\to 32 \\to 64$):

- At each step, it records **TTFT P95**, **Goodput Yield**, and **HTTP 429 Rate Limits**.
- It automatically calculates the second derivative $\\frac{d^2 \\text{TTFT}}{dN^2}$ to pinpoint the **inflection knee** $N_{\\text{knee}}$ where GPU VRAM is exhausted and queueing begins.`,
    followups: [
      "How to find the saturation cliff of a cluster?",
      "Why is Constant load not enough for production testing?",
      "How does Poisson arrival model human traffic?",
    ],
  },
  {
    question: "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
    keywords: ["bypass kv cache nonce injection", "cold gpu prefill", "nonce injection measure", "cache bust"],
    topic: "Cold GPU Prefill Measurement via Nonce",
    badge: "Step 3C • Nonce Injection",
    answer: `### 🧊 Cold GPU Prefill via Nonce Injection

Modern inference engines (vLLM, SGLang, OpenAI, Anthropic) reuse KV cache tensors across identical prompt prefixes.

- When **Bypass KV Cache** is enabled, LLMark prefixes each prompt with a unique UUID timestamp \`[nonce:1724758920-a8f1]\`.
- This forces the inference engine to compute full multi-head self-attention across every layer, measuring **cold hardware prefill latency and TFLOPS** rather than warm cache hits.`,
    followups: [
      "How much speedup does prompt prefix caching provide?",
      "How is KV cache memory calculated per stream?",
      "Why do warmup requests matter?",
    ],
  },
  {
    question: "How does model parameter size influence prefill vs decode memory bandwidth?",
    keywords: ["model parameter size influence prefill decode", "model size memory bandwidth", "weights memory bandwidth"],
    topic: "Model Parameter Sizing & Memory Physics",
    badge: "Step 1B • Parameter Sizing",
    answer: `### 🧠 Model Parameter Size & Memory Physics

- **Prefill (Compute-Bound)**:
  $$\\text{Prefill FLOPs} \\approx 2 \\times P \\times T_{\\text{prompt}}$$
  Larger models scale proportionally with parameter count $P$.
- **Decode (Memory Bandwidth-Bound)**:
  $$\\text{Decode Latency per Token} \\approx \\frac{P \\times B_{\\text{prec}}}{\\text{GPU Memory Bandwidth (TB/s)}}$$
  A 70B parameter model in FP16 requires transferring $140\\text{ GB}$ of weights across the bus for every single generated token!`,
    followups: [
      "How do MoE (Mixture of Experts) models behave under load?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "How does quantization (FP8/INT4) affect TPS?",
    ],
  },
  {
    question: "How does the 3-stage reliability sieve work?",
    keywords: ["3-stage reliability sieve", "reliability sieve work", "3 stage sieve", "goodput sieve"],
    topic: "The 3-Stage Reliability Sieve",
    badge: "Step 4A • Reliability Sieve",
    answer: `### 🛡️ The 3-Stage Reliability Sieve

LLMark filters every completed request through 3 cascading gates:

1. **Stage 1 (Transport & Integrity)**: Confirms HTTP 200, valid SSE framing, and zero truncated JSON payloads.
2. **Stage 2 (Latency Budgets)**: Validates that $\\text{TTFT} \\le \\text{Threshold}$ and $\\text{TPOT} \\le \\text{Threshold}$.
3. **Stage 3 (Deadline Enforcement)**: Validates total $\\text{E2E Duration} \\le \\text{Max SLA Deadline}$.

Tokens from requests failing any stage are discarded from **Goodput** calculations.`,
    followups: [
      "What is Goodput and why is it superior to Raw Throughput?",
      "What are standard production SLO thresholds?",
      "How does TPOT differ from ITL?",
    ],
  },
  {
    question: "What happens when the spend cap is hit?",
    keywords: ["what happens when spend cap hit", "spend cap triggered", "budget cap exceeded"],
    topic: "Spend Cap Trip Dynamics",
    badge: "Step 4B • Budget Safety",
    answer: `### 🛑 What Happens When the Spend Cap is Hit

When accumulated token spend reaches your **Hard Spend Cap**:

1. **Instant Reactive Abort**: Orchestrator sends an asynchronous cancellation signal to all active HTTP sockets within $\\le 50\\text{ms}$.
2. **Clean Telemetry Flush**: All completed streams up to that millisecond are finalized and saved into benchmark history.
3. **Report Flagging**: Benchmark run is marked as \`ABORTED_SPEND_CAP_REACHED\`, preventing accidental cloud billing.`,
    followups: [
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
      "How is benchmark cost calculated in real time?",
      "How to input custom provider token pricing?",
    ],
  },
  {
    question: "How to input custom provider token pricing?",
    keywords: ["input custom provider token pricing", "custom pricing override", "enterprise rate pricing"],
    topic: "Custom Token Pricing Configuration",
    badge: "Step 4B • Pricing Overrides",
    answer: `### 💲 Configuring Custom Token Pricing

In Step 4B (Spend Guardrails):

- Toggle **Custom Pricing Override** ON.
- Enter your contract prompt rate ($P_{\\text{in}}$ per 1M tokens) and completion rate ($P_{\\text{out}}$ per 1M tokens).
- Set both to \`$0.00\` for self-hosted vLLM/Ollama clusters or enter your amortized hourly GPU rate.`,
    followups: [
      "How is benchmark cost calculated in real time?",
      "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
      "What happens when the spend cap is hit?",
    ],
  },
  {
    question: "What causes connection latency overhead in cloud endpoints?",
    keywords: ["causes connection latency overhead", "cloud endpoints latency overhead", "connection overhead"],
    topic: "Cloud Endpoint Connection Overhead Breakdown",
    badge: "Step 1A • Connection Latency",
    answer: `### ⚡ Anatomy of Cloud Connection Overhead

1. **DNS Resolution**: $10\\text{--}40\\text{ms}$ depending on resolver cache.
2. **TCP Handshake**: $1\\text{ RTT}$ ($20\\text{--}50\\text{ms}$ based on cloud region distance).
3. **TLS 1.3 Key Exchange**: $1\\text{ RTT}$ ($20\\text{--}50\\text{ms}$).
4. **API Gateway & Auth Verification**: $15\\text{--}40\\text{ms}$ for token validation and rate limiter check.

> Warmup requests eliminate 1-3 by maintaining persistent HTTP/2 keep-alive connections.`,
    followups: [
      "Why do warmup requests matter?",
      "Why is HTTP/2 or HTTP/3 connection reuse critical?",
      "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
    ],
  },
  {
    question: "How to configure custom vLLM / Ollama endpoints?",
    keywords: ["configure custom vllm ollama", "vllm endpoint setup", "ollama benchmark setup"],
    topic: "Self-Hosted vLLM & Ollama Configuration",
    badge: "Step 1A • Local Deployments",
    answer: `### 🛠️ Connecting Self-Hosted vLLM / Ollama

1. In Step 1, select **OpenAI Compatible** provider.
2. Set **Base URL**:
   - **vLLM**: \`http://localhost:8000/v1\`
   - **Ollama**: \`http://localhost:11434/v1\`
3. Enter API Key: \`EMPTY\` or \`ollama\`.
4. Enter target Model ID (e.g. \`meta-llama/Llama-3.1-8B-Instruct\` or \`llama3.1:8b\`).`,
    followups: [
      "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
      "What is the VRAM footprint of 8B vs 70B models?",
      "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
    ],
  },
  {
    question: "Why is HTTP/2 or HTTP/3 connection reuse critical?",
    keywords: ["http2 http3 connection reuse", "multiplexing sse", "connection reuse critical"],
    topic: "HTTP/2 & HTTP/3 Transport Multiplexing",
    badge: "Step 1A • Transport",
    answer: `### 🚀 HTTP/2 & Multiplexing in LLM Streaming

- **Head-of-Line Blocking Elimination**: Multiplexes dozens of concurrent SSE token streams over a single TLS connection.
- **Socket Exhaustion Prevention**: Prevents running out of ephemeral client OS ports when running 100+ concurrent workers.`,
    followups: [
      "What causes connection latency overhead in cloud endpoints?",
      "Why do warmup requests matter?",
      "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
    ],
  },
  {
    question: "What is the VRAM footprint of 8B vs 70B models?",
    keywords: ["vram footprint 8b vs 70b", "8b vs 70b vram", "gpu memory requirements 70b"],
    topic: "VRAM Footprint Comparison (8B vs 70B)",
    badge: "Step 1B • VRAM Footprint",
    answer: `### 💾 VRAM Sizing: 8B vs 70B Models

| Component | Llama-3-8B (FP16) | Llama-3-8B (FP8) | Llama-3-70B (FP16) | Llama-3-70B (FP8) |
| :--- | :--- | :--- | :--- | :--- |
| **Model Weights** | $16\\text{ GB}$ | $8\\text{ GB}$ | $140\\text{ GB}$ | $70\\text{ GB}$ |
| **KV Cache / 1K Tokens** | $0.25\\text{ MB}$ | $0.13\\text{ MB}$ | $1.25\\text{ MB}$ | $0.63\\text{ MB}$ |
| **Min GPU Target** | 1x RTX 4090 (24GB) | 1x RTX 4070 (12GB) | 2x H100 (80GB) | 1x H100 (80GB) |`,
    followups: [
      "How is KV cache memory calculated per stream?",
      "How does quantization (FP8/INT4) affect TPS?",
      "How do MoE (Mixture of Experts) models behave under load?",
    ],
  },
  {
    question: "How do I optimize my benchmark parameters?",
    keywords: ["optimize my benchmark parameters", "how do i optimize benchmark", "best benchmark configuration"],
    topic: "End-to-End Benchmark Optimization Playbook",
    badge: "Inference Copilot",
    answer: `### ⚡ 4-Step Benchmark Optimization Playbook

1. **Step 1 (Wire Protocol)**: Enable Warmup runs (1-3) to prime persistent TLS connections.
2. **Step 2 (Workload & Sampling)**: Match input/output token ratio to your production scenario and set $\\text{Temperature} = 0.0$ for deterministic results.
3. **Step 3 (Traffic & Knee)**: Use the Saturation Knee Probe to discover the cluster inflection limit $N_{\\text{knee}}$.
4. **Step 4 (SLO & Safety)**: Set realistic Goodput latency thresholds (TTFT $\\le 800\\text{ms}$, TPOT $\\le 35\\text{ms}$) and a hard spend cap (e.g. $\$1.50$) for cost safety.`,
    followups: [
      "What is Goodput and why is it superior to Raw Throughput?",
      "How to find the saturation cliff of a cluster?",
      "Why is TTFT critical for RAG vs. Chat?",
    ],
  },
];

/**
 * Intelligent semantic resolver for Ask Expert queries.
 */
export function getExpertAnswer(
  query: string,
  contextTopicId?: string
): { answer: string; topic: string; badge: string; followups: string[] } {
  const normalize = (t: string) => t.toLowerCase().replace(/[^\w\s]/g, "").trim();
  const qNorm = normalize(query);
  const qWords = new Set(qNorm.split(/\s+/).filter(Boolean));
  const stopwords = new Set(["what", "is", "the", "how", "do", "does", "why", "for", "and", "or", "in", "to", "of", "a", "an", "vs", "difference", "between"]);
  const meaningfulWords = new Set([...qWords].filter((w) => !stopwords.has(w)));

  // 1. Direct match on dedicated Q&A answers (exact or high Jaccard overlap)
  for (const qa of DEDICATED_QA_ANSWERS) {
    const qaNorm = normalize(qa.question);
    if (qaNorm === qNorm) {
      return {
        answer: qa.answer,
        topic: qa.topic,
        badge: qa.badge,
        followups: qa.followups,
      };
    }

    const qaWords = new Set(qaNorm.split(/\s+/).filter((w) => !stopwords.has(w)));
    if (meaningfulWords.size > 0 && qaWords.size > 0) {
      const intersection = new Set([...meaningfulWords].filter((w) => qaWords.has(w)));
      const union = new Set([...meaningfulWords, ...qaWords]);
      const jaccard = intersection.size / union.size;
      if (jaccard >= 0.70 || (intersection.size >= 4 && intersection.size === qaWords.size)) {
        return {
          answer: qa.answer,
          topic: qa.topic,
          badge: qa.badge,
          followups: qa.followups,
        };
      }
    }
  }

  // 2. Exact match against curated default questions in topic articles
  for (const article of Object.values(EXPERT_KNOWLEDGE)) {
    if (normalize(article.defaultQuestion) === qNorm) {
      return {
        answer: article.markdown,
        topic: article.topic,
        badge: article.badge,
        followups: article.suggestedFollowups,
      };
    }
  }

  // 5. If it is a custom query that did not match any curated/presaved knowledge:
  // Do NOT answer with a generic canned answer. Explain that custom questions require a live LLM API Key.
  const fallbackFollowups =
    contextTopicId && TOPIC_SUGGESTED_QUESTIONS[contextTopicId]
      ? TOPIC_SUGGESTED_QUESTIONS[contextTopicId].questions.slice(0, 3)
      : [
          "What is Goodput and why is it superior to Raw Throughput?",
          "How do token ratios (prefill vs. decode) affect benchmarking results?",
          "How to find the saturation cliff of a cluster?",
        ];

  return {
    answer: `### ⚠️ Live AI Response Unavailable for Custom Question

**Your Question**: *"${query}"*

This is a custom, open-ended question that requires a live LLM endpoint to generate an answer.

**To answer custom questions in real time:**
1. Add your **Groq API Key** in \`.env\` (\`GROQ_API_KEY=gsk_...\`) or click the **Key icon (🔑)** in the top right of this drawer.
2. Ensure your model (e.g. \`gpt-oss-20b\`, \`llama-3.3-70b-versatile\`, \`llama-3.1-8b-instant\`) is supported.

💡 **Curated Presaved Questions Available Offline**:
You can click any of the verified suggested questions below to get instant architectural explanations without needing an API key.`,
    topic: "Custom Question (Key Required)",
    badge: "Key Required",
    followups: fallbackFollowups,
  };
}

