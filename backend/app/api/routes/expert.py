import json
import logging
import os
import re
from typing import Any

from fastapi import APIRouter
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expert", tags=["expert"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text")


class ExpertQueryRequest(BaseModel):
    query: str = Field(..., description="User question or prompt")
    context_topic: str | None = Field(None, description="Context card or topic")
    vendor: str | None = Field(None, description="Current vendor being benchmarked")
    model: str | None = Field(None, description="Current model being benchmarked")
    groq_api_key: str | None = Field(None, description="Groq API key for live LLM answers")
    credential: dict[str, Any] | None = Field(
        default_factory=dict, description="Ephemeral credential if available"
    )
    messages: list[ChatMessage] | None = Field(
        default=None, description="Recent conversation history for multi-turn context"
    )


class ExpertQueryResponse(BaseModel):
    answer: str
    topic: str
    suggested_followups: list[str]
    source: str  # "groq_llm" or "knowledge_engine"
    model: str | None = None


class ExpertStatusResponse(BaseModel):
    has_groq_key: bool
    model: str
    source: str


# ==============================================================================
# Comprehensive Benchmark Knowledge Base (37 Dedicated Q&A + Foundation Articles)
# ==============================================================================

DEDICATED_QA_ITEMS: list[dict[str, Any]] = [
    {
        "question": "Why is TTFT critical for RAG vs. Chat?",
        "keywords": ["ttft", "rag", "chat", "prefill", "retrieval", "context", "first token"],
        "topic": "TTFT Dynamics in RAG Architectures",
        "answer": (
            "### Why TTFT Dominates RAG Latency\n\n"
            "In **Retrieval-Augmented Generation (RAG)** systems, prompts contain extensive retrieved context (typically $3{,}000\\text{--}16{,}000$ tokens of vector embeddings, chunked markdown, or SQL schemas).\n\n"
            "1. **Compute Phase Breakdown**:\n"
            "   - In standard Chat ($200$ prompt tokens), prefill finishes in under $\\le 40\\text{ms}$.\n"
            "   - In heavy RAG ($8{,}000$ prompt tokens), the GPU must calculate self-attention across $(8000)^2 = 6.4 \\times 10^7$ token pairs during the prefill phase.\n"
            "2. **User Perceived Latency**:\n"
            "   - The user stares at a blank screen until the first token streams back. TTFT represents **85%+ of the total perceived response time** in RAG pipelines.\n"
            "3. **KV Cache Optimization**:\n"
            "   - Using prefix caching or prompt compression is essential to keep RAG TTFT below $\\le 1.2\\text{s}$."
        ),
        "followups": [
            "How to benchmark reasoning (CoT) models?",
            "What is the difference between TTFT and TTFA?",
            "How much speedup does prompt prefix caching provide?",
        ],
    },
    {
        "question": "How to benchmark reasoning (CoT) models?",
        "keywords": [
            "reasoning",
            "cot",
            "chain of thought",
            "deepseek-r1",
            "o1",
            "o3",
            "thinking",
            "reasoner",
        ],
        "topic": "Reasoning (Chain-of-Thought) Benchmarking",
        "answer": (
            "### Benchmarking Chain-of-Thought (CoT) & Reasoning Models\n\n"
            "Reasoning models (e.g. **DeepSeek-R1**, **OpenAI o1/o3-mini**) generate hidden internal 'thinking tokens' before streaming the final user-facing response.\n\n"
            "- **TTFT vs. TTFA (Time to First Answer)**:\n"
            "  - Standard TTFT captures when the *first thinking token* is emitted.\n"
            "  - **TTFA** measures the latency until the model finishes its reasoning chain and outputs the actual answer.\n"
            "- **Generation Token Sizing**:\n"
            "  - Reasoning runs routinely output $2{,}000\\text{--}8{,}000$ tokens per request. Set **Max Tokens $\\ge 4096$** to avoid truncated calculations.\n"
            "- **Concurrency Bottlenecks**:\n"
            "  - Because each request stays in the GPU decode loop for $5\\text{--}30$ seconds, KV-cache memory fills up rapidly. Lower your concurrency pool ($N \\le 10$) when stress-testing reasoning endpoints."
        ),
        "followups": [
            "What is the difference between TTFT and TTFA?",
            "How does model parameter size influence prefill vs decode memory bandwidth?",
            "How to find the saturation cliff of a cluster?",
        ],
    },
    {
        "question": "What is the difference between TTFT and TTFA?",
        "keywords": [
            "difference between ttft and ttfa",
            "ttft vs ttfa",
            "ttfa",
            "first answer",
            "first token",
        ],
        "topic": "TTFT vs. TTFA Metric Dissection",
        "answer": (
            "### TTFT vs. TTFA Explained\n\n"
            "| Metric | Definition | Target Workloads | Production SLA Target |\n"
            "| :--- | :--- | :--- | :--- |\n"
            "| **TTFT** (Time to First Token) | Time elapsed from HTTP request dispatch until the very first SSE byte/token chunk arrives. | Standard Chat, RAG, Code Completion | $\\le 400\\text{--}800\\text{ms}$ |\n"
            "| **TTFA** (Time to First Answer) | Time elapsed until the first **visible, user-facing answer token** is emitted (after stripping reasoning/thinking tokens). | CoT Reasoning (o1, R1), Agentic Planning | $\\le 3.0\\text{--}8.0\\text{s}$ |\n\n"
            "> **Formula**: $\\text{TTFA} = \\text{TTFT} + (\\text{Thinking Tokens} \\times \\text{TPOT})$"
        ),
        "followups": [
            "Why is TTFT critical for RAG vs. Chat?",
            "What is Goodput and why is it superior to Raw Throughput?",
            "How does TPOT differ from ITL?",
        ],
    },
    {
        "question": "Why use Temperature = 0 for throughput tests?",
        "keywords": [
            "temperature = 0",
            "temp 0",
            "temperature 0",
            "deterministic",
            "reproducible",
            "greedy decoding",
            "greedy",
        ],
        "topic": "Deterministic Decoding at Temperature = 0",
        "answer": (
            "### Why Temperature = 0.0 is the Gold Standard for Benchmarks\n\n"
            "Setting $\\text{Temperature} = 0.0$ forces **Argmax (Greedy) decoding**:\n\n"
            "1. **Exact Reproducibility**:\n"
            "   - At $T=0$, the model always picks the token with maximum probability $\\text{argmax}_i P(y_t = w_i)$.\n"
            "   - Eliminates stochastic variance so you can compare two cloud providers or GPU instances with identical token output trajectories.\n"
            "2. **Fixed Token Lengths**:\n"
            "   - With temperature $> 0.7$, one worker stream might generate 180 tokens while another generates 420 tokens due to sampling paths.\n"
            "   - At $T=0$, all concurrent streams stop at predictable token counts, isolating pure hardware throughput from entropy variance."
        ),
        "followups": [
            "How does sampling affect token jitter & ITL?",
            "What happens when Max Tokens is reached?",
            "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
        ],
    },
    {
        "question": "How does sampling affect token jitter & ITL?",
        "keywords": [
            "token jitter",
            "itl jitter",
            "jitter",
            "inter-token latency",
            "sampling entropy",
            "entropy jitter",
        ],
        "topic": "Sampling Entropy & Inter-Token Latency Jitter",
        "answer": (
            "### Token Jitter & Inter-Token Latency (ITL)\n\n"
            "**Inter-Token Latency (ITL)** is the time interval between consecutive token frames in an SSE stream.\n\n"
            "- **High Temperature ($T > 1.0$)**:\n"
            "  - Probability mass is spread evenly across vocabulary tokens.\n"
            "  - Softmax sampling requires searching wider token tails, creating slight microsecond variance and variable sequence terminations.\n"
            "- **Nucleus Top-P Filtering**:\n"
            "  - Dynamically truncates the probability mass, which reduces the tail candidates and stabilizes decode loop step timing.\n"
            "- **Continuous Batching Jitter**:\n"
            "  - Real jitter in production is primarily caused by **iteration-level scheduling** (e.g. new requests entering prefill while other streams are decoding)."
        ),
        "followups": [
            "Why use Temperature = 0 for throughput tests?",
            "How does TPOT differ from ITL?",
            "What is Goodput and why is it superior to Raw Throughput?",
        ],
    },
    {
        "question": "What happens when Max Tokens is reached?",
        "keywords": [
            "max tokens reached",
            "max_tokens",
            "finish_reason length",
            "generation bound",
            "cut off",
        ],
        "topic": "Generation Bounds & Finish Reasons",
        "answer": (
            "### Max Tokens & Generation Bounds\n\n"
            "When an autoregressive generation reaches the configured `max_tokens` bound:\n\n"
            '1. The inference engine halts decoding immediately and returns `finish_reason: "length"` instead of `"stop"`.\n'
            "2. **Benchmarking Impact**:\n"
            "   - Setting a fixed `max_tokens` guarantees exact decode turn length across all concurrent worker threads.\n"
            "   - Prevents runaway generation loops when testing uncalibrated prompts."
        ),
        "followups": [
            "Why use Temperature = 0 for throughput tests?",
            "How do token ratios (prefill vs. decode) affect benchmarking results?",
            "How is KV cache memory calculated per stream?",
        ],
    },
    {
        "question": "How to find the saturation cliff of a cluster?",
        "keywords": [
            "saturation cliff",
            "saturation knee",
            "cluster limits",
            "knee probe",
            "overload cliff",
            "capacity limit",
        ],
        "topic": "Identifying the Saturation Cliff",
        "answer": (
            "### Finding the Saturation Cliff ($N_{\\text{knee}}$)\n\n"
            "The **Saturation Cliff** is the exact concurrency load where an LLM serving cluster transitions from hardware-limited to queue-delayed.\n\n"
            "1. **Step-by-Step Probe**:\n"
            "   - Run the **Saturation Knee Probe (1→3→8→16→32→64)**.\n"
            "   - Measure **TTFT P95** and **Tokens/Second** at each step.\n"
            "2. **The Inflection Signature**:\n"
            "   - **Before Knee ($N < N_{\\text{knee}}$)**: TTFT is flat (e.g. $400\\text{ms}$), Throughput scales linearly ($100 \\to 300 \\to 800\\text{ tok/s}$).\n"
            "   - **At the Knee ($N = N_{\\text{knee}}$)**: KV Cache slots reach $90\\%$ GPU allocation. Throughput plateaus.\n"
            "   - **Past the Knee ($N > N_{\\text{knee}}$)**: Requests queue in CPU RAM. TTFT spikes exponentially ($400\\text{ms} \\to 4{,}500\\text{ms}$), and Goodput drops toward $0\\%$."
        ),
        "followups": [
            "What is the relationship between RPS and concurrency?",
            "When does TTFT degrade exponentially?",
            "What is Goodput and why is it superior to Raw Throughput?",
        ],
    },
    {
        "question": "What is the relationship between RPS and concurrency?",
        "keywords": [
            "relationship between rps and concurrency",
            "rps vs concurrency",
            "littles law",
            "concurrency to rps",
        ],
        "topic": "Little's Law & Concurrency-to-RPS Conversion",
        "answer": (
            "### Little's Law in LLM Queuing\n\n"
            "$$\\text{Concurrency } (N) = \\text{Throughput } (\\lambda) \\times \\text{Mean Latency } (W)$$\n\n"
            "- If your average request duration is $2.0\\text{ seconds}$ and you configure $20\\text{ concurrent streams}$:\n"
            "  $$\\text{Target RPS} = \\frac{20}{2.0\\text{ s}} = 10\\text{ requests/second}$$\n"
            "- In autoregressive LLMs, request duration depends on generation length. Long responses ($2{,}000$ tokens $\\approx 8\\text{s}$) require much higher concurrency pools to achieve the same target RPS."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "When does TTFT degrade exponentially?",
            "How does Poisson arrival model human traffic?",
        ],
    },
    {
        "question": "When does TTFT degrade exponentially?",
        "keywords": [
            "ttft degrade exponentially",
            "ttft spike",
            "exponential latency",
            "queue delay",
            "mm1 queue",
        ],
        "topic": "Exponential TTFT Queue Degradation",
        "answer": (
            "### Why TTFT Spikes Exponentially\n\n"
            "TTFT consists of two components:\n\n"
            "$$\\text{TTFT} = W_q \\text{ (Queue Waiting Time)} + T_{\\text{prefill}} \\text{ (Compute Execution Time)}$$\n\n"
            "1. **Under Normal Load ($M/M/1$ Queuing)**:\n"
            "   - When GPU utilization $\\rho < 0.8$, queue wait $W_q \\approx 0$. $\\text{TTFT} \\approx T_{\\text{prefill}} \\approx 300\\text{ms}$.\n"
            "2. **At Over-Saturation ($\\rho \\to 1.0$)**:\n"
            "   - As GPU utilization approaches capacity:\n"
            "     $$W_q = \\frac{\\rho}{\\mu (1 - \\rho)}$$\n"
            "   - When $\\rho = 0.95$, queue time multiplies by $20\\times$. Incoming requests must wait for active decode turns to yield GPU memory slots before prefill can begin."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "What is Goodput and why is it superior to Raw Throughput?",
            "How is KV cache memory calculated per stream?",
        ],
    },
    {
        "question": "Why is Constant load not enough for production testing?",
        "keywords": [
            "constant load not enough",
            "constant vs poisson",
            "constant load blind spot",
            "realistic load",
        ],
        "topic": "Why Constant Load Masks Production Bottlenecks",
        "answer": (
            "### The Blind Spot of Constant Load Benchmarks\n\n"
            "- **Artificial Uniformity**:\n"
            "  - Constant load dispatches requests at clockwork intervals. In reality, human traffic arrives in stochastic clusters.\n"
            "- **Hides Queue Head-of-Line Blocking**:\n"
            "  - A real-world burst of 5 simultaneous $8{,}000$-token RAG requests will freeze all active decodes for $800\\text{ms}$. Constant load tests miss this phenomenon completely.\n"
            "- **Recommendation**:\n"
            "  - Always pair a Constant baseline with a **Poisson Arrival** test and a **Spike Waveform** to stress test rate limiters and memory pressure buffers."
        ),
        "followups": [
            "How does Poisson arrival model human traffic?",
            "How to simulate traffic spikes safely?",
            "What is the Saturation Knee Probe and how does it detect cluster limits?",
        ],
    },
    {
        "question": "How does Poisson arrival model human traffic?",
        "keywords": [
            "poisson arrival",
            "poisson human traffic",
            "stochastic arrival",
            "exponential inter-arrival",
        ],
        "topic": "Poisson Arrival Process Dynamics",
        "answer": (
            "### Poisson Arrival Process in LLM Benchmarking\n\n"
            "Human client requests arrive independently at random timestamps. In LLMark:\n\n"
            "1. Inter-arrival time $\\Delta t$ is sampled from an **Exponential Distribution**:\n"
            "   $$P(\\Delta t) = \\lambda e^{-\\lambda \\Delta t}$$\n"
            "   where $\\lambda$ is the target requests per second (RPS).\n"
            "2. **Testing Benefit**:\n"
            "   - Naturally produces micro-bursts followed by idle windows.\n"
            "   - Tests how effectively continuous batching schedulers (e.g. vLLM chunked prefill) interleave prompt prefills with ongoing decode iterations."
        ),
        "followups": [
            "Why is Constant load not enough for production testing?",
            "How to simulate traffic spikes safely?",
            "What is Goodput and why is it superior to Raw Throughput?",
        ],
    },
    {
        "question": "How to simulate traffic spikes safely?",
        "keywords": [
            "simulate traffic spikes safely",
            "spike safely",
            "traffic spike",
            "surge testing",
            "stress wave",
        ],
        "topic": "Safe Traffic Spike Simulation",
        "answer": (
            "### Safely Simulating Concurrency Spikes\n\n"
            "1. **Configure Hard Spend Cap**:\n"
            "   - Set a hard spend ceiling (e.g. $\\$1.50$) in Step 4B to guarantee that runaway spike tests terminate immediately if cost accelerates.\n"
            "2. **Use 3x Surge Waveform**:\n"
            "   - The **Spike Waveform** maintains baseline concurrency for 10 seconds, injects a 3x concurrency surge for 5 seconds, and steps back down.\n"
            "3. **Monitor Rate Limits (HTTP 429)**:\n"
            "   - LLMark tracks HTTP 429 backoff responses to reveal cloud gateway throttling thresholds."
        ),
        "followups": [
            "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
            "What are standard production SLO thresholds?",
            "How to find the saturation cliff of a cluster?",
        ],
    },
    {
        "question": "How much speedup does prompt prefix caching provide?",
        "keywords": [
            "prompt prefix caching speedup",
            "prefix caching speedup",
            "cache hit latency",
            "radix attention speedup",
        ],
        "topic": "Prompt Prefix Caching Speedup Metrics",
        "answer": (
            "### Prompt Prefix Caching Speedup\n\n"
            "When a prompt shares a common system prefix or RAG document with previously processed requests:\n\n"
            "- **TTFT Reduction**:\n"
            "  - **Cold TTFT (No Cache)**: $800\\text{--}1{,}800\\text{ms}$ for $4{,}000$ tokens.\n"
            "  - **Warm TTFT (Cache Hit)**: $60\\text{--}120\\text{ms}$ (up to **$15\\times$ faster**).\n"
            "- **Cost Savings**:\n"
            "  - OpenAI, Anthropic, and DeepSeek offer **$50\\%\\text{ to }80\\%$ discounts** for cached prompt tokens.\n"
            "- **Testing Recommendation**:\n"
            "  - Toggle **Bypass KV Cache (Nonce)** ON to measure raw compute and hardware capacity, and OFF to benchmark live user conversational experience."
        ),
        "followups": [
            "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
            "How is KV cache memory calculated per stream?",
            "Why do warmup requests matter?",
        ],
    },
    {
        "question": "How is KV cache memory calculated per stream?",
        "keywords": [
            "kv cache memory calculated",
            "kv cache formula",
            "vram formula",
            "kv cache sizing",
            "gqa vram",
        ],
        "topic": "KV Cache VRAM Memory Sizing Formula",
        "answer": (
            "### KV Cache VRAM Formula\n\n"
            "For a Transformer model with Multi-Head Attention (MHA) or Grouped Query Attention (GQA):\n\n"
            "$$\\text{VRAM}_{\\text{KV}} = 2 \\times L \\times H_{\\text{kv}} \\times D_{\\text{head}} \\times \\text{SeqLen} \\times B_{\\text{prec}}$$\n\n"
            "- $L$: Number of layers (e.g. 32 for 8B, 80 for 70B)\n"
            "- $H_{\\text{kv}}$: Number of Key-Value attention heads (e.g. 8 for GQA)\n"
            "- $D_{\\text{head}}$: Head dimension (typically 128)\n"
            "- $B_{\\text{prec}}$: Bytes per element (2 bytes for FP16/BF16, 1 byte for FP8)\n\n"
            "**Rule of Thumb**:\n"
            "A 70B model with GQA requires $\\approx 1.25\\text{ MB}$ of KV Cache per stream per 1,000 tokens in FP16. With 50 concurrent streams of 4K context, KV cache occupies $\\approx 25\\text{ GB}$ of VRAM!"
        ),
        "followups": [
            "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
            "What is the VRAM footprint of 8B vs 70B models?",
            "How to find the saturation cliff of a cluster?",
        ],
    },
    {
        "question": "Why do warmup requests matter?",
        "keywords": [
            "warmup requests matter",
            "why warmup",
            "tcp handshake latency",
            "tls priming",
            "connection warmup",
        ],
        "topic": "Warmup Request Rationale & Connection Priming",
        "answer": (
            "### Why Warmup Requests are Essential\n\n"
            "When dispatching the first request to an inference endpoint:\n\n"
            "1. **DNS Resolution**: Adds $10\\text{--}40\\text{ms}$.\n"
            "2. **TCP 3-Way Handshake + TLS 1.3**: Adds $30\\text{--}80\\text{ms}$ of round-trip latency.\n"
            "3. **GPU JIT Kernel Compilation / Cache Ingestion**: The first query to a self-hosted engine primes the GPU memory registers.\n\n"
            "**The Fix**:\n"
            "LLMark dispatches 1-3 warmup requests before recording metrics. This ensures measured TTFT reflects pure model inference rather than cold network handshakes."
        ),
        "followups": [
            "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
            "What causes connection latency overhead in cloud endpoints?",
            "What is Goodput and why is it superior to Raw Throughput?",
        ],
    },
    {
        "question": "What is Goodput and why is it superior to Raw Throughput?",
        "keywords": [
            "goodput vs raw throughput",
            "what is goodput",
            "goodput superior",
            "goodput formula",
            "sla goodput",
        ],
        "topic": "Goodput vs. Raw Throughput Deep Dive",
        "answer": (
            "### Goodput: The True Metric of Production LLM Performance\n\n"
            "- **The Flaw of Raw Throughput**:\n"
            "  - An engine generating $2{,}000\\text{ tok/s}$ sounds fast, but if TTFT was 15 seconds and $12\\%$ of requests threw HTTP 429 rate limits, users experienced failure.\n"
            "- **The Goodput Sieve**:\n"
            "  - Evaluates each request through **4 concurrent SLA gates**:\n"
            "    1. $\\text{TTFT} \\le \\text{Threshold}$ (e.g. $\\le 800\\text{ms}$)\n"
            "    2. $\\text{TPOT} \\le \\text{Threshold}$ (e.g. $\\le 35\\text{ms/tok}$)\n"
            "    3. $\\text{E2E Duration} \\le \\text{Threshold}$ (e.g. $\\le 10\\text{s}$)\n"
            "    4. $\\text{HTTP Status} = 200\\text{ OK}$\n"
            "  - Only tokens from requests that passed **all 4 gates** are counted.\n"
            "- **Goodput Yield**:\n"
            "  $$\\text{Yield (\\%)} = \\frac{\\text{Conforming Completed Requests}}{\\text{Total Dispatched Requests}} \\times 100\\%$$"
        ),
        "followups": [
            "What are standard production SLO thresholds?",
            "How does the 3-stage reliability sieve work?",
            "How does TPOT differ from ITL?",
        ],
    },
    {
        "question": "What are standard production SLO thresholds?",
        "keywords": [
            "standard production slo thresholds",
            "production slo",
            "standard slo",
            "slo targets",
            "latency budgets",
        ],
        "topic": "Production LLM SLO Threshold Guidelines",
        "answer": (
            "### Standard Production SLO Thresholds\n\n"
            "| Workload Category | Max TTFT | Max TPOT | Max E2E | Max Error Rate |\n"
            "| :--- | :--- | :--- | :--- | :--- |\n"
            "| **Interactive Voice Agent** | $\\le 300\\text{ ms}$ | $\\le 20\\text{ ms/tok}$ | $\\le 3.0\\text{ s}$ | $\\le 0.1\\%$ |\n"
            "| **Customer Chatbot** | $\\le 800\\text{ ms}$ | $\\le 35\\text{ ms/tok}$ | $\\le 10.0\\text{ s}$ | $\\le 1.0\\%$ |\n"
            "| **Enterprise RAG / Search** | $\\le 1{,}500\\text{ ms}$ | $\\le 40\\text{ ms/tok}$ | $\\le 15.0\\text{ s}$ | $\\le 2.0\\%$ |\n"
            "| **Offline Batch Processing** | $\\le 5{,}000\\text{ ms}$ | $\\le 80\\text{ ms/tok}$ | $\\le 60.0\\text{ s}$ | $\\le 5.0\\%$ |"
        ),
        "followups": [
            "What is Goodput and why is it superior to Raw Throughput?",
            "How does TPOT differ from ITL?",
            "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
        ],
    },
    {
        "question": "How does TPOT differ from ITL?",
        "keywords": [
            "tpot differ from itl",
            "tpot vs itl",
            "tpot and itl difference",
            "time per output token",
            "inter-token latency",
        ],
        "topic": "TPOT vs. ITL Distinction",
        "answer": (
            "### TPOT vs. ITL Dissection\n\n"
            "- **TPOT (Time Per Output Token)**:\n"
            "  $$\\text{TPOT} = \\frac{\\text{E2E Duration} - \\text{TTFT}}{\\text{Generated Tokens} - 1}$$\n"
            "  Calculates the **average** decode duration per token across the entire generation turn.\n"
            "- **ITL (Inter-Token Latency)**:\n"
            "  Measures the individual timestamp differences $\\Delta t_i = t_{i} - t_{i-1}$ between every consecutive token chunk streamed over SSE.\n"
            "- **Why Both Matter**:\n"
            "  - TPOT measures aggregate generation speed.\n"
            "  - ITL reveals stutter, pauses, or buffering hiccups during live UI streaming."
        ),
        "followups": [
            "What is Goodput and why is it superior to Raw Throughput?",
            "What are standard production SLO thresholds?",
            "How does sampling affect token jitter & ITL?",
        ],
    },
    {
        "question": "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
        "keywords": [
            "zero bill-shock circuit breaker",
            "bill-shock",
            "spend cap circuit breaker",
            "hard spend cap protect",
            "abort cost",
        ],
        "topic": "Zero Bill-Shock Circuit Breaker Architecture",
        "answer": (
            "### Zero Bill-Shock Protection\n\n"
            "Running high-concurrency benchmarks on frontier models (e.g. GPT-4o, Claude 3.5 Sonnet) can quickly incur hundreds of dollars if left unchecked.\n\n"
            "1. **Sub-50ms Reactive Abort**:\n"
            "   - Every worker stream reports token usage in real time.\n"
            "   - If cumulative spend $\\ge \\text{Hard Spend Cap}$ (e.g. $2.00), the orchestrator dispatches an atomic cancellation token to immediately kill all active HTTP sockets.\n"
            "2. **Pre-Flight Cost Bounds**:\n"
            "   - The configurator pre-calculates the maximum theoretical spend before you click Launch."
        ),
        "followups": [
            "How is benchmark cost calculated in real time?",
            "What happens when the spend cap is hit?",
            "How to input custom provider token pricing?",
        ],
    },
    {
        "question": "How is benchmark cost calculated in real time?",
        "keywords": [
            "benchmark cost calculated",
            "cost formula",
            "real-time cost calculation",
            "token cost math",
        ],
        "topic": "Real-Time Benchmark Cost Model",
        "answer": (
            "### Real-Time Cost Formula\n\n"
            "$$\\text{Total Spend ($)} = \\sum_{i=1}^{N} \\left[ \\left(\\frac{\\text{Prompt Tokens}_i \\times P_{\\text{in}}}{10^6}\\right) + \\left(\\frac{\\text{Gen Tokens}_i \\times P_{\\text{out}}}{10^6}\\right) \\right]$$\n\n"
            "- $P_{\\text{in}}$: Cost per 1 Million prompt tokens (USD).\n"
            "- $P_{\\text{out}}$: Cost per 1 Million generation tokens (USD).\n"
            "- Self-hosted engines (vLLM, Ollama) can be set to $0.00 or customized with your GPU hourly instance amortization rate."
        ),
        "followups": [
            "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
            "What happens when the spend cap is hit?",
            "How to input custom provider token pricing?",
        ],
    },
    {
        "question": "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
        "keywords": [
            "anthropic vs openai wire protocols",
            "wire protocols streaming",
            "sse format differences",
            "anthropic stream parsing",
        ],
        "topic": "OpenAI vs. Anthropic Wire Protocol Differences",
        "answer": (
            "### OpenAI vs. Anthropic Wire Protocols\n\n"
            "| Dimension | OpenAI (`/v1/chat/completions`) | Anthropic (`/v1/messages`) |\n"
            "| :--- | :--- | :--- |\n"
            '| **Framing** | `data: {"choices": [{"delta": {"content": "..."}}]}` | `event: content_block_delta`<br>`data: {"delta": {"text": "..."}}` |\n'
            '| **Usage Telemetry** | Streamed in final chunk with `stream_options: {"include_usage": true}` | Streamed across `message_start` and `message_delta` events |\n'
            '| **System Prompt** | Passed as `{"role": "system"}` in messages array | Passed as dedicated top-level `system` parameter |\n'
            "| **Streaming Overhead** | Standard JSON chunk parsing | Event-type header parsing prior to JSON extraction |"
        ),
        "followups": [
            "What causes connection latency overhead in cloud endpoints?",
            "How to configure custom vLLM / Ollama endpoints?",
            "Why is HTTP/2 or HTTP/3 connection reuse critical?",
        ],
    },
    {
        "question": "How do MoE (Mixture of Experts) models behave under load?",
        "keywords": [
            "moe models behave under load",
            "mixture of experts load",
            "moe vs dense inference",
            "deepseek v3 moe",
        ],
        "topic": "Mixture-of-Experts (MoE) Inference Dynamics",
        "answer": (
            "### Mixture of Experts (MoE) Performance Dynamics\n\n"
            "In MoE models (e.g. **DeepSeek-V3**, **Mixtral 8x22B**):\n\n"
            "1. **Sparse Activation**:\n"
            "   - Total model weights may be $671\\text{B}$, but each token dynamically routes to only $37\\text{B}$ active parameters.\n"
            "2. **High Decode Throughput**:\n"
            "   - Because only a fraction of total parameters must be loaded into registers per token, decode speed is significantly faster than an equivalent dense model.\n"
            "3. **High VRAM Requirement**:\n"
            "   - 100% of all expert weights must still reside in GPU VRAM, requiring multi-GPU tensor parallelism (e.g. 8x H100s)."
        ),
        "followups": [
            "What is the VRAM footprint of 8B vs 70B models?",
            "How does quantization (FP8/INT4) affect TPS?",
            "How does model parameter size influence prefill vs decode memory bandwidth?",
        ],
    },
    {
        "question": "How does quantization (FP8/INT4) affect TPS?",
        "keywords": [
            "quantization fp8 int4 tps",
            "quantization speedup",
            "fp8 vs int4 throughput",
            "quantized decode speed",
        ],
        "topic": "Quantization & Memory Bandwidth Scaling",
        "answer": (
            "### Quantization Impact on Inference Speed\n\n"
            "Autoregressive decode is strictly **memory bandwidth bound**:\n\n"
            "$$\\text{Speedup} \\approx \\frac{\\text{Original Precision (16-bit)}}{\\text{Quantized Precision (8-bit or 4-bit)}}$$\n\n"
            "- **FP8 Quantization**:\n"
            "  - Reduces model weight size by $50\\%$.\n"
            "  - Doubles decode throughput on NVIDIA Ada/Hopper architectures (native FP8 Tensor Cores) with minimal perplexity degradation.\n"
            "- **INT4 (AWQ / GPTQ)**:\n"
            "  - Cuts weights to $25\\%$, allowing a 70B model to fit on a single 48GB GPU (e.g. RTX 6000 Ada)."
        ),
        "followups": [
            "How do MoE (Mixture of Experts) models behave under load?",
            "What is the VRAM footprint of 8B vs 70B models?",
            "How does model parameter size influence prefill vs decode memory bandwidth?",
        ],
    },
    {
        "question": "How do token ratios (prefill vs. decode) affect benchmarking results?",
        "keywords": [
            "token ratios",
            "prefill vs decode",
            "prompt ratio",
            "workload ratio",
            "prompt to generation",
        ],
        "topic": "Token Ratios & Workload Archetypes",
        "answer": (
            "### Prefill vs. Decode Ratios in Benchmarking\n\n"
            "LLM inference comprises two distinct compute regimes:\n\n"
            "1. **Prefill Phase (FLOP-Bound)**:\n"
            "   - Ingests the entire prompt in parallel using Tensor Cores.\n"
            "   - Computational complexity scales with context length squared ($O(N^2)$ attention).\n"
            "   - Governs **TTFT** (Time to First Token).\n"
            "2. **Decode Phase (Memory-Bandwidth-Bound)**:\n"
            "   - Generates tokens autoregressively, loading all weights once per token.\n"
            "   - Governs **TPOT** and **ITL**.\n\n"
            "**Benchmark Sizing Strategy**:\n"
            "- **RAG**: 8,000 prompt / 200 gen $\\to$ Measures cold matrix prefill density.\n"
            "- **Chat**: 250 prompt / 150 gen $\\to$ Measures interactive human conversational responsiveness.\n"
            "- **Reasoning/Code**: 300 prompt / 2,000 gen $\\to$ Measures sustained autoregressive decode bandwidth."
        ),
        "followups": [
            "Why is TTFT critical for RAG vs. Chat?",
            "How to benchmark reasoning (CoT) models?",
            "What is the difference between TTFT and TTFA?",
        ],
    },
    {
        "question": "How do Temperature, Top-P, and Max Tokens impact benchmark accuracy?",
        "keywords": [
            "temperature top p max tokens impact",
            "sampling parameters accuracy",
            "sampling benchmark impact",
        ],
        "topic": "Sampling Parameter Rigor in Benchmarks",
        "answer": (
            "### Benchmark Calibration via Sampling Settings\n\n"
            "1. **Temperature = 0.0 (Argmax / Greedy)**:\n"
            "   - Guarantees 100% deterministic output paths across all runs and providers.\n"
            "   - Eliminates stochastic token variance, ensuring that throughput comparisons reflect pure hardware differences.\n"
            "2. **Top-P (Nucleus Sampling)**:\n"
            "   - Limits sampling to the cumulative probability mass $P$ (e.g. 0.9).\n"
            "   - Setting Top-P lower avoids rare token paths that cause early or late sequence termination.\n"
            "3. **Max Tokens**:\n"
            "   - Acts as a deterministic decode budget ceiling across all worker streams."
        ),
        "followups": [
            "Why use Temperature = 0 for throughput tests?",
            "How does sampling affect token jitter & ITL?",
            "What happens when Max Tokens is reached?",
        ],
    },
    {
        "question": "How do I choose the right concurrency worker pool for stress testing?",
        "keywords": [
            "choose concurrency worker pool",
            "right concurrency",
            "worker pool size",
            "how many workers",
        ],
        "topic": "Concurrency Pool Sizing Strategy",
        "answer": (
            "### Concurrency Pool Sizing Guidelines\n\n"
            "1. **Baseline Single-Stream ($N = 1$)**:\n"
            "   - Captures minimal theoretical TTFT and maximum single-user token streaming speed.\n"
            "2. **Production Multi-Tenant ($N = 10\\text{--}32$)**:\n"
            "   - Saturated continuous batching sweet spot for standard 8x H100 or hosted enterprise endpoints.\n"
            "3. **Stress Testing / Saturation Knee Probe ($N = 50\\text{--}128$)**:\n"
            "   - Overloads the serving engine to identify where the KV cache fills up and queue delay spikes exponentially."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "What is the relationship between RPS and concurrency?",
            "When does TTFT degrade exponentially?",
        ],
    },
    {
        "question": "What is the Saturation Knee Probe and how does it detect cluster limits?",
        "keywords": [
            "saturation knee probe detect cluster limits",
            "knee probe explained",
            "detect cluster limits",
        ],
        "topic": "Saturation Knee Probe Architecture",
        "answer": (
            "### Saturation Knee Probe Architecture\n\n"
            "The **Saturation Knee Probe** runs a geometric load progression ($1 \\to 3 \\to 8 \\to 16 \\to 32 \\to 64$):\n\n"
            "- At each step, it records **TTFT P95**, **Goodput Yield**, and **HTTP 429 Rate Limits**.\n"
            "- It automatically calculates the second derivative $\\frac{d^2 \\text{TTFT}}{dN^2}$ to pinpoint the **inflection knee** $N_{\\text{knee}}$ where GPU VRAM is exhausted and queueing begins."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "Why is Constant load not enough for production testing?",
            "How does Poisson arrival model human traffic?",
        ],
    },
    {
        "question": "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
        "keywords": [
            "bypass kv cache nonce injection",
            "cold gpu prefill",
            "nonce injection measure",
            "cache bust",
        ],
        "topic": "Cold GPU Prefill Measurement via Nonce",
        "answer": (
            "### Cold GPU Prefill via Nonce Injection\n\n"
            "Modern inference engines (vLLM, SGLang, OpenAI, Anthropic) reuse KV cache tensors across identical prompt prefixes.\n\n"
            "- When **Bypass KV Cache** is enabled, LLMark prefixes each prompt with a unique UUID timestamp `[nonce:1724758920-a8f1]`.\n"
            "- This forces the inference engine to compute full multi-head self-attention across every layer, measuring **cold hardware prefill latency and TFLOPS** rather than warm cache hits."
        ),
        "followups": [
            "How much speedup does prompt prefix caching provide?",
            "How is KV cache memory calculated per stream?",
            "Why do warmup requests matter?",
        ],
    },
    {
        "question": "How does model parameter size influence prefill vs decode memory bandwidth?",
        "keywords": [
            "model parameter size influence prefill decode",
            "model size memory bandwidth",
            "weights memory bandwidth",
        ],
        "topic": "Model Parameter Sizing & Memory Physics",
        "answer": (
            "### Model Parameter Size & Memory Physics\n\n"
            "- **Prefill (Compute-Bound)**:\n"
            "  $$\\text{Prefill FLOPs} \\approx 2 \\times P \\times T_{\\text{prompt}}$$\n"
            "  Larger models scale proportionally with parameter count $P$.\n"
            "- **Decode (Memory Bandwidth-Bound)**:\n"
            "  $$\\text{Decode Latency per Token} \\approx \\frac{P \\times B_{\\text{prec}}}{\\text{GPU Memory Bandwidth (TB/s)}}$$\n"
            "  A 70B parameter model in FP16 requires transferring $140\\text{ GB}$ of weights across the bus for every single generated token!"
        ),
        "followups": [
            "How do MoE (Mixture of Experts) models behave under load?",
            "What is the VRAM footprint of 8B vs 70B models?",
            "How does quantization (FP8/INT4) affect TPS?",
        ],
    },
    {
        "question": "How does the 3-stage reliability sieve work?",
        "keywords": [
            "3-stage reliability sieve",
            "reliability sieve work",
            "3 stage sieve",
            "goodput sieve",
        ],
        "topic": "The 3-Stage Reliability Sieve",
        "answer": (
            "### The 3-Stage Reliability Sieve\n\n"
            "LLMark filters every completed request through 3 cascading gates:\n\n"
            "1. **Stage 1 (Transport & Integrity)**: Confirms HTTP 200, valid SSE framing, and zero truncated JSON payloads.\n"
            "2. **Stage 2 (Latency Budgets)**: Validates that $\\text{TTFT} \\le \\text{Threshold}$ and $\\text{TPOT} \\le \\text{Threshold}$.\n"
            "3. **Stage 3 (Deadline Enforcement)**: Validates total $\\text{E2E Duration} \\le \\text{Max SLA Deadline}$.\n\n"
            "Tokens from requests failing any stage are discarded from **Goodput** calculations."
        ),
        "followups": [
            "What is Goodput and why is it superior to Raw Throughput?",
            "What are standard production SLO thresholds?",
            "How does TPOT differ from ITL?",
        ],
    },
    {
        "question": "What happens when the spend cap is hit?",
        "keywords": [
            "what happens when spend cap hit",
            "spend cap triggered",
            "budget cap exceeded",
        ],
        "topic": "Spend Cap Trip Dynamics",
        "answer": (
            "### What Happens When the Spend Cap is Hit\n\n"
            "When accumulated token spend reaches your **Hard Spend Cap**:\n\n"
            "1. **Instant Reactive Abort**: Orchestrator sends an asynchronous cancellation signal to all active HTTP sockets within $\\le 50\\text{ms}$.\n"
            "2. **Clean Telemetry Flush**: All completed streams up to that millisecond are finalized and saved into benchmark history.\n"
            "3. **Report Flagging**: Benchmark run is marked as `ABORTED_SPEND_CAP_REACHED`, preventing accidental cloud billing."
        ),
        "followups": [
            "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
            "How is benchmark cost calculated in real time?",
            "How to input custom provider token pricing?",
        ],
    },
    {
        "question": "How to input custom provider token pricing?",
        "keywords": [
            "input custom provider token pricing",
            "custom pricing override",
            "enterprise rate pricing",
        ],
        "topic": "Custom Token Pricing Configuration",
        "answer": (
            "### Configuring Custom Token Pricing\n\n"
            "In Step 4B (Spend Guardrails):\n\n"
            "- Toggle **Custom Pricing Override** ON.\n"
            "- Enter your contract prompt rate ($P_{\\text{in}}$ per 1M tokens) and completion rate ($P_{\\text{out}}$ per 1M tokens).\n"
            "- Set both to `$0.00` for self-hosted vLLM/Ollama clusters or enter your amortized hourly GPU rate."
        ),
        "followups": [
            "How is benchmark cost calculated in real time?",
            "How does the zero bill-shock circuit breaker protect against runaway cloud costs?",
            "What happens when the spend cap is hit?",
        ],
    },
    {
        "question": "What causes connection latency overhead in cloud endpoints?",
        "keywords": [
            "causes connection latency overhead",
            "cloud endpoints latency overhead",
            "connection overhead",
        ],
        "topic": "Cloud Endpoint Connection Overhead Breakdown",
        "answer": (
            "### Anatomy of Cloud Connection Overhead\n\n"
            "1. **DNS Resolution**: $10\\text{--}40\\text{ms}$ depending on resolver cache.\n"
            "2. **TCP Handshake**: $1\\text{ RTT}$ ($20\\text{--}50\\text{ms}$ based on cloud region distance).\n"
            "3. **TLS 1.3 Key Exchange**: $1\\text{ RTT}$ ($20\\text{--}50\\text{ms}$).\n"
            "4. **API Gateway & Auth Verification**: $15\\text{--}40\\text{ms}$ for token validation and rate limiter check.\n\n"
            "> Warmup requests eliminate 1-3 by maintaining persistent HTTP/2 keep-alive connections."
        ),
        "followups": [
            "Why do warmup requests matter?",
            "Why is HTTP/2 or HTTP/3 connection reuse critical?",
            "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
        ],
    },
    {
        "question": "How to configure custom vLLM / Ollama endpoints?",
        "keywords": [
            "configure custom vllm ollama",
            "vllm endpoint setup",
            "ollama benchmark setup",
        ],
        "topic": "Self-Hosted vLLM & Ollama Configuration",
        "answer": (
            "### Connecting Self-Hosted vLLM / Ollama\n\n"
            "1. In Step 1, select **OpenAI Compatible** provider.\n"
            "2. Set **Base URL**:\n"
            "   - **vLLM**: `http://localhost:8000/v1`\n"
            "   - **Ollama**: `http://localhost:11434/v1`\n"
            "3. Enter API Key: `EMPTY` or `ollama`.\n"
            "4. Enter target Model ID (e.g. `meta-llama/Llama-3.1-8B-Instruct` or `llama3.1:8b`)."
        ),
        "followups": [
            "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
            "What is the VRAM footprint of 8B vs 70B models?",
            "Why should I bypass KV Cache (nonce injection) and how does it measure cold GPU prefill?",
        ],
    },
    {
        "question": "Why is HTTP/2 or HTTP/3 connection reuse critical?",
        "keywords": [
            "http2 http3 connection reuse",
            "multiplexing sse",
            "connection reuse critical",
        ],
        "topic": "HTTP/2 & HTTP/3 Transport Multiplexing",
        "answer": (
            "### HTTP/2 & Multiplexing in LLM Streaming\n\n"
            "- **Head-of-Line Blocking Elimination**: Multiplexes dozens of concurrent SSE token streams over a single TLS connection.\n"
            "- **Socket Exhaustion Prevention**: Prevents running out of ephemeral client OS ports when running 100+ concurrent workers."
        ),
        "followups": [
            "What causes connection latency overhead in cloud endpoints?",
            "Why do warmup requests matter?",
            "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
        ],
    },
    {
        "question": "What is the VRAM footprint of 8B vs 70B models?",
        "keywords": ["vram footprint 8b vs 70b", "8b vs 70b vram", "gpu memory requirements 70b"],
        "topic": "VRAM Footprint Comparison (8B vs 70B)",
        "answer": (
            "### VRAM Sizing: 8B vs 70B Models\n\n"
            "| Component | Llama-3-8B (FP16) | Llama-3-8B (FP8) | Llama-3-70B (FP16) | Llama-3-70B (FP8) |\n"
            "| :--- | :--- | :--- | :--- | :--- |\n"
            "| **Model Weights** | $16\\text{ GB}$ | $8\\text{ GB}$ | $140\\text{ GB}$ | $70\\text{ GB}$ |\n"
            "| **KV Cache / 1K Tokens** | $0.25\\text{ MB}$ | $0.13\\text{ MB}$ | $1.25\\text{ MB}$ | $0.63\\text{ MB}$ |\n"
            "| **Min GPU Target** | 1x RTX 4090 (24GB) | 1x RTX 4070 (12GB) | 2x H100 (80GB) | 1x H100 (80GB) |"
        ),
        "followups": [
            "How is KV cache memory calculated per stream?",
            "How does quantization (FP8/INT4) affect TPS?",
            "How do MoE (Mixture of Experts) models behave under load?",
        ],
    },
    {
        "question": "How do I optimize my benchmark parameters?",
        "keywords": [
            "optimize my benchmark parameters",
            "how do i optimize benchmark",
            "best benchmark configuration",
        ],
        "topic": "End-to-End Benchmark Optimization Playbook",
        "answer": (
            "### 4-Step Benchmark Optimization Playbook\n\n"
            "1. **Step 1 (Wire Protocol)**: Enable Warmup runs (1-3) to prime persistent TLS connections.\n"
            "2. **Step 2 (Workload & Sampling)**: Match input/output token ratio to your production scenario and set $\\text{Temperature} = 0.0$ for deterministic results.\n"
            "3. **Step 3 (Traffic & Knee)**: Use the Saturation Knee Probe to discover the cluster inflection limit $N_{\\text{knee}}$.\n"
            "4. **Step 4 (SLO & Safety)**: Set realistic Goodput latency thresholds (TTFT $\\le 800\\text{ms}$, TPOT $\\le 35\\text{ms}$) and a hard spend cap (e.g. $1.50) for cost safety."
        ),
        "followups": [
            "What is Goodput and why is it superior to Raw Throughput?",
            "How to find the saturation cliff of a cluster?",
            "Why is TTFT critical for RAG vs. Chat?",
        ],
    },
]

