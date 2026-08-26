import logging
import re
import structlog
from typing import Any, Dict

SENSITIVE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9_\-]{20,}", re.IGNORECASE),
    re.compile(r"api[-_]?key", re.IGNORECASE),
    re.compile(r"bearer\s+[a-zA-Z0-9_\-\.]+", re.IGNORECASE),
]


def _sanitize_recursive(data: Any) -> Any:
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if any(p.search(str(k)) for p in SENSITIVE_PATTERNS):
                new_dict[k] = "[MASKED_CREDENTIAL]"
            else:
                new_dict[k] = _sanitize_recursive(v)
        return new_dict
    elif isinstance(data, list):
        return [_sanitize_recursive(item) for item in data]
    elif isinstance(data, str):
        for pattern in SENSITIVE_PATTERNS:
            if pattern.search(data) and len(data) > 8:
                return f"{data[:4]}...[MASKED]"
        return data
    else:
        return data

def sanitize_sensitive_data(_: Any, __: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Scrub sensitive credentials and API keys from all structured log outputs."""
    return _sanitize_recursive(event_dict)


def setup_logging(debug: bool = False) -> None:
    """Configure structlog processors and standard logging integration."""
    log_level = logging.DEBUG if debug else logging.INFO

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            sanitize_sensitive_data,
            structlog.dev.ConsoleRenderer() if debug else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


logger = structlog.get_logger()
