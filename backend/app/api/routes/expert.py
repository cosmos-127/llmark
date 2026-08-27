import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/expert", tags=["expert"])


class ExpertQueryRequest(BaseModel):
    query: str = Field(..., description="User question or prompt")
    context_topic: Optional[str] = Field(None, description="Context card or topic (e.g. sampling, concurrency, knee_probe, slo, caching)")
    vendor: Optional[str] = Field(None, description="Current vendor")
    model: Optional[str] = Field(None, description="Current model")
    credential: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Ephemeral credential if available for live LLM call")


class ExpertQueryResponse(BaseModel):
    answer: str
    topic: str
    suggested_followups: List[str]
    source: str  # "llm" or "knowledge_engine"


EXPERT_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "sampling": {
        "keywords": ["temperature", "top_p", "sampling", "entropy", "generation", "max_tokens"],
        "topic": "Sampling Hyperparameters & Output Entropy",
        "answer": (
            "### 🌡️ Temperature & Top-P in LLM Benchmarking\n\n"
            "- **Temperature = 0.0 (Argmax / Greedy Decoding)**: Best for reproducible throughput benchmarks. It forces the model to pick the highest probability token, eliminating entropy variance across runs.\n"
            "- **Temperature > 0.7 (Creative / High Entropy)**: Flattens the softmax probability distribution across the vocabulary. In autoregressive generation, this leads to variable output sequence lengths and slight decode jitter.\n"
            "- **Top-P (Nucleus Sampling)**: Dynamically truncates the probability mass to the top $P$ tokens (e.g., top 90%). Setting Top-P lower (e.g., 0.8) prevents low-probability outlier tokens.\n\n"
            "**Benchmarking Recommendation:**\n"
            "For measuring pure hardware latency and throughput (TTFT & TPOT), keep **Temperature = 0.0** and fixed **Max Tokens** so all concurrency streams generate identical token lengths."
        ),
        "suggested_followups": [
            "Why does higher temperature cause token jitter?",
            "What is the difference between TTFT and TPOT?",
            "How does Top-P impact memory bandwidth?",
        ],
    },
    "load_curve": {
        "keywords": ["curve", "load", "knee", "poisson", "saturation", "ramp", "spike", "concurrency", "traffic"],
        "topic": "Traffic Load Curves & Saturation Dynamics",
        "answer": (
            "### 📈 Load Curve Geometries & Queue Saturation\n\n"
            "1. **Constant / Flat**: Maintains a fixed number of concurrent worker streams. Ideal for measuring sustained decode throughput (tokens/sec) and identifying steady-state memory utilization.\n"
            "2. **Step Ramp (Staircase)**: Gradually increments concurrency in discrete steps (e.g. 5 → 10 → 25 → 50). This reveals the exact concurrency threshold where the GPU prefill/decode scheduler becomes saturated.\n"
            "3. **Poisson (Stochastic Arrival)**: Models real-world human arrival patterns where inter-arrival times follow exponential distribution $P(t) = \\lambda e^{-\\lambda t}$. Tests how well the inference gateway buffers bursts.\n"
            "4. **Spike / Stress Wave**: Abruptly injects a 3x-5x concurrency surge to test autoscaling latency, connection pool limits, and rate limit resilience (HTTP 429).\n"
            "5. **Saturation Knee Probe (1→3→8→16→50)**: Isolates the *inflection point* where KV cache memory slots are exhausted and requests begin queueing, causing Time to First Token (TTFT) to spike exponentially (Little's Law: $L_q = \\lambda W_q$)."
        ),
        "suggested_followups": [
            "How do I determine the optimal concurrency for my model?",
            "What happens to KV cache during a traffic spike?",
            "How does Little's Law apply to LLM inference queues?",
        ],
    },
    "caching": {
        "keywords": ["cache", "kv", "nonce", "cache_bust", "prefix", "cold", "warm", "prefill"],
        "topic": "KV Cache Semantics & Cold Prefill Isolation",
        "answer": (
            "### ⚡ KV Cache Reuse vs. Cold Prefill Testing\n\n"
            "- **Warm Prefix Caching (Default)**: Modern providers (OpenAI, Anthropic, vLLM) identify repeated prompt prefixes (system prompts, shared RAG documents) and reuse precomputed Key-Value (KV) attention tensors. This provides up to **80% lower TTFT** and reduced billing rates.\n"
            "- **Bypass KV Cache (Unique Nonce Injection)**: Injects an unpredictable timestamp nonce at the start of each prompt. This forces the GPU compute units (Tensor Cores) to execute the entire matrix prefill pass from scratch.\n\n"
            "**Benchmarking Recommendation:**\n"
            "Enable **Bypass KV Cache** when sizing hardware capacity or evaluating raw GPU prefill compute (TFLOPS). Keep it disabled if evaluating real-world conversational user experience with shared system prompts."
        ),
        "suggested_followups": [
            "How much faster is a warm KV cache hit?",
            "What is the arithmetic intensity of prefill vs decode?",
            "Does nonce injection affect completion quality?",
        ],
    },
    "slo": {
        "keywords": ["slo", "goodput", "ttft", "tpot", "latency", "e2e", "error", "429", "threshold"],
        "topic": "Service Level Objectives (SLOs) & Goodput Metric",
        "answer": (
            "### 🎯 Goodput vs. Raw Throughput\n\n"
            "- **Raw Throughput (tok/s)**: Gross generated tokens divided by time across all streams, including requests that timed out or violated your latency budget.\n"
            "- **Goodput (tok/s)**: The true metric of production-grade LLM performance. Measures tokens generated **only** by requests that satisfied all four reliability gates:\n"
            "  1. $\\text{TTFT} \\le \\text{Max TTFT threshold}$ (e.g. $\\le 800\\text{ms}$)\n"
            "  2. $\\text{TPOT} \\le \\text{Max TPOT threshold}$ (e.g. $\\le 35\\text{ms/tok}$)\n"
            "  3. $\\text{E2E Duration} \\le \\text{Max E2E threshold}$ (e.g. $\\le 10\\text{s}$)\n"
            "  4. $\\text{Status Code} = 200\\text{ OK}$ (No 429 rate limit or 5xx errors)\n\n"
            "$$\\text{Goodput Yield (\\%)} = \\frac{\\text{SLO Conforming Completed Requests}}{\\text{Total Dispatched Requests}} \\times 100\\%$$"
        ),
        "suggested_followups": [
            "What is an acceptable TTFT for interactive voice or chat?",
            "How is TPOT (Time Per Output Token) calculated?",
            "How do I set SLO thresholds for long RAG documents?",
        ],
    },
    "cost": {
        "keywords": ["cost", "spend", "cap", "price", "budget", "pricing", "circuit breaker", "dollar"],
        "topic": "Financial Guardrails & Spend Trajectory",
        "answer": (
            "### 💰 Financial Guardrails & Spend Caps\n\n"
            "- **Automated Circuit Breaker**: LLMark tracks live cost in real-time. If accumulated token spend reaches your **Hard Spend Cap**, all active worker threads terminate immediately within $\\le 50\\text{ms}$.\n"
            "- **Cost Estimation Model**: Estimated cost is derived from:\n"
            "  $$\\text{Cost} = \\left(\\frac{\\text{Prompt Tokens} \\times \\text{Rate}_{\\text{in}}}{1{,}000{,}000}\\right) + \\left(\\frac{\\text{Gen Tokens} \\times \\text{Rate}_{\\text{out}}}{1{,}000{,}000}\\right) \\times \\text{Requests}$$\n"
            "- **Pricing Drift**: You can override the standard catalog rates with your custom enterprise discounts (e.g., Azure PTU or AWS provisioned throughput rates)."
        ),
        "suggested_followups": [
            "How does concurrency affect overall test cost?",
            "What happens if my hard spend cap is hit during a test?",
            "How do input and output token pricing differ?",
        ],
    },
    "workload": {
        "keywords": ["workload", "preset", "prompt", "token", "ratio", "scenario", "rag", "code", "cot", "reasoning"],
        "topic": "Workload Scenarios & Token Ratios",
        "answer": (
            "### 🧩 Workload Profiles & Token Ratios\n\n"
            "- **Prefill-Heavy (e.g. Enterprise RAG, Context Retrieval)**: High prompt tokens (3000-8000), low output tokens (100-300). Tests GPU compute density and memory transfer rate during the prefill phase.\n"
            "- **Decode-Heavy (e.g. Code Generation, CoT Reasoning)**: Moderate prompt tokens (100-500), high output tokens (800-2000). Tests memory bandwidth limitations during autoregressive single-token decode passes.\n"
            "- **Balanced Conversational (Chat)**: Low-to-moderate prompt (200) and generation (150). Focuses on human reading speed, low initial TTFT latency, and sustained ITL smoothness."
        ),
        "suggested_followups": [
            "How do I choose the right workload preset for my app?",
            "What is the impact of long prompt tokens on TTFT?",
            "How does Reasoning/CoT affect TTFA (Time to First Answer)?",
        ],
    },
    "provider-routing": {
        "keywords": ["provider", "routing", "protocol", "sse", "endpoint", "tls", "handshake", "anthropic", "openai"],
        "topic": "Provider Wire Protocols & Connection Routing",
        "answer": (
            "### 🌐 Provider Wire Protocols & Network Handshakes\n\n"
            "- **Server-Sent Events (SSE)**: Standard HTTP streaming mechanism used across OpenAI, Anthropic, and vLLM. Each token chunk is streamed as an SSE frame.\n"
            "- **TLS Handshake & Connection Pooling**: A fresh TLS 1.3 handshake adds 30-80ms of network overhead before the prompt reaches the GPU.\n"
            "- **Warmup Requests**: Always use warmup runs to establish persistent TCP/TLS keep-alive sockets before benchmarking raw inference speed."
        ),
        "suggested_followups": [
            "Why is HTTP/2 connection pooling critical for low TTFT?",
            "How does SSE chunk buffering impact measured ITL?",
            "What is the best way to benchmark self-hosted vLLM?",
        ],
    },
    "model-sizing": {
        "keywords": ["model", "weights", "parameters", "sizing", "dense", "moe", "b200", "h100", "vram"],
        "topic": "Model Architecture & Parameter Sizing",
        "answer": (
            "### 🧠 Model Architecture & Memory Bandwidth\n\n"
            "- **Dense Models (e.g. Llama-3-8B / 70B)**: Autoregressive decode must stream all active weights across the memory bus for every token generated. Speed is directly determined by GPU HBM bandwidth (TB/s).\n"
            "- **Mixture of Experts (MoE, e.g. DeepSeek-V3)**: Activates only a subset of total parameter experts per token, delivering higher decode throughput at lower compute cost.\n"
            "- **Quantization (FP8 / INT4)**: Cuts weight memory footprint in half, doubling effective memory bandwidth and increasing batch capacity."
        ),
        "suggested_followups": [
            "How does FP8 quantization impact generation speed?",
            "What is the VRAM formula for KV Cache in multi-head attention?",
            "When should I use MoE models for high-concurrency benchmarks?",
        ],
    },
}


