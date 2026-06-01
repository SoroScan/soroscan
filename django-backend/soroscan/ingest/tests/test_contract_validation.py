"""
Tests for Contract model validation rules (issue #<placeholder>).
"""
import pytest
from django.core.exceptions import ValidationError

from soroscan.ingest.models import TrackedContract
from soroscan.ingest.tests.factories import UserFactory


@pytest.mark.django_db
class TestContractAddressValidation:
    def setup_method(self):
        self.user = UserFactory()

    def test_valid_soroban_address(self):
        """A valid 56-character Base32 string starting with C should pass validation."""
        valid_address = "CABC1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH"  # 56 chars
        # Ensure it actually fits the valid regex (A-Z, 2-7) - no 0,1,8,9
        valid_address = "C" + "A" * 55  # exactly 56 chars, all valid Base32
        
        contract = TrackedContract(
            contract_id=valid_address,
            name="Test Contract",
            owner=self.user,
        )
        # Should not raise
        contract.full_clean()

    def test_invalid_prefix(self):
        """Addresses starting with 'G' (classic accounts) should fail validation."""
        invalid_address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTU"  # 56 chars, G prefix
        contract = TrackedContract(
            contract_id=invalid_address,
            name="Test Contract",
            owner=self.user,
        )
        with pytest.raises(ValidationError) as exc:
            contract.full_clean()
        assert "contract_id" in exc.value.error_dict
        assert "Contract address must start with 'C'" in str(exc.value)

    def test_too_short(self):
        """Addresses under 56 characters should fail validation."""
        short_address = "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST"  # 55 chars
        contract = TrackedContract(
            contract_id=short_address,
            name="Test Contract",
            owner=self.user,
        )
        with pytest.raises(ValidationError) as exc:
            contract.full_clean()
        assert "contract_id" in exc.value.error_dict

    def test_too_long(self):
        """Addresses over 56 characters should fail validation."""
        long_address = "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV"  # 57 chars
        contract = TrackedContract(
            contract_id=long_address,
            name="Test Contract",
            owner=self.user,
        )
        with pytest.raises(ValidationError) as exc:
            contract.full_clean()
        assert "contract_id" in exc.value.error_dict

    def test_invalid_charset(self):
        """Addresses containing invalid Base32 characters (0, 1, 8, 9, lowercase) should fail."""
        invalid_chars = [
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS00",  # contains '0'
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS11",  # contains '1'
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS88",  # contains '8'
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS99",  # contains '9'
            "Cabcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqrstu",  # lowercase
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRS!@",  # special chars
        ]
        
        for invalid_address in invalid_chars:
            contract = TrackedContract(
                contract_id=invalid_address,
                name="Test Contract",
                owner=self.user,
            )
            with pytest.raises(ValidationError) as exc:
                contract.full_clean()
            assert "contract_id" in exc.value.error_dict

    def test_empty_and_whitespace(self):
        """Empty strings and strings with whitespace should fail validation."""
        invalid_addresses = [
            "",
            " " * 56,
            "CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST ",  # trailing space
            " CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRST",  # leading space
        ]
        
        for invalid_address in invalid_addresses:
            contract = TrackedContract(
                contract_id=invalid_address,
                name="Test Contract",
                owner=self.user,
            )
            with pytest.raises(ValidationError) as exc:
                contract.full_clean()
            assert "contract_id" in exc.value.error_dict
