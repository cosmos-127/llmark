import time
from collections.abc import AsyncIterator

import httpx
import structlog
from openai import AsyncOpenAI

from app.adapters.base import VendorAdapter
from app.core.fallback_tokenizer import FallbackTokenizer
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential

logger = structlog.get_logger()


class OpenAICompatAdapter(VendorAdapter):
    """Universal adapter for OpenAI and OpenAI-compatible endpoints (Groq, Together, vLLM, DeepSeek, Ollama, OpenRouter)."""

    async def stream_completion(
        self,
        credential: VendorCredential | None,
        config: BenchmarkConfig,
        prompt: str,
    ) -> AsyncIterator[TokenEvent]:
        api_key = credential.api_key if credential and credential.api_key else "EMPTY"
        base_url = credential.base_url if credential and credential.base_url else None

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            organization=credential.organization_id if credential else None,
            timeout=float(config.duration_seconds + 10.0),
        )

        messages = config.custom_messages or [{"role": "user", "content": prompt}]

        create_kwargs = {
            "model": config.model,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }

        # Guided Decoding / Structured Output JSON Schema mode
        if config.json_schema:
            create_kwargs["response_format"] = {"type": "json_object"}

        collected_text = []
        final_usage = None

        try:
            stream = await client.chat.completions.create(**create_kwargs)  # type: ignore[call-overload]
            async for chunk in stream:  # type: ignore[union-attr]
                t_now = time.perf_counter()
                choices = chunk.choices if hasattr(chunk, "choices") and chunk.choices else []

                delta_text = ""
                reasoning_text = None

                if choices:
                    delta = choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        delta_text = delta.content
                        collected_text.append(delta_text)

                    # Extract reasoning tokens (e.g. DeepSeek-R1 / o1 / o3)
                    if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                        reasoning_text = delta.reasoning_content

                # Capture token usage chunks if sent by upstream server
                if hasattr(chunk, "usage") and chunk.usage:
                    final_usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens,
                    }

                if delta_text or reasoning_text or final_usage:
                    yield TokenEvent(
                        token=delta_text,
                        reasoning=reasoning_text,
                        timestamp=t_now,
                        usage=final_usage,
                    )

            # Fallback token estimation if upstream endpoint omitted usage
            if not final_usage:
                full_text = "".join(collected_text)
                prompt_tokens = FallbackTokenizer.count_tokens(prompt, config.model)
                gen_tokens = max(1, FallbackTokenizer.count_tokens(full_text, config.model))
                final_usage = {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": gen_tokens,
                    "total_tokens": prompt_tokens + gen_tokens,
                }
                yield TokenEvent(
                    token="",
                    timestamp=time.perf_counter(),
                    usage=final_usage,
                    is_final=True,
                )

        finally:
            await client.close()

    async def list_models(
        self,
        credential: VendorCredential | None,
    ) -> list[str]:
        api_key = credential.api_key if credential and credential.api_key else "EMPTY"
        base_url = (
            credential.base_url.strip()
            if credential and credential.base_url and credential.base_url.strip()
            else None
        )

        # Fallback if no custom base_url and no API key provided
        if not base_url and (
            not credential or not credential.api_key or not credential.api_key.strip()
        ):
            return [
                "gpt-4o",
                "gpt-4o-mini",
                "o3-mini",
                "o1",
                "gpt-4-turbo",
                "gpt-4",
                "gpt-3.5-turbo",
            ]

        # For OpenRouter or custom JSON endpoints, query via HTTP to extract raw dynamic pricing schema
        if base_url and "openrouter.ai" in base_url.lower():
            try:
                models_url = f"{base_url.rstrip('/')}/models"
                headers = {"Authorization": f"Bearer {api_key}"} if api_key != "EMPTY" else {}
                async with httpx.AsyncClient(timeout=10.0) as http_client:
                    resp = await http_client.get(models_url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json().get("data", [])
                        model_ids = []
                        from app.core.cost_guard import CostGuard

                        for item in data:
                            m_id = item.get("id")
                            if m_id:
                                model_ids.append(m_id)
                                pricing = item.get("pricing")
                                if pricing:
                                    try:
                                        p_in = float(pricing.get("prompt", 0.0)) * 1_000_000.0
                                        p_out = float(pricing.get("completion", 0.0)) * 1_000_000.0
                                        if p_in > 0 or p_out > 0:
                                            CostGuard.register_dynamic_pricing(m_id, p_in, p_out)
                                    except Exception:
                                        pass
                        if model_ids:
                            return sorted(model_ids, key=lambda x: x.lower())
            except Exception as e:
                logger.warning(
                    "Failed to fetch OpenRouter schema via direct HTTP, falling back to client",
                    error=str(e),
                )

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            organization=credential.organization_id if credential else None,
            timeout=10.0,
        )
        try:
            response = await client.models.list()
            model_ids = []
            if hasattr(response, "data") and response.data:
                for m in response.data:
                    m_id = getattr(m, "id", None)
                    if m_id:
                        model_ids.append(m_id)
                    # Parse dynamic pricing if exposed in extra attributes
                    pricing = getattr(m, "pricing", None)
                    if pricing and m_id:
                        try:
                            p_in = float(getattr(pricing, "prompt", 0.0)) * 1_000_000.0
                            p_out = float(getattr(pricing, "completion", 0.0)) * 1_000_000.0
                            if p_in > 0 or p_out > 0:
                                from app.core.cost_guard import CostGuard

                                CostGuard.register_dynamic_pricing(str(m_id), p_in, p_out)
                        except Exception:
                            pass

            if not model_ids:
                try:
                    for item in response:  # type: ignore[union-attr]
                        item_id = getattr(item, "id", None)
                        if item_id:
                            model_ids.append(str(item_id))
                except Exception:
                    pass
            return sorted(model_ids, key=lambda x: x.lower())
        finally:
            await client.close()