TOPIC_ARTICLES: dict[str, dict[str, Any]] = {
    "workload-preset": {
        "id": "workload-preset",
        "keywords": [
            "workload",
            "preset",
            "prompt",
            "token",
            "ratio",
            "scenario",
            "rag",
            "code",
            "cot",
            "reasoning",
        ],
        "topic": "Workload Scenarios & Prompt-to-Gen Ratios",
        "answer": (
            "### Workload Profiles & Token Ratios\n\n"
            "- **Prefill-Heavy (e.g. Enterprise RAG, Context Retrieval)**: High prompt tokens (3000-8000), low output tokens (100-300). Tests GPU compute density and memory transfer rate during the prefill phase.\n"
            "- **Decode-Heavy (e.g. Code Generation, CoT Reasoning)**: Moderate prompt tokens (100-500), high output tokens (800-2000). Tests memory bandwidth limitations during autoregressive single-token decode passes.\n"
            "- **Balanced Conversational (Chat)**: Low-to-moderate prompt (200) and generation (150). Focuses on human reading speed, low initial TTFT latency, and sustained ITL smoothness."
        ),
        "followups": [
            "Why is TTFT critical for RAG vs. Chat?",
            "How to benchmark reasoning (CoT) models?",
            "What is the difference between TTFT and TTFA?",
        ],
    },
    "sampling-params": {
        "id": "sampling-params",
        "keywords": [
            "sampling",
            "temperature",
            "top_p",
            "entropy",
            "max_tokens",
            "greedy decoding",
        ],
        "topic": "Sampling Hyperparameters & Output Entropy",
        "answer": (
            "### Temperature & Top-P in LLM Benchmarking\n\n"
            "- **Temperature = 0.0 (Argmax / Greedy Decoding)**: Best for reproducible throughput benchmarks. It forces the model to pick the highest probability token, eliminating entropy variance across runs.\n"
            "- **Temperature > 0.7 (Creative / High Entropy)**: Flattens the softmax probability distribution across the vocabulary. In autoregressive generation, this leads to variable output sequence lengths and slight decode jitter.\n"
            "- **Top-P (Nucleus Sampling)**: Dynamically truncates the probability mass to the top $P$ tokens (e.g., top 90%). Setting Top-P lower (e.g., 0.8) prevents low-probability outlier tokens.\n\n"
            "**Benchmarking Recommendation:**\n"
            "For measuring pure hardware latency and throughput (TTFT & TPOT), keep **Temperature = 0.0** and fixed **Max Tokens** so all concurrency streams generate identical token lengths."
        ),
        "followups": [
            "Why use Temperature = 0 for throughput tests?",
            "How does sampling affect token jitter & ITL?",
            "What happens when Max Tokens is reached?",
        ],
    },
    "traffic-concurrency": {
        "id": "traffic-concurrency",
        "keywords": ["traffic", "concurrency", "worker", "pool", "queue", "saturation", "streams"],
        "topic": "Concurrency Workers & Queue Saturation",
        "answer": (
            "### Concurrency & Worker Streams\n\n"
            "**Concurrency ($N$)** represents the number of simultaneous active HTTP streaming connections hitting the model endpoint:\n\n"
            "$$\\text{Throughput (RPS)} = \\frac{\\text{Concurrency}}{\\text{Mean Latency (seconds)}}$$\n\n"
            "- **Under-saturation ($N < N_{\\text{knee}}$)**: GPU compute units are under-utilized. TTFT remains low and stable.\n"
            "- **Optimal Saturation ($N = N_{\\text{knee}}$)**: Continuous batching (e.g. vLLM, TensorRT-LLM, TGI) achieves maximum aggregate tokens/second throughput.\n"
            "- **Over-saturation ($N > N_{\\text{knee}}$)**: KV cache slots run out in VRAM. The inference scheduler buffers incoming requests in CPU queue, causing TTFT tail latencies (P95/P99) to spike dramatically (Little's Law: $L_q = \\lambda W_q$)."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "What is the relationship between RPS and concurrency?",
            "When does TTFT degrade exponentially?",
        ],
    },
    "load-curve": {
        "id": "load-curve",
        "keywords": [
            "curve",
            "load",
            "knee",
            "poisson",
            "saturation",
            "ramp",
            "spike",
            "concurrency",
            "traffic",
        ],
        "topic": "Traffic Load Curves & Saturation Dynamics",
        "answer": (
            "### Load Curve Geometries & Queue Saturation\n\n"
            "1. **Constant / Flat**: Maintains a fixed number of concurrent worker streams. Ideal for measuring sustained decode throughput (tokens/sec) and identifying steady-state memory utilization.\n"
            "2. **Step Ramp (Staircase)**: Gradually increments concurrency in discrete steps (e.g. 5 → 10 → 25 → 50). This reveals the exact concurrency threshold where the GPU prefill/decode scheduler becomes saturated.\n"
            "3. **Poisson (Stochastic Arrival)**: Models real-world human arrival patterns where inter-arrival times follow exponential distribution $P(t) = \\lambda e^{-\\lambda t}$. Tests how well the inference gateway buffers bursts.\n"
            "4. **Spike / Stress Wave**: Abruptly injects a 3x-5x concurrency surge to test autoscaling latency, connection pool limits, and rate limit resilience (HTTP 429).\n"
            "5. **Saturation Knee Probe (1→3→8→16→50)**: Isolates the *inflection point* where KV cache memory slots are exhausted and requests begin queueing, causing Time to First Token (TTFT) to spike exponentially (Little's Law: $L_q = \\lambda W_q$)."
        ),
        "followups": [
            "How to find the saturation cliff of a cluster?",
            "What is the relationship between RPS and concurrency?",
            "How does Poisson arrival model human traffic?",
        ],
    },
    "provider-routing": {
        "id": "provider-routing",
        "keywords": [
            "provider",
            "routing",
            "protocol",
            "sse",
            "endpoint",
            "tls",
            "handshake",
            "anthropic",
            "openai",
        ],
        "topic": "Provider Wire Protocols & Connection Routing",
        "answer": (
            "### Provider Wire Protocols & Network Handshakes\n\n"
            "- **Server-Sent Events (SSE)**: Standard HTTP streaming mechanism used across OpenAI, Anthropic, and vLLM. Each token chunk is streamed as an SSE frame.\n"
            "- **TLS Handshake & Connection Pooling**: A fresh TLS 1.3 handshake adds 30-80ms of network overhead before the prompt reaches the GPU.\n"
            "- **Warmup Requests**: Always use warmup runs to establish persistent TCP/TLS keep-alive sockets before benchmarking raw inference speed."
        ),
        "followups": [
            "How do wire protocols like Anthropic vs OpenAI differ in streaming performance?",
            "Why do warmup requests matter?",
            "What causes connection latency overhead in cloud endpoints?",
        ],
    },
    "model-sizing": {
        "id": "model-sizing",
        "keywords": [
            "model",
            "weights",
            "parameters",
            "sizing",
            "dense",
            "moe",
            "b200",
            "h100",
            "vram",
            "quantization",
        ],
        "topic": "Model Architecture & Parameter Sizing",
        "answer": (
            "### Model Architecture & Memory Bandwidth\n\n"
            "- **Dense Models (e.g. Llama-3-8B / 70B)**: Autoregressive decode must stream all active weights across the memory bus for every token generated. Speed is directly determined by GPU HBM bandwidth (TB/s).\n"
            "- **Mixture of Experts (MoE, e.g. DeepSeek-V3)**: Activates only a subset of total parameter experts per token, delivering higher decode throughput at lower compute cost.\n"
            "- **Quantization (FP8 / INT4)**: Cuts weight memory footprint in half, doubling effective memory bandwidth and increasing batch capacity."
        ),
        "followups": [
            "How do MoE (Mixture of Experts) models behave under load?",
            "What is the VRAM footprint of 8B vs 70B models?",
            "How does quantization (FP8/INT4) affect TPS?",
        ],
    },
}


