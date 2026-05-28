"""
Management command: generate_api_docs

Generates endpoint documentation from view docstrings, URL patterns, and
drf-spectacular ``@extend_schema`` metadata.  Produces a Markdown reference
page that can be committed to the repo or published alongside the OpenAPI
spec.

Usage:
    python manage.py generate_api_docs
    python manage.py generate_api_docs --output docs/api_reference.md
    python manage.py generate_api_docs --format json --output docs/api_reference.json
    python manage.py generate_api_docs --include-examples
"""
from __future__ import annotations


import inspect
import json
import re
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand
from django.urls import URLPattern, URLResolver, get_resolver


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass
class QueryParam:
    name: str
    required: bool = False
    description: str = ""
    example: str = ""


@dataclass
class RequestBodyField:
    name: str
    type: str = "string"
    required: bool = False
    description: str = ""
    example: str = ""


@dataclass
class ResponseCode:
    code: int
    description: str


@dataclass
class EndpointDoc:
    """Structured documentation for a single API endpoint."""

    path: str
    methods: list[str]
    name: str
    summary: str
    description: str
    auth_required: bool
    permissions: list[str] = field(default_factory=list)
    query_params: list[QueryParam] = field(default_factory=list)
    request_body: list[RequestBodyField] = field(default_factory=list)
    response_codes: list[ResponseCode] = field(default_factory=list)
    examples: list[dict[str, Any]] = field(default_factory=list)
    throttled: bool = False
    cached: bool = False
    tags: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Docstring parser
# ---------------------------------------------------------------------------

