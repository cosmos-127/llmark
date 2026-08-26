import time
from typing import AsyncIterator, Optional, List
import structlog
from openai import AsyncAzureOpenAI

from app.adapters.base import VendorAdapter
from app.core.fallback_tokenizer import FallbackTokenizer
from app.models.schemas import BenchmarkConfig, TokenEvent, VendorCredential

logger = structlog.get_logger()


class AzureOpenAIAdapter(VendorAdapter):
    """Adapter for Microsoft Azure OpenAI Service."""

    async def stream_completion(
        self,
        credential: Optional[VendorCredential],
        config: BenchmarkConfig,
        prompt: str,
    ) -> AsyncIterator[TokenEvent]:
        api_key = credential.api_key if credential and credential.api_key else "EMPTY"
        azure_endpoint = (
            credential.azure_endpoint
            if credential and credential.azure_endpoint
            else (credential.base_url if credential and credential.base_url else "https://openai.azure.com")
        )
        azure_deployment = (
            credential.azure_deployment
            if credential and credential.azure_deployment
            else config.model
        )
        api_version = (
            credential.azure_api_version
            if credential and credential.azure_api_version
            else "2024-10-21"
        )

        client = AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            api_version=api_version,
            timeout=float(config.duration_seconds + 10.0),
        )

        messages = config.custom_messages or [{"role": "user", "content": prompt}]

        create_kwargs = {
            "model": azure_deployment,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }

        if config.json_schema:
            create_kwargs["response_format"] = {"type": "json_object"}

        collected_text = []
        final_usage = None

        try:
            stream = await client.chat.completions.create(**create_kwargs)
            async for chunk in stream:
                t_now = time.perf_counter()
                choices = chunk.choices if hasattr(chunk, "choices") and chunk.choices else []

                delta_text = ""
                reasoning_text = None

                if choices:
                    delta = choices[0].delta
                    if hasattr(delta, "content") and delta.content:
                        delta_text = delta.content
                        collected_text.append(delta_text)

                    if hasattr(delta, "reasoning_content") and delta.reasoning_content:
                        reasoning_text = delta.reasoning_content

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
        except Exception as e:
            logger.error("Azure OpenAI streaming error", error=str(e))
            raise e
        finally:
            await client.close()

    async def list_models(self, credential: Optional[VendorCredential]) -> List[str]:
        if not credential or not (credential.azure_endpoint or credential.base_url):
            return ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "gpt-4-turbo"]
        api_key = credential.api_key if credential.api_key else "EMPTY"
        endpoint = credential.azure_endpoint or credential.base_url or "https://openai.azure.com"
        client = AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=credential.azure_api_version or "2024-10-21",
            timeout=10.0,
        )
        try:
            res = await client.models.list()
            model_ids = [m.id for m in res.data if hasattr(m, "id")]
            return sorted(model_ids) if model_ids else ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"]
        except Exception:
            return ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini", "gpt-4-turbo"]
        finally:
            await client.close()