@router.post("/ask", response_model=ExpertQueryResponse)
async def ask_expert(payload: ExpertQueryRequest) -> ExpertQueryResponse:
    """Answers benchmark configuration, queuing theory, and inference architecture questions."""
    query_lower = payload.query.strip().lower()
    context_topic = (payload.context_topic or "").strip().lower()

    # 1. First search for highest-scoring keyword match based on the actual question text
    best_entry = None
    highest_score = 0

    for key, entry in EXPERT_KNOWLEDGE_BASE.items():
        score = 0
        for kw in entry["keywords"]:
            if kw.lower() in query_lower:
                score += 3
        # Match against followups
        for followup in entry.get("suggested_followups", []):
            if followup.lower() == query_lower:
                score += 10
            elif any(word in query_lower for word in followup.lower().split() if len(word) > 4):
                score += 1
        if score > highest_score:
            highest_score = score
            best_entry = entry

    if best_entry and highest_score >= 3:
        return ExpertQueryResponse(
            answer=best_entry["answer"],
            topic=best_entry["topic"],
            suggested_followups=best_entry["suggested_followups"],
            source="knowledge_engine",
        )

    # 2. If no strong keyword match in query, fall back to context_topic
    if context_topic in EXPERT_KNOWLEDGE_BASE:
        matched_entry = EXPERT_KNOWLEDGE_BASE[context_topic]
        return ExpertQueryResponse(
            answer=matched_entry["answer"],
            topic=matched_entry["topic"],
            suggested_followups=matched_entry["suggested_followups"],
            source="knowledge_engine",
        )

    # 3. General fallback response with rich context
    return ExpertQueryResponse(
        answer=(
            f"### 💡 Benchmark Expert Insight\n\n"
            "When benchmarking modern LLMs, precision depends on three pillars:\n\n"
            "1. **Isolating Prefill vs. Decode**: Time to First Token (TTFT) measures prefill compute and KV-cache ingestion speed, while Time Per Output Token (TPOT) measures memory bandwidth during autoregressive token generation.\n"
            "2. **Controlled Arrival Curves**: Using realistic load curves (like Saturation Knee Probe or Poisson) uncovers queue buffering cliffs that standard static tests hide.\n"
            "3. **Goodput Enforcement**: High throughput with degraded latency creates poor user experience. Always set strict SLO thresholds to measure true production-ready goodput."
        ),
        topic="General LLM Benchmark Engineering",
        suggested_followups=[
            "How do I measure Goodput vs Raw Throughput?",
            "What is the Saturation Knee Probe curve?",
            "Why is TTFT important for interactive conversational UI?",
        ],
        source="knowledge_engine",
    )