_SECTION_RE = re.compile(
    r"^(?P<label>Query params?|Request body|Endpoints?|Returns?|Notes?)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

_PARAM_LINE_RE = re.compile(
    r"^\s*[-*]?\s*`?(?P<name>[\w.]+)`?"          # name (may be backtick-quoted)
    r"(?:\s*\((?P<type>[^)]+)\))?"                # optional (type)
    r"(?:\s*[-–—:]+\s*|\s+)"                      # separator
    r"(?P<desc>.+)$"                              # description
)


def _parse_docstring(raw: str | None) -> dict:
    """
    Parse a view docstring into structured metadata.

    Returns a dict with keys:
      - summary (str)
      - description (str)
      - query_params (list[QueryParam])
      - request_body (list[RequestBodyField])
      - response_codes (list[ResponseCode])
      - endpoint_list (list[str])
    """
    if not raw:
        return {
            "summary": "",
            "description": "",
            "query_params": [],
            "request_body": [],
            "response_codes": [],
            "endpoint_list": [],
        }

    lines = textwrap.dedent(raw).strip().splitlines()

    # First non-blank line → summary
    summary = ""
    body_start = 0
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped:
            summary = stripped
            body_start = i + 1
            break

    description_lines: list[str] = []
    query_params: list[QueryParam] = []
    request_body: list[RequestBodyField] = []
    response_codes: list[ResponseCode] = []
    endpoint_list: list[str] = []

    current_section: str | None = None

    for line in lines[body_start:]:
        stripped = line.strip()

        # Section header detection
        sec_match = _SECTION_RE.match(stripped)
        if sec_match:
            current_section = sec_match.group("label").lower().rstrip("s")
            continue

        # HTTP status lines:  "- 200: description" or "200 OK - …"
        status_match = re.match(
            r"^\s*[-*]?\s*(?P<code>\d{3})\s*(?:[A-Z]+)?\s*[-–—:]+\s*(?P<desc>.+)$", stripped
        )
        if status_match:
            response_codes.append(
                ResponseCode(
                    code=int(status_match.group("code")),
                    description=status_match.group("desc").strip(),
                )
            )
            continue

        # Endpoint list lines:  "- GET /foo/ - description"
        ep_match = re.match(
            r"^\s*[-*]?\s*(GET|POST|PUT|PATCH|DELETE|HEAD)\s+(/[^\s]+)",
            stripped,
            re.IGNORECASE,
        )
        if ep_match or (
            current_section in ("endpoint",)
            and stripped.startswith("-")
        ):
            endpoint_list.append(stripped.lstrip("-* "))
            continue

        # Parameter / body field lines
        if current_section in ("query param", "request body"):
            param_match = _PARAM_LINE_RE.match(stripped)
            if param_match:
                name = param_match.group("name")
                ptype = (param_match.group("type") or "string").strip()
                desc = param_match.group("desc").strip()
                required = "(required)" in desc.lower() or "*required*" in desc.lower()
                if current_section == "query param":
                    query_params.append(
                        QueryParam(name=name, required=required, description=desc)
                    )
                else:
                    request_body.append(
                        RequestBodyField(
                            name=name, type=ptype, required=required, description=desc
                        )
                    )
                continue

        # Everything else goes into the description
        if stripped:
            description_lines.append(stripped)

    return {
        "summary": summary,
        "description": "\n".join(description_lines),
        "query_params": query_params,
        "request_body": request_body,
        "response_codes": response_codes,
        "endpoint_list": endpoint_list,
    }


# ---------------------------------------------------------------------------
# Permission / throttle introspection helpers
# ---------------------------------------------------------------------------


def _get_view_func(url_pattern: URLPattern):
    """Unwrap the underlying callable from a DRF view."""
    view = url_pattern.callback
    # DRF ViewSetMixin wraps via .as_view(); the original class sits in cls
    if hasattr(view, "cls"):
        return view.cls
    if hasattr(view, "view_class"):
        return view.view_class
    # For @api_view decorated functions the actual function is in initkwargs
    if hasattr(view, "initkwargs"):
        inner = view.initkwargs.get("actions")  # ViewSet
        if inner:
            return view.cls if hasattr(view, "cls") else view
    return view


def _get_permission_names(view_obj) -> list[str]:
    """Return human-friendly permission class names."""
    perms = getattr(view_obj, "permission_classes", None) or []
    names = []
    for p in perms:
        cls = p if inspect.isclass(p) else type(p)
        names.append(cls.__name__)
    return names


def _is_auth_required(perm_names: list[str]) -> bool:
    return any("IsAuthenticated" in n for n in perm_names) and "AllowAny" not in perm_names


def _is_throttled(view_obj) -> bool:
    throttles = getattr(view_obj, "throttle_classes", None) or []
    return bool(throttles)


def _is_cached(view_func) -> bool:
    """Heuristic: check whether the view is wrapped by @cache_result."""
    # The cache_result decorator sets __wrapped__ or __name__ attribute
    fn = getattr(view_func, "__wrapped__", view_func)
    source = inspect.getsource(fn) if callable(fn) else ""
    return "cache_result" in source or "get_or_set_json" in source


# ---------------------------------------------------------------------------
# URL pattern walker
# ---------------------------------------------------------------------------


def _iter_url_patterns(
    patterns, prefix: str = ""
) -> list[tuple[str, URLPattern]]:
    """Recursively walk URL patterns and yield (path, pattern) pairs."""
    results = []
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            inner_prefix = prefix + str(pattern.pattern)
            results.extend(_iter_url_patterns(pattern.url_patterns, inner_prefix))
        elif isinstance(pattern, URLPattern):
            full_path = prefix + str(pattern.pattern)
            results.append((full_path, pattern))
    return results


def _clean_path(raw: str) -> str:
    """Convert regex-style Django path tokens to readable form."""
    path = raw.replace("^", "").replace("$", "")
    # IMPORTANT: handle named regex groups BEFORE Django path-converter angle-brackets
    # otherwise <pk> inside (?P<pk>...) gets turned into {pk} prematurely.
    # Named groups including char-class bodies: (?P<pk>[^/.]+)  →  {pk}
    path = re.sub(r"\(\?P<(\w+)>(?:\[[^\]]*\]|[^)])*\)", r"{\1}", path)
    # Django path converters  <str:contract_id>  →  {contract_id}
    path = re.sub(r"<(?:\w+:)?(\w+)>", r"{\1}", path)
    # Remove leftover non-capturing group wrappers
    path = path.replace("(?:/)?", "").replace("(?:)?", "")
    path = re.sub(r"\?(?=[/]|$)", "", path)
    if not path.startswith("/"):
        path = "/" + path
    return path


# ---------------------------------------------------------------------------
# Core collector
# ---------------------------------------------------------------------------


# ViewSet action → HTTP methods mapping
_VIEWSET_ACTIONS: dict[str, list[str]] = {
    "list": ["GET"],
    "create": ["POST"],
    "retrieve": ["GET"],
    "update": ["PUT"],
    "partial_update": ["PATCH"],
    "destroy": ["DELETE"],
}


# HTTP verb → canonical name; used to filter only real HTTP methods from action maps
_REAL_HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}