def _normalize_text(text: str) -> str:
    """Normalize text by stripping punctuation and lowercasing for fuzzy matching."""
    text = text.lower().strip()
    return re.sub(r"[^\w\s]", "", text)


def _find_best_knowledge_match(
    query: str, context_topic: str | None = None
) -> dict[str, Any] | None:
    """Accurately finds matching curated knowledge answer only for exact or high-confidence question matches.
    Never hijacks custom questions with generic topic overviews."""
    q_norm = _normalize_text(query)
    q_words = set(q_norm.split())

    # Stopwords to ignore in overlap calculation
    stopwords = {
        "what",
        "is",
        "the",
        "how",
        "do",
        "does",
        "why",
        "for",
        "and",
        "or",
        "in",
        "to",
        "of",
        "a",
        "an",
        "vs",
        "difference",
        "between",
    }
    meaningful_q_words = q_words - stopwords

    # 1. Exact or high-confidence match in dedicated QA items
    for item in DEDICATED_QA_ITEMS:
        item_q_norm = _normalize_text(item["question"])
        if q_norm == item_q_norm:
            return item

        item_words = set(item_q_norm.split()) - stopwords
        if meaningful_q_words and item_words:
            overlap = len(meaningful_q_words & item_words)
            jaccard = overlap / len(meaningful_q_words | item_words)
            if jaccard >= 0.70 or (overlap >= 4 and overlap == len(item_words)):
                return item

    # 2. Exact match against curated default questions in topic articles
    for article in TOPIC_ARTICLES.values():
        article_q_norm = _normalize_text(article.get("default_question", ""))
        if article_q_norm and q_norm == article_q_norm:
            return article

    # If it is a custom question or does not match dedicated questions, return None so it is handled dynamically
    return None


