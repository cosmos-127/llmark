from typing import Dict, Type
from app.adapters.anthropic_adapter import AnthropicAdapter
from app.adapters.base import VendorAdapter
from app.adapters.mock_adapter import MockVendorAdapter
from app.adapters.openai_adapter import OpenAICompatAdapter
from app.models.schemas import VendorType


class AdapterRegistry:
    _adapters: Dict[VendorType, Type[VendorAdapter]] = {
        VendorType.OPENAI: OpenAICompatAdapter,
        VendorType.OPENAI_COMPATIBLE: OpenAICompatAdapter,
        VendorType.ANTHROPIC: AnthropicAdapter,
        VendorType.MOCK: MockVendorAdapter,
    }

    @classmethod
    def register(cls, vendor_type: VendorType, adapter_cls: Type[VendorAdapter]) -> None:
        cls._adapters[vendor_type] = adapter_cls

    @classmethod
    def get_adapter(cls, vendor_type: VendorType) -> VendorAdapter:
        adapter_cls = cls._adapters.get(vendor_type)
        if not adapter_cls:
            # Default to OpenAICompatAdapter if unrecognized, or MockVendorAdapter for test
            return OpenAICompatAdapter()
        return adapter_cls()