def _methods_from_initkwargs(pattern: URLPattern) -> list[str]:
    """Extract the real HTTP methods a view handler accepts."""
    view = pattern.callback
    # ViewSet router patterns store an actions dict keyed by HTTP verb
    if hasattr(view, "actions"):
        # actions = {'get': 'list', 'post': 'create', ...} — keys are HTTP methods
        return sorted(
            {m.upper() for m in view.actions.keys() if m.upper() in _REAL_HTTP_METHODS}
        )
    # @api_view functions store http_method_names in initkwargs
    if hasattr(view, "initkwargs"):
        methods = view.initkwargs.get("http_method_names")
        if methods:
            return [m.upper() for m in methods if m.upper() in _REAL_HTTP_METHODS]
    # DRF generic views expose http_method_names on the class
    cls = getattr(view, "cls", None)
    if cls and hasattr(cls, "http_method_names"):
        return [m.upper() for m in cls.http_method_names if m.upper() in _REAL_HTTP_METHODS]
    return ["GET"]


def collect_endpoints() -> list[EndpointDoc]:
    """
    Walk the full URL resolver and build a list of EndpointDoc objects
    for every routable API view.
    """
    resolver = get_resolver()
    all_patterns = _iter_url_patterns(resolver.url_patterns)

    docs: list[EndpointDoc] = []
    seen_paths: set[str] = set()

    for raw_path, pattern in all_patterns:
        # Skip Django admin, static, and non-API internals
        path = _clean_path(raw_path)
        skip_prefixes = (
            "/admin/",
            "/metrics",
            "/silk/",
            "/^",
        )
        if any(path.startswith(p) for p in skip_prefixes):
            continue
        if pattern.name is None:
            continue
        # Skip DRF format-suffix routes (e.g. /events.json, /events.api)
        # These contain a literal dot-extension pattern segment
        if "{format}" in path or ".(?P" in raw_path or "format" in raw_path.split("/")[-1]:
            continue

        # Avoid duplicates from router-generated patterns
        canonical = re.sub(r"/\{[^}]+\}", "/{pk}", path)
        if canonical in seen_paths:
            continue
        seen_paths.add(canonical)

        view = pattern.callback
        view_obj = _get_view_func(pattern)
        name = pattern.name or ""

        # Determine the docstring source
        # For ViewSet routes the action method has the best docstring; fall
        # back to the class docstring if the action is undocumented.
        docstring: str | None = None
        if hasattr(view, "actions"):
            action_map = view.actions  # e.g. {'get': 'list', 'post': 'create'}
            for _method, action_name in action_map.items():
                action_fn = getattr(view_obj, action_name, None)
                if action_fn:
                    docstring = inspect.getdoc(action_fn)
                    if docstring:
                        break
        if not docstring:
            docstring = inspect.getdoc(view_obj) or inspect.getdoc(view)

        parsed = _parse_docstring(docstring)

        perm_names = _get_permission_names(view_obj)
        auth = _is_auth_required(perm_names)
        throttled = _is_throttled(view_obj)

        methods = _methods_from_initkwargs(pattern)

        # Derive a human-friendly tag from the URL path
        parts = [p for p in path.split("/") if p and not p.startswith("{")]
        tag = parts[1].replace("-", " ").title() if len(parts) > 1 else "General"

        docs.append(
            EndpointDoc(
                path=path,
                methods=methods,
                name=name,
                summary=parsed["summary"] or _name_to_summary(name),
                description=parsed["description"],
                auth_required=auth,
                permissions=perm_names,
                query_params=parsed["query_params"],
                request_body=parsed["request_body"],
                response_codes=parsed["response_codes"] or _default_response_codes(methods, auth),
                throttled=throttled,
                cached=_is_cached(view),
                tags=[tag],
            )
        )

    docs.sort(key=lambda e: (e.tags[0], e.path, e.methods[0] if e.methods else ""))
    return docs