# Specifically hardcoded production models for Groq
GROQ_CHEAPEST_MODEL = "llama-3.1-8b-instant"  # $0.05 / 1M tokens, ultra-fast 800+ tok/s
GROQ_BEST_MODEL = "llama-3.3-70b-versatile"  # Flagship 70B reasoning & accuracy


def _clean_llm_markdown_and_latex(text: str) -> str:
    """Sanitize and normalize markdown & LaTeX generated by LLM models."""
    if not text:
        return ""

    # 0. Strip any stray emojis or decorative symbols
    cleaned = re.sub(
        r"[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\u2b55\ufe0f\u200d]",
        "",
        text,
    )

    # 1. Convert code fences ```math, ```latex, or ```katex to standard $$ block equations
    cleaned = re.sub(
        r"```(?:math|latex|katex|tex)\s*\n([\s\S]*?)\n```",
        r"$$\n\1\n$$",
        cleaned,
        flags=re.IGNORECASE,
    )

    # 2. Normalize display math \[ ... \] to $$ ... $$
    cleaned = re.sub(
        r"(?<!\\)\\\[([\s\S]*?)(?<!\\)\\\]",
        r"$$\n\1\n$$",
        cleaned,
    )

    # 3. Normalize inline math \( ... \) to $ ... $
    cleaned = re.sub(
        r"(?<!\\)\\\(([\s\S]*?)(?<!\\)\\\)",
        r"$\1$",
        cleaned,
    )

    # 4. Fix accidental double-escaped backslashes before common LaTeX commands (e.g. \\text -> \text)
    cleaned = re.sub(
        r"\\\\([a-zA-Z]+)",
        r"\\\1",
        cleaned,
    )

    # 5. Fix accidental double-escaped backslashes before common escaped symbols (e.g. \\_ -> \_)
    cleaned = re.sub(
        r"\\\\([_&%#{}$])",
        r"\\\1",
        cleaned,
    )

    # 6. Normalize double spaces
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)

    return cleaned.strip()


