"""
Redis-backed caching for expensive REST and GraphQL queries (issue #131).
"""

import hashlib
import json
from collections.abc import Callable
from typing import Any
from functools import wraps
from rest_framework.response import Response

from django.conf import settings
from django.core.cache import cache


def query_cache_ttl() -> int:
    return int(getattr(settings, "QUERY_CACHE_TTL_SECONDS", 60))


def stable_cache_key(prefix: str, payload: dict[str, Any]) -> str:
    """Deterministic key from a prefix and sorted JSON payload."""
    blob = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    digest = hashlib.sha256(blob).hexdigest()[:32]
    return f"soroscan:{prefix}:{digest}"


_SENTINEL = object()


def get_or_set_json(key: str, ttl: int, factory: Callable[[], Any]) -> Any:
    """Return cached value or compute and store (including cached ``None``)."""
    cached = cache.get(key, _SENTINEL)
    if cached is not _SENTINEL:
        return cached
    value = factory()
    cache.set(key, value, timeout=ttl)
    return value


def invalidate_contract_query_cache(contract_id: str) -> None:
    """Best-effort: drop stats cache for a contract (pattern-free delete)."""
    # Stats key uses contract_id in payload; callers can delete by known prefixes
    cache.delete(stable_cache_key("contract_stats", {"contract_id": contract_id}))


def cache_result(ttl):
    """Decorator to cache the JSON data of a successful DRF response."""

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            cache_key = f"cache_result:{request.get_full_path()}"
            cached_data = cache.get(cache_key)

            if cached_data is not None:
                return Response(cached_data)

            response = view_func(request, *args, **kwargs)

            if response.status_code == 200:
                cache.set(cache_key, response.data, timeout=ttl)

            return response

        return wrapper

    return decorator
