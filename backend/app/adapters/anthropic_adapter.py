import time
from typing import AsyncIterator, Optional
from anthropic import AsyncAnthropic
import structlog

from app.adapters.base import VendorAdapter
from app.core.fallback_tokenizer import FallbackTokenizer
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential

logger = structlog.get_logger()


class AnthropicAdapter(VendorAdapter):
    """Native adapter for Anthropic Claude models via Anthropic Messages API."""

    async def stream_completion(
        self,
        credential: Optional[VendorCredential],
        config: BenchmarkConfig,
        prompt: str,
    ) -> AsyncIterator[TokenEvent]:
        api_key = credential.api_key if credential and credential.api_key else "EMPTY"

        client = AsyncAnthropic(
            api_key=api_key,
            timeout=float(config.duration_seconds + 10.0),
        )

        messages = config.custom_messages or [{"role": "user", "content": prompt}]
        collected_text = []

        try:
            async with client.messages.stream(
                model=config.model,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    t_now = time.perf_counter()
                    collected_text.append(text)
                    yield TokenEvent(
                        token=text,
                        timestamp=t_now,
                    )

                # Extract verified token counts from final message summary
                final_msg = await stream.get_final_message()
                t_final = time.perf_counter()

                usage = None
                if hasattr(final_msg, "usage") and final_msg.usage:
                    usage = {
                        "prompt_tokens": final_msg.usage.input_tokens,
                        "completion_tokens": final_msg.usage.output_tokens,
                        "total_tokens": final_msg.usage.input_tokens + final_msg.usage.output_tokens,
                    }
                else:
                    full_text = "".join(collected_text)
                    prompt_tokens = FallbackTokenizer.count_tokens(prompt, config.model)
                    gen_tokens = max(1, FallbackTokenizer.count_tokens(full_text, config.model))
                    usage = {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": gen_tokens,
                        "total_tokens": prompt_tokens + gen_tokens,
                    }

                yield TokenEvent(
                    token="",
                    timestamp=t_final,
                    usage=usage,
                    is_final=True,
                )

        finally:
            await client.close()

    async def list_models(
        self,
        credential: Optional[VendorCredential],
    ) -> list[str]:
        default_anthropic_models = [
            "claude-3-7-sonnet-20250219",
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307",
        ]
        api_key = credential.api_key if credential and credential.api_key else ""
        if not api_key:
            return default_anthropic_models

        client = AsyncAnthropic(
            api_key=api_key,
            timeout=10.0,
        )
        try:
            if hasattr(client, "models") and hasattr(client.models, "list"):
                response = await client.models.list()
                model_ids = []
                if hasattr(response, "data") and response.data:
                    for m in response.data:
                        if hasattr(m, "id") and m.id:
                            model_ids.append(m.id)
                if model_ids:
                    return sorted(model_ids, key=lambda x: x.lower())
        except Exception as e:
            logger.warning("Anthropic models.list call failed, returning defaults", error=str(e))
        finally:
            await client.close()

        return default_anthropic_models