async def _query_groq_llm(
    api_key: str,
    query: str,
    context_topic: str | None,
    vendor: str | None,
    model: str | None,
    messages_history: list[ChatMessage] | None,
    custom_base_url: str | None = None,
) -> ExpertQueryResponse | None:
    """Queries Groq / OpenAI-compatible Chat Completions API with dynamic model discovery and fallback."""
    # Determine Base URL: custom -> OpenAI if standard sk- -> Groq
    base_url = custom_base_url
    is_openai = bool(api_key.startswith("sk-") and not api_key.startswith("gsk_"))
    if not base_url:
        base_url = "https://api.openai.com/v1" if is_openai else "https://api.groq.com/openai/v1"

    groq_client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=30.0,
    )

    # 1. Dynamically discover active models from the remote endpoint via models.list()
    active_remote_models: list[str] = []
    try:
        remote_models_resp = await groq_client.models.list()
        if remote_models_resp and getattr(remote_models_resp, "data", None):
            for m in remote_models_resp.data:
                mid = getattr(m, "id", None)
                if mid and isinstance(mid, str):
                    mid_lower = mid.lower()
                    # Filter out non-chat models (whisper, audio, embeddings, moderation)
                    if not any(
                        x in mid_lower for x in ("whisper", "guard", "embed", "tts", "moderation")
                    ):
                        active_remote_models.append(mid)
    except Exception as e:
        logger.debug("Could not dynamically list models from %s: %s", base_url, e)

    # 2. Build prioritized candidate list
    models_to_try: list[str] = []

    # If user/env specified a model and it makes sense for this endpoint
    env_model = os.environ.get("GROQ_MODEL") or getattr(settings, "GROQ_MODEL", None)
    if env_model and env_model.strip():
        models_to_try.append(env_model.strip())

    if model and model.strip():
        m_str = model.strip()
        # Don't try OpenAI model IDs on Groq unless configured
        if not ("groq" in base_url and m_str.lower().startswith(("gpt-", "o1-", "o3-", "claude-"))):
            models_to_try.append(m_str)

    if is_openai:
        # Preferred OpenAI chat models
        models_to_try.extend(
            [
                "gpt-4o-mini",
                "gpt-4o",
                "gpt-3.5-turbo",
            ]
        )
    else:
        if active_remote_models:
            # Sort dynamically discovered models: prioritize best/cheapest known
            # 1. Flagship cheap instant
            if GROQ_CHEAPEST_MODEL in active_remote_models:
                models_to_try.append(GROQ_CHEAPEST_MODEL)
            # 2. Flagship best versatile
            if GROQ_BEST_MODEL in active_remote_models:
                models_to_try.append(GROQ_BEST_MODEL)
            # 3. Known alternate chat models
            for pref in [
                "llama-3.1-70b-versatile",
                "qwen-2.5-32b",
                "qwen-2.5-coder-32b",
                "gpt-oss-20b",
                "deepseek-r1-distill-qwen-32b",
                "meta-llama/llama-3.3-70b-instruct",
            ]:
                if pref in active_remote_models:
                    models_to_try.append(pref)
            # 4. Any other discovered active chat models
            models_to_try.extend(active_remote_models)
        else:
            # Explicitly hardcoded fallback list: cheapest first, then best
            models_to_try.extend(
                [
                    GROQ_CHEAPEST_MODEL,
                    GROQ_BEST_MODEL,
                    "qwen-2.5-32b",
                    "gpt-oss-20b",
                    "meta-llama/llama-3.3-70b-instruct",
                ]
            )

    # Deduplicate while preserving priority order
    models_to_try = list(dict.fromkeys([m for m in models_to_try if m]))

    for target_model in models_to_try:
        try:
            system_prompt = (
                "You are LLMark Inference Copilot, a Principal Systems Architect specializing in Large Language Model (LLM) serving infrastructure, continuous batching, memory physics, and distributed inference telemetry.\n"
                "Deliver direct, highly technical, and concise answers (strictly under 180 words total). Adopt a clean, executive engineering style with high signal-to-noise ratio. Avoid conversational filler, introductory pleasantries, or speculative fluff.\n\n"
                "CRITICAL STYLE REQUIREMENT:\n"
                "- Do NOT use any emojis, emoticons, or decorative symbols anywhere in your response. Keep all headers, bullet points, and text strictly professional, minimal, and clean.\n\n"
                "Structure your answer into exactly 3 compact sections:\n"
                "1. **Conceptual Summary**: 1-2 sharp, precise sentences articulating the core architecture or trade-off.\n"
                "2. **Key Mechanics**: 2-3 concise engineering bullet points incorporating exact mathematical formulas ($...$ or $$...$$) and hardware metrics (HBM bandwidth, FLOPs/byte, KV cache allocation, or queuing dynamics).\n"
                "3. **Benchmark Recommendation**: 1 actionable configuration parameter, load curve profile, or SLO threshold for LLMark.\n\n"
                f"Context: Vendor={vendor or 'cloud'}, Model={model or target_model}, Topic={context_topic or 'Inference'}\n\n"
                "Mathematical & Markdown Formatting Requirements (CRITICAL):\n"
                "- Format all formulas using standard KaTeX-compatible LaTeX.\n"
                "- For INLINE math: use single dollar signs with NO whitespace right after opening $ or before closing $ (e.g. `$T_{\\text{prefill}} \\le 50\\text{ms}$`, NEVER `$ formula $`).\n"
                "- For STANDALONE / BLOCK formulas: use double dollar signs on their own dedicated lines:\n"
                "  $$\n"
                "  \\text{Throughput} = \\frac{\\text{Concurrency}}{\\text{Mean Latency}}\n"
                "  $$\n"
                "- Wrap multi-character variable names, acronyms, and units in \\text{...} (e.g. \\text{TTFT}, \\text{TPOT}, \\text{RPS}, \\text{ITL}, \\text{VRAM}, \\text{ms}).\n"
                "- Use standard KaTeX operators: \\frac{a}{b}, \\times, \\cdot, \\approx, \\le, \\ge, \\to, \\Delta, \\sum, \\min, \\max, \\lambda, \\mu, \\sigma.\n"
                "- DO NOT wrap formulas in code blocks like ```math or ```latex; always use $$ or $ delimiters.\n"
                "- DO NOT use \\[...\\] or \\(...\\) delimiters.\n"
                "- When mentioning monetary costs or prices, write 'USD' or escaped '\\$' (e.g. '0.50 USD' or '\\$0.50 per 1M tokens'), never an unescaped '$' that collides with math delimiters.\n"
                "- Avoid unsupported environments like \\begin{align}; write clean, self-contained equations.\n\n"
                "Guidelines:\n"
                "- Keep explanations compact, tight, and directly answering what was asked.\n"
                "- End with exactly 3 short follow-up questions formatted as:\n"
                'FOLLOWUP_QUESTIONS: ["Question 1?", "Question 2?", "Question 3?"]'
            )

            formatted_messages = [{"role": "system", "content": system_prompt}]

            if messages_history:
                for msg in messages_history[-6:]:
                    if msg.role in ("user", "assistant"):
                        formatted_messages.append({"role": msg.role, "content": msg.content})

            formatted_messages.append({"role": "user", "content": query})

            response = await groq_client.chat.completions.create(
                model=target_model,
                messages=formatted_messages,  # type: ignore[arg-type]
                temperature=0.3,
                max_tokens=750,
            )

            raw_text = response.choices[0].message.content or ""

            # Extract follow-up questions
            followups = []
            answer_text = raw_text

            # 1. Try JSON list format
            followup_match = re.search(r"FOLLOWUP_QUESTIONS:\s*(\[.*?\])", raw_text, re.DOTALL | re.IGNORECASE)
            if followup_match:
                try:
                    parsed = json.loads(followup_match.group(1))
                    if isinstance(parsed, list):
                        followups = [str(q).strip() for q in parsed[:3]]
                    answer_text = raw_text[: followup_match.start()].strip()
                except Exception:
                    pass

            # 2. If not matched or failed, try numbered / bullet list format
            if not followups:
                followup_list_match = re.search(
                    r"FOLLOWUP_QUESTIONS:\s*\n*((?:\s*[-*\d.]+\s*.+\n?)+)",
                    raw_text,
                    re.IGNORECASE,
                )
                if followup_list_match:
                    lines = followup_list_match.group(1).strip().split("\n")
                    extracted = [
                        re.sub(r"^\s*[-*\d.]+\s*", "", line).strip(' "[]\'')
                        for line in lines
                        if line.strip()
                    ]
                    followups = [q for q in extracted if q][:3]
                    answer_text = raw_text[: followup_list_match.start()].strip()

            # Ensure FOLLOWUP_QUESTIONS header is never left in final answer
            if "FOLLOWUP_QUESTIONS:" in answer_text:
                header_idx = answer_text.find("FOLLOWUP_QUESTIONS:")
                answer_text = answer_text[:header_idx].strip()

            if not followups:
                followups = [
                    "How does concurrency impact TTFT vs TPOT?",
                    "What is the difference between Raw Throughput and Goodput?",
                    "How to calculate KV Cache memory requirements?",
                ]

            # Sanitize and normalize markdown & LaTeX blocks
            answer_text = _clean_llm_markdown_and_latex(answer_text)

            return ExpertQueryResponse(
                answer=answer_text,
                topic=f"Inference Copilot ({target_model})",
                suggested_followups=followups,
                source="groq_llm" if "groq" in base_url else "openai_llm",
                model=target_model,
            )
        except Exception as e:
            logger.warning("LLM call with model %s on %s failed: %s", target_model, base_url, e)
            continue

    return None


