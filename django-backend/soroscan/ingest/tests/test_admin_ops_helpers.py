"""
Unit tests for the pure helper functions in admin_ops.py:
  - parse_month
  - parse_amount

_build_invoice_number requires an Organization ORM object so it is tested
via a lightweight mock to stay DB-free.

Refs: #1942
"""
from __future__ import annotations

import datetime
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from soroscan.ingest.services.admin_ops import (
    AdminOpsError,
    _build_invoice_number,
    parse_amount,
    parse_month,
)


# ---------------------------------------------------------------------------
# parse_month
# ---------------------------------------------------------------------------

class TestParseMonth:

    def test_valid_returns_first_of_month(self):
        result = parse_month("2024-03")
        assert result == datetime.date(2024, 3, 1)

    def test_valid_january(self):
        result = parse_month("2023-01")
        assert result == datetime.date(2023, 1, 1)

    def test_valid_december(self):
        result = parse_month("2023-12")
        assert result == datetime.date(2023, 12, 1)

    def test_always_returns_day_one(self):
        result = parse_month("2024-06")
        assert result.day == 1

    def test_invalid_format_no_dash(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month("202403")
        assert "month must be in YYYY-MM format" in str(exc_info.value)

    def test_invalid_format_wrong_separator(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month("2024/03")
        assert "month must be in YYYY-MM format" in str(exc_info.value)

    def test_invalid_month_thirteen(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month("2024-13")
        assert "month must be in YYYY-MM format" in str(exc_info.value)

    def test_invalid_non_numeric(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month("abcd-ef")
        assert "month must be in YYYY-MM format" in str(exc_info.value)

    def test_empty_string(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month("")
        assert "month must be in YYYY-MM format" in str(exc_info.value)

    def test_none_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month(None)
        assert "month must be in YYYY-MM format" in str(exc_info.value)


# ---------------------------------------------------------------------------
# parse_amount
# ---------------------------------------------------------------------------

class TestParseAmount:

    def test_valid_integer_string(self):
        assert parse_amount("100") == Decimal("100.0000")

    def test_valid_decimal_string(self):
        assert parse_amount("49.99") == Decimal("49.9900")

    def test_quantizes_to_four_decimal_places(self):
        result = parse_amount("10.99999")
        assert result == Decimal("11.0000")

    def test_valid_zero(self):
        assert parse_amount("0") == Decimal("0.0000")

    def test_valid_exact_four_decimals(self):
        assert parse_amount("1.2345") == Decimal("1.2345")

    def test_negative_amount_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount("-50")
        assert "amount must be greater than or equal to 0" in str(exc_info.value)

    def test_non_numeric_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount("abc")
        assert "amount must be a valid decimal number" in str(exc_info.value)

    def test_empty_string_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount("")
        assert "amount must be a valid decimal number" in str(exc_info.value)

    def test_none_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount(None)
        assert "amount must be a valid decimal number" in str(exc_info.value)


# ---------------------------------------------------------------------------
# _build_invoice_number
# ---------------------------------------------------------------------------

def _make_org(slug: str) -> MagicMock:
    """Return a minimal mock that satisfies _build_invoice_number."""
    org = MagicMock()
    org.slug = slug
    org.name = slug
    return org


class TestBuildInvoiceNumber:

    def test_contains_slug(self):
        org = _make_org("acme")
        result = _build_invoice_number(org, datetime.date(2024, 3, 1))
        assert "acme" in result

    def test_contains_year_and_month(self):
        org = _make_org("acme")
        result = _build_invoice_number(org, datetime.date(2024, 3, 1))
        assert "202403" in result

    def test_starts_with_inv_prefix(self):
        org = _make_org("acme")
        result = _build_invoice_number(org, datetime.date(2024, 3, 1))
        assert result.startswith("INV-")

    def test_different_calls_produce_different_suffixes(self):
        # suffix is random (secrets.token_hex) so two calls must differ
        org = _make_org("acme")
        period = datetime.date(2024, 3, 1)
        a = _build_invoice_number(org, period)
        b = _build_invoice_number(org, period)
        assert a != b

    def test_different_orgs_differ(self):
        period = datetime.date(2024, 3, 1)
        a = _build_invoice_number(_make_org("acme"), period)
        b = _build_invoice_number(_make_org("globex"), period)
        # slugs differ so the body of the invoice number must differ
        assert "acme" in a and "globex" in b

    def test_different_months_produce_different_period_segment(self):
        org = _make_org("acme")
        a = _build_invoice_number(org, datetime.date(2024, 3, 1))
        b = _build_invoice_number(org, datetime.date(2024, 4, 1))
        assert "202403" in a
        assert "202404" in b

    def test_returns_string(self):
        result = _build_invoice_number(_make_org("acme"), datetime.date(2024, 3, 1))
        assert isinstance(result, str)

    def test_slug_truncated_to_24_chars(self):
        long_slug = "a" * 40
        org = _make_org(long_slug)
        result = _build_invoice_number(org, datetime.date(2024, 3, 1))
        # the slug segment between INV- and the period should be at most 24 chars
        parts = result.split("-")
        # INV | <slug up to 24> | 202403 | <hex suffix>
        slug_part = parts[1]
        assert len(slug_part) <= 24