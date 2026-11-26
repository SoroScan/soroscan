import re
from datetime import date
from decimal import Decimal
import pytest

from soroscan.ingest.models import Organization
from soroscan.ingest.services.admin_ops import (
    AdminOpsError,
    _build_invoice_number,
    parse_amount,
    parse_month,
)


# --- parse_month tests ---


@pytest.mark.parametrize(
    "input_val,expected",
    [
        ("2026-01", date(2026, 1, 1)),
        ("2026-05", date(2026, 5, 1)),
        ("2026-5", date(2026, 5, 1)),
        ("2024-12", date(2024, 12, 1)),
        ("1999-07", date(1999, 7, 1)),
    ],
)
def test_parse_month_valid(input_val, expected):
    result = parse_month(input_val)
    assert result == expected
    assert result.day == 1


@pytest.mark.parametrize(
    "invalid_input",
    [
        "",
        None,
        "2026-13",
        "2026-00",
        "2026/05",
        "05-2026",
        "2026-May",
        "invalid",
        12345,
    ],
)
def test_parse_month_invalid(invalid_input):
    with pytest.raises(AdminOpsError, match="month must be in YYYY-MM format"):
        parse_month(invalid_input)


# --- parse_amount tests ---


@pytest.mark.parametrize(
    "input_val,expected",
    [
        ("0", Decimal("0.0000")),
        ("0.0", Decimal("0.0000")),
        ("100", Decimal("100.0000")),
        ("12.3456", Decimal("12.3456")),
        ("12.34564", Decimal("12.3456")),  # round down
        ("12.34567", Decimal("12.3457")),  # round up
        (100, Decimal("100.0000")),
        (0.5, Decimal("0.5000")),
        (Decimal("42.50"), Decimal("42.5000")),
    ],
)
def test_parse_amount_valid(input_val, expected):
    result = parse_amount(input_val)
    assert result == expected
    assert isinstance(result, Decimal)


@pytest.mark.parametrize(
    "negative_val",
    [
        "-0.0001",
        "-1",
        "-100.50",
        -5,
        -0.01,
        Decimal("-10.00"),
    ],
)
def test_parse_amount_negative(negative_val):
    with pytest.raises(AdminOpsError, match="amount must be greater than or equal to 0"):
        parse_amount(negative_val)


@pytest.mark.parametrize(
    "invalid_val",
    [
        "abc",
        "",
        "12.34.56",
        None,
        "$$$",
        "one hundred",
    ],
)
def test_parse_amount_non_numeric(invalid_val):
    with pytest.raises(AdminOpsError, match="amount must be a valid decimal number"):
        parse_amount(invalid_val)


# --- _build_invoice_number tests ---


def test_build_invoice_number_with_slug():
    org = Organization(slug="acme-corp", name="Acme Corporation")
    billing_period = date(2026, 8, 15)

    invoice_number = _build_invoice_number(org, billing_period)

    # Must follow pattern: INV-<slug>-<YYYYMM>-<6 hex chars>
    pattern = r"^INV-acme-corp-202608-[0-9a-f]{6}$"
    assert re.match(pattern, invoice_number), f"Invoice number {invoice_number} did not match pattern {pattern}"
    assert "acme-corp" in invoice_number
    assert "202608" in invoice_number


def test_build_invoice_number_fallback_to_slugified_name():
    org = Organization(slug="", name="Acme Widgets & Tools")
    billing_period = date(2025, 11, 1)

    invoice_number = _build_invoice_number(org, billing_period)

    # slugify("Acme Widgets & Tools") -> "acme-widgets-tools"
    assert invoice_number.startswith("INV-acme-widgets-tools-202511-")
    assert len(invoice_number.split("-")[-1]) == 6


def test_build_invoice_number_truncates_long_slug():
    long_slug = "this-is-a-very-long-organization-slug-that-exceeds-limit"
    org = Organization(slug=long_slug, name="Long Org")
    billing_period = date(2026, 1, 1)

    invoice_number = _build_invoice_number(org, billing_period)

    expected_slug_segment = long_slug[:24]
    assert invoice_number.startswith(f"INV-{expected_slug_segment}-202601-")


def test_build_invoice_number_fallback_to_org_when_both_empty():
    org = Organization(slug="", name="!!!")
    billing_period = date(2026, 3, 1)

    invoice_number = _build_invoice_number(org, billing_period)

    assert invoice_number.startswith("INV-org-202603-")
    assert re.match(r"^INV-org-202603-[0-9a-f]{6}$", invoice_number)