def _name_to_summary(name: str) -> str:
    """Convert a URL name like 'contract-event-types' into 'Contract Event Types'."""
    return name.replace("-", " ").replace("_", " ").title()


def _default_response_codes(methods: list[str], auth: bool) -> list[ResponseCode]:
    codes = []
    if "GET" in methods:
        codes.append(ResponseCode(200, "Success"))
    if "POST" in methods:
        codes.append(ResponseCode(201, "Created"))
        codes.append(ResponseCode(400, "Validation error"))
    if "DELETE" in methods:
        codes.append(ResponseCode(204, "No content"))
    if auth:
        codes.append(ResponseCode(401, "Unauthorized – JWT token missing or invalid"))
    return codes


# ---------------------------------------------------------------------------
# Example generator
# ---------------------------------------------------------------------------

_EXAMPLE_REGISTRY: dict[str, dict] = {
    "record-event": {
        "request": {
            "contract_id": "CABC123...",
            "event_type": "swap",
            "payload_hash": "a" * 64,
        },
        "response_202": {
            "status": "submitted",
            "tx_hash": "abcd1234efgh5678",
            "transaction_status": "SUCCESS",
        },
    },
    "contract-list": {
        "response_200": {
            "count": 1,
            "results": [
                {
                    "id": 1,
                    "contract_id": "CABC123...",
                    "name": "My Token Contract",
                    "alias": "my-token",
                    "is_active": True,
                    "created_at": "2025-01-01T00:00:00Z",
                }
            ],
        }
    },
    "event-list": {
        "response_200": {
            "count": 2,
            "results": [
                {
                    "id": 42,
                    "contract_id": "CABC123...",
                    "event_type": "swap",
                    "ledger": 12345,
                    "timestamp": "2025-06-01T12:00:00Z",
                    "tx_hash": "tx_abc...",
                    "payload": {"from": "GAAA...", "to": "GBBB...", "amount": 1000},
                }
            ],
        }
    },
    "event-search": {
        "request_params": "?q=swap&contract_id=CABC123...&page=1&page_size=25",
        "response_200": {
            "count": 5,
            "page": 1,
            "page_size": 25,
            "results": [{"id": 42, "event_type": "swap", "ledger": 12345}],
        },
    },
    "webhook-list": {
        "response_200": [
            {
                "id": 1,
                "target_url": "https://myapp.example.com/hooks/soroscan",
                "event_types": ["swap", "transfer"],
                "is_active": True,
            }
        ]
    },
    "webhook-test": {
        "response_200": {"status": "test_webhook_queued"}
    },
    "health-check": {
        "response_200": {"status": "healthy", "service": "soroscan"}
    },
    "contract-status": {
        "response_200": {
            "total_contracts": 5,
            "active_contracts": 4,
            "paused_contracts": 1,
            "total_events_indexed": 12043,
            "last_event_timestamp": "2025-06-01T12:00:00Z",
            "events_per_minute": 7,
        }
    },
    "audit-trail": {
        "response_200": [
            {
                "id": 1,
                "username": "alice",
                "action": "update",
                "object_type": "TrackedContract",
                "object_id": "3",
                "timestamp": "2025-06-01T10:00:00Z",
                "ip_address": "1.2.3.4",
                "changes": {"is_active": [True, False]},
            }
        ]
    },
    "contract-identity": {
        "response_200": {
            "contract_id": "CABC123...",
            "network_passphrase": "Test SDF Network ; September 2015",
            "rpc_url": "https://soroban-testnet.stellar.org",
        }
    },
    "deletion-requests": {
        "request": {
            "subject_identifier": "user@example.com",
            "contract_ids": ["CABC123..."],
        },
        "response_201": {
            "id": 1,
            "requested_by": "alice",
            "subject_identifier": "user@example.com",
            "status": "pending",
            "requested_at": "2025-06-01T12:00:00Z",
        },
    },
}


