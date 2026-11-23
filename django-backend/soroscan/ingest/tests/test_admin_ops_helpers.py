"""Unit tests for the pure helpers in admin_ops (issue #1942)."""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

import pytest

from soroscan.ingest.models import Organization
from soroscan.ingest.services.admin_ops import (
    AdminOpsError,
    _build_invoice_number,
    parse_amount,
    parse_month,
)

MONTH_ERROR = "month must be in YYYY-MM format"
AMOUNT_TYPE_ERROR = "amount must be a valid decimal number"
AMOUNT_NEGATIVE_ERROR = "amount must be greater than or equal to 0"


class TestParseMonth:
    @pytest.mark.parametrize(
        "value, expected",
        [
            ("2026-01", date(2026, 1, 1)),
            ("2026-03", date(2026, 3, 1)),
            ("2026-12", date(2026, 12, 1)),
            ("1999-07", date(1999, 7, 1)),
        ],
    )
    def test_valid_month_returns_first_day(self, value, expected):
        assert parse_month(value) == expected

    @pytest.mark.parametrize(
        "value",
        [
            "2026-13",  # no such month
            "2026-00",  # no such month
            "26-03",  # two-digit year
            "2026-12-31",  # full date is not a month
            "March 2026",  # wrong format entirely
            "2026/03",  # wrong separator
            "",  # empty
            "   ",  # whitespace only
            None,  # wrong type
        ],
    )
    def test_invalid_month_raises_with_message(self, value):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_month(value)
        assert str(exc_info.value) == MONTH_ERROR


class TestParseAmount:
    @pytest.mark.parametrize(
        "value, expected",
        [
            ("0", Decimal("0.0000")),
            ("12", Decimal("12.0000")),
            ("12.5", Decimal("12.5000")),
            ("0.0001", Decimal("0.0001")),
            ("1234567.891", Decimal("1234567.8910")),
        ],
    )
    def test_valid_amount_is_quantized_to_four_places(self, value, expected):
        result = parse_amount(value)
        assert result == expected
        assert result.as_tuple().exponent == -4

    @pytest.mark.parametrize(
        "value, expected",
        [
            ("1.23456", Decimal("1.2346")),  # rounds up
            ("1.23454", Decimal("1.2345")),  # rounds down
            ("0.00005", Decimal("0.0000")),  # half-even: 0 is even, so stays 0
            ("0.00015", Decimal("0.0002")),  # half-even: 1 is odd, so rounds to 2
        ],
    )
    def test_amount_rounds_half_even_to_four_places(self, value, expected):
        assert parse_amount(value) == expected

    def test_accepts_numeric_input(self):
        assert parse_amount(5) == Decimal("5.0000")
        assert parse_amount(2.5) == Decimal("2.5000")

    def test_negative_amount_raises_with_message(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount("-1")
        assert str(exc_info.value) == AMOUNT_NEGATIVE_ERROR

    def test_tiny_negative_amount_raises(self):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount("-0.0001")
        assert str(exc_info.value) == AMOUNT_NEGATIVE_ERROR

    @pytest.mark.parametrize("value", ["abc", "1,000", "12 USD", "", None])
    def test_non_numeric_amount_raises_with_message(self, value):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount(value)
        assert str(exc_info.value) == AMOUNT_TYPE_ERROR

    @pytest.mark.xfail(
        strict=True,
        raises=Exception,
        reason=(
            "Bug: parse_amount('NaN') / ('Infinity') leak decimal.InvalidOperation "
            "instead of raising AdminOpsError. Kept as a test-only PR per issue #1942."
        ),
    )
    @pytest.mark.parametrize("value", ["NaN", "Infinity"])
    def test_non_finite_amount_raises_admin_ops_error(self, value):
        with pytest.raises(AdminOpsError) as exc_info:
            parse_amount(value)
        assert str(exc_info.value) == AMOUNT_TYPE_ERROR


class TestBuildInvoiceNumber:
    def test_number_contains_slug_and_period(self):
        org = Organization(name="Acme Corp", slug="acme")
        number = _build_invoice_number(org, date(2026, 3, 1))
        assert number.startswith("INV-acme-202603-")
        assert number.count("-") == 3

    def test_suffix_is_six_hex_characters(self):
        org = Organization(name="Acme Corp", slug="acme")
        number = _build_invoice_number(org, date(2026, 3, 1))
        suffix = number.rsplit("-", 1)[1]
        assert len(suffix) == 6
        int(suffix, 16)  # raises ValueError if not hex

    def test_same_inputs_are_deterministic_except_suffix(self):
        org = Organization(name="Acme Corp", slug="acme")
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            return_value="abc123",
        ):
            first = _build_invoice_number(org, date(2026, 3, 1))
            second = _build_invoice_number(org, date(2026, 3, 1))
        assert first == second == "INV-acme-202603-abc123"

    def test_different_suffixes_give_unique_numbers(self):
        org = Organization(name="Acme Corp", slug="acme")
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            side_effect=["aaaaaa", "bbbbbb"],
        ):
            first = _build_invoice_number(org, date(2026, 3, 1))
            second = _build_invoice_number(org, date(2026, 3, 1))
        assert first != second

    def test_period_uses_year_and_zero_padded_month(self):
        org = Organization(name="Acme Corp", slug="acme")
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            return_value="000000",
        ):
            number = _build_invoice_number(org, date(2026, 11, 1))
        assert number == "INV-acme-202611-000000"

    def test_falls_back_to_slugified_name_when_slug_missing(self):
        org = Organization(name="Soro Scan Labs", slug="")
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            return_value="111111",
        ):
            number = _build_invoice_number(org, date(2026, 3, 1))
        assert number == "INV-soro-scan-labs-202603-111111"

    def test_falls_back_to_org_when_slug_and_name_yield_nothing(self):
        org = Organization(name="!!!", slug="")
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            return_value="222222",
        ):
            number = _build_invoice_number(org, date(2026, 3, 1))
        assert number == "INV-org-202603-222222"

    def test_long_slug_is_truncated_to_24_characters(self):
        long_slug = "a" * 40
        org = Organization(name="Long", slug=long_slug)
        with patch(
            "soroscan.ingest.services.admin_ops.secrets.token_hex",
            return_value="333333",
        ):
            number = _build_invoice_number(org, date(2026, 3, 1))
        assert number == f"INV-{'a' * 24}-202603-333333"
