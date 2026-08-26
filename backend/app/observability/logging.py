import logging
import re
import structlog
from typing import Any, Dict

SENSITIVE_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9_\-]{20,}", re.IGNORECASE),
    re.compile(r"api[-_]?key", re.IGNORECASE),
    re.compile(r"bearer\s+[a-zA-Z0-9_\-\.]+", re.IGNORECASE),
]


def sanitize_sensitive_data(_: Any, __: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Scrub sensitive credentials and API keys from all structured log outputs."""
    for key, value in event_dict.items():
        if isinstance(value, str):
            for pattern in SENSITIVE_PATTERNS:
                if pattern.search(value) and len(value) > 8:
                    event_dict[key] = f"{value[:4]}...[MASKED]"
        elif isinstance(value, dict):
            for sub_key in list(value.keys()):
                if any(p.search(sub_key) for p in SENSITIVE_PATTERNS):
                    value[sub_key] = "[MASKED_CREDENTIAL]"
    return event_dict


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