def _get_examples(endpoint: EndpointDoc) -> list[dict]:
    """Look up canned examples for an endpoint, or generate a generic one."""
    entry = _EXAMPLE_REGISTRY.get(endpoint.name)
    if entry:
        return [entry]

    # Generic fallback
    return [
        {
            "note": "Replace path parameters and supply a valid JWT in the Authorization header.",
            "curl": (
                f'curl -X {endpoint.methods[0]} \\\n'
                f'  https://api.soroscan.io{endpoint.path} \\\n'
                + ('  -H "Authorization: Bearer <token>" \\\n' if endpoint.auth_required else "")
                + '  -H "Content-Type: application/json"'
            ),
        }
    ]


# ---------------------------------------------------------------------------
# Markdown renderer
# ---------------------------------------------------------------------------


def _badge(text: str, colour: str) -> str:
    """Render a plain-markdown badge (GitHub-flavoured)."""
    return f"**`{text}`**"


def _method_badge(method: str) -> str:
    return f"`{method}`"


def render_markdown(endpoints: list[EndpointDoc], include_examples: bool = True) -> str:
    lines: list[str] = []

    lines += [
        "# SoroScan API Reference",
        "",
        "> Auto-generated from view docstrings — do **not** edit by hand.",
        "> Re-generate with: `python manage.py generate_api_docs`",
        "",
        "## Table of Contents",
        "",
    ]

    # Group by tag
    from collections import defaultdict

    groups: dict[str, list[EndpointDoc]] = defaultdict(list)
    for ep in endpoints:
        tag = ep.tags[0] if ep.tags else "General"
        groups[tag].append(ep)

    for tag in sorted(groups):
        anchor = tag.lower().replace(" ", "-")
        lines.append(f"- [{tag}](#{anchor})")

    lines += ["", "---", ""]

    for tag in sorted(groups):
        lines += [f"## {tag}", ""]

        for ep in groups[tag]:
            method_str = " · ".join(_method_badge(m) for m in ep.methods)
            lines += [
                f"### {ep.summary}",
                "",
                f"**Endpoint:** `{ep.path}`  ",
                f"**Methods:** {method_str}  ",
                f"**Auth required:** {'✅ Yes' if ep.auth_required else '🔓 No'}  ",
            ]
            if ep.throttled:
                lines.append("**Rate-limited:** ⚡ Yes  ")
            if ep.cached:
                lines.append("**Cached:** 🗃️ Yes  ")
            lines.append("")

            if ep.description:
                lines += [ep.description, ""]

            if ep.query_params:
                lines += ["#### Query Parameters", "", "| Parameter | Required | Description |", "|-----------|----------|-------------|"]
                for qp in ep.query_params:
                    req = "✅" if qp.required else "—"
                    lines.append(f"| `{qp.name}` | {req} | {qp.description} |")
                lines.append("")

            if ep.request_body:
                lines += [
                    "#### Request Body (JSON)",
                    "",
                    "| Field | Type | Required | Description |",
                    "|-------|------|----------|-------------|",
                ]
                for f in ep.request_body:
                    req = "✅" if f.required else "—"
                    lines.append(f"| `{f.name}` | `{f.type}` | {req} | {f.description} |")
                lines.append("")

            if ep.response_codes:
                lines += ["#### Response Codes", "", "| Code | Description |", "|------|-------------|"]
                for rc in ep.response_codes:
                    lines.append(f"| `{rc.code}` | {rc.description} |")
                lines.append("")

            if include_examples:
                examples = _get_examples(ep)
                if examples:
                    lines += ["#### Examples", ""]
                    for ex in examples:
                        if "curl" in ex:
                            lines += ["```bash", ex["curl"], "```", ""]
                        if "request" in ex:
                            lines += [
                                "**Request body:**",
                                "```json",
                                json.dumps(ex["request"], indent=2),
                                "```",
                                "",
                            ]
                        for key, val in ex.items():
                            if key.startswith("response_"):
                                code = key.split("_")[1]
                                lines += [
                                    f"**Response `{code}`:**",
                                    "```json",
                                    json.dumps(val, indent=2),
                                    "```",
                                    "",
                                ]
                        if "request_params" in ex:
                            lines += [
                                f"**Query string:** `{ex['request_params']}`",
                                "",
                            ]
                        if "note" in ex:
                            lines += [f"> {ex['note']}", ""]

            lines += ["---", ""]

    lines += [
        "## Authentication",
        "",
        "SoroScan uses **JWT Bearer tokens** for all authenticated endpoints.",
        "",
        "```bash",
        "# Obtain a token",
        'curl -X POST https://api.soroscan.io/api/token/ \\',
        '  -H "Content-Type: application/json" \\',
        '  -d \'{"username": "alice", "password": "secret"}\'',
        "",
        "# Use the token",
        'curl https://api.soroscan.io/api/ingest/contracts/ \\',
        '  -H "Authorization: Bearer <access_token>"',
        "```",
        "",
        "Tokens expire; use `/api/token/refresh/` with the `refresh` token to renew.",
        "",
        "---",
        "",
        "## Rate Limiting",
        "",
        "| Tier | Quota |",
        "|------|-------|",
        "| Anonymous | 60 req/min |",
        "| Authenticated | 300 req/min |",
        "| Ingest (custom API key) | Configurable per key |",
        "",
        "Exceeded limits return HTTP **429 Too Many Requests**.",
        "",
        "---",
        "",
        "*Generated by `generate_api_docs` management command.*",
    ]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# JSON renderer