@router.get("/status", response_model=ExpertStatusResponse)
async def get_expert_status() -> ExpertStatusResponse:
    """Returns whether a Groq API Key is configured in backend environment."""
    groq_key = os.environ.get("GROQ_API_KEY") or getattr(settings, "GROQ_API_KEY", None)
    has_key = bool(groq_key and groq_key.strip())
    model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    return ExpertStatusResponse(
        has_groq_key=has_key,
        model=model,
        source="env" if has_key else "none",
    )


@router.post("/ask", response_model=ExpertQueryResponse)
async def ask_expert(payload: ExpertQueryRequest) -> ExpertQueryResponse:
    """Answers benchmark configuration, queuing theory, and inference architecture questions via Groq LLM or Knowledge Engine."""
    query = payload.query.strip()
    context_topic = payload.context_topic

    # 1. First, check if the question matches a presaved / curated knowledge question
    matched_knowledge = _find_best_knowledge_match(query, context_topic)
    if matched_knowledge:
        return ExpertQueryResponse(
            answer=matched_knowledge["answer"],
            topic=matched_knowledge["topic"],
            suggested_followups=matched_knowledge.get(
                "followups", matched_knowledge.get("suggested_followups", [])
            ),
            source="knowledge_engine",
            model="built-in",
        )

    # 2. If it is a CUSTOM question, attempt to call the LLM
    groq_api_key = (
        payload.groq_api_key
        or (payload.credential.get("groq_api_key") if payload.credential else None)
        or (
            payload.credential.get("api_key")
            if payload.credential
            and (payload.vendor == "groq" or "groq" in str(payload.credential.get("base_url", "")))
            else None
        )
        or os.environ.get("GROQ_API_KEY")
        or getattr(settings, "GROQ_API_KEY", None)
    )
    custom_base_url = payload.credential.get("base_url") if payload.credential else None

    if groq_api_key and groq_api_key.strip():
        llm_response = await _query_groq_llm(
            api_key=groq_api_key.strip(),
            query=query,
            context_topic=context_topic,
            vendor=payload.vendor,
            model=payload.model,
            messages_history=payload.messages,
            custom_base_url=custom_base_url,
        )
        if llm_response:
            return llm_response

    # 3. If it is a CUSTOM question and LLM key is missing or failed: DO NOT answer with generic filler.
    topic_followups = [
        "What is Goodput and why is it superior to Raw Throughput?",
        "How do token ratios (prefill vs. decode) affect benchmarking results?",
        "How to find the saturation cliff of a cluster?",
        "How is KV cache memory calculated per stream?",
    ]
    if context_topic and context_topic in TOPIC_ARTICLES:
        topic_followups = TOPIC_ARTICLES[context_topic].get("suggested_followups", topic_followups)

    return ExpertQueryResponse(
        answer=(
            "### Live AI Response Unavailable for Custom Question\n\n"
            f'**Your Question**: *"{query}"*\n\n'
            "This is a custom, open-ended question that requires a live LLM endpoint to generate an answer.\n\n"
            "**To answer custom questions:**\n"
            "1. Add your **Groq API Key** in `.env` (`GROQ_API_KEY=gsk_...`) or click the **Key icon** in the top right of this drawer.\n"
            "2. Ensure the model ID (e.g. `gpt-oss-20b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) is supported by your endpoint.\n\n"
            " **Curated Presaved Questions Available Offline**:\n"
            "You can click any of the verified suggested questions below to get instant architectural explanations without needing an API key."
        ),
        topic="Custom Question (Key Required)",
        suggested_followups=topic_followups,
        source="key_required",
        model="none",
    )