# ---------------------------------------------------------------------------


def render_json(endpoints: list[EndpointDoc]) -> str:
    """Serialize the endpoint list to JSON."""
    from dataclasses import asdict

    return json.dumps(
        [asdict(ep) for ep in endpoints],
        indent=2,
        default=str,
    )


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = (
        "Generate Markdown (or JSON) API documentation from view docstrings "
        "and URL patterns. Safe to re-run; idempotent output."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default="docs/api_reference.md",
            help=(
                "Path to write the generated docs (relative to manage.py). "
                "Default: docs/api_reference.md"
            ),
        )
        parser.add_argument(
            "--format",
            choices=["markdown", "json"],
            default="markdown",
            help="Output format (default: markdown)",
        )
        parser.add_argument(
            "--include-examples",
            action="store_true",
            default=True,
            help="Include canned curl/JSON examples in Markdown output (default: on)",
        )
        parser.add_argument(
            "--no-examples",
            action="store_false",
            dest="include_examples",
            help="Suppress examples section",
        )
        parser.add_argument(
            "--stdout",
            action="store_true",
            default=False,
            help="Print to stdout instead of writing a file",
        )

    def handle(self, *args, **options):
        output_path: str = options["output"]
        fmt: str = options["format"]
        include_examples: bool = options["include_examples"]
        to_stdout: bool = options["stdout"]

        self.stderr.write("🔍  Collecting API endpoints …")
        endpoints = collect_endpoints()
        self.stderr.write(f"    Found {len(endpoints)} endpoint(s).")

        self.stderr.write("📝  Rendering documentation …")
        if fmt == "json":
            content = render_json(endpoints)
        else:
            content = render_markdown(endpoints, include_examples=include_examples)

        if to_stdout:
            self.stdout.write(content)
            return

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content, encoding="utf-8")

        self.stdout.write(
            self.style.SUCCESS(f"✅  API docs written to {out} ({len(endpoints)} endpoints)")
        )
