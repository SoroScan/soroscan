import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from soroscan.ingest.management.commands.restore_contracts import (
    DEFAULT_RESTORE_USERNAME,
)
from soroscan.ingest.models import TrackedContract
from soroscan.ingest.tests.factories import TrackedContractFactory, UserFactory


@pytest.mark.django_db
class TestBackupRestoreRoundTrip:
    def test_backup_then_restore_recreates_deleted_contracts(self, tmp_path):
        owner = UserFactory(username="alice")
        contracts = TrackedContractFactory.create_batch(
            3,
            owner=owner,
            is_active=True,
            deprecation_status=TrackedContract.DeprecationStatus.ACTIVE,
        )
        ids = sorted(c.contract_id for c in contracts)
        names = {c.contract_id: c.name for c in contracts}

        backup_path = tmp_path / "backup.json"
        call_command("backup_contracts", output=str(backup_path))

        TrackedContract.objects.filter(contract_id__in=ids).delete()
        assert TrackedContract.objects.filter(contract_id__in=ids).count() == 0

        call_command("restore_contracts", input=str(backup_path))

        restored = TrackedContract.objects.filter(contract_id__in=ids).order_by(
            "contract_id"
        )
        assert sorted(c.contract_id for c in restored) == ids
        for contract in restored:
            assert contract.name == names[contract.contract_id]
            assert contract.owner == owner
            assert contract.is_active is True
            assert contract.deprecation_status == TrackedContract.DeprecationStatus.ACTIVE

    def test_restore_falls_back_to_service_user_when_owner_missing(self, tmp_path):
        backup_path = tmp_path / "backup.json"
        backup_path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "contracts": [
                        {
                            "contract_id": "C" + "A" * 55,
                            "alias": "No Owner Recorded",
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        call_command("restore_contracts", input=str(backup_path))

        contract = TrackedContract.objects.get(contract_id="C" + "A" * 55)
        assert contract.owner.username == DEFAULT_RESTORE_USERNAME

    def test_restore_is_idempotent_by_default(self, tmp_path):
        owner = UserFactory()
        contract = TrackedContractFactory(owner=owner, name="Original")
        backup_path = tmp_path / "backup.json"
        call_command("backup_contracts", output=str(backup_path))

        contract.name = "Changed locally"
        contract.save()

        call_command("restore_contracts", input=str(backup_path))

        contract.refresh_from_db()
        assert contract.name == "Changed locally"
        assert TrackedContract.objects.filter(contract_id=contract.contract_id).count() == 1

    def test_restore_with_force_updates_existing_contract(self, tmp_path):
        owner = UserFactory()
        contract = TrackedContractFactory(owner=owner, name="Original")
        backup_path = tmp_path / "backup.json"
        call_command("backup_contracts", output=str(backup_path))

        contract.name = "Changed locally"
        contract.save()

        call_command("restore_contracts", input=str(backup_path), force=True)

        contract.refresh_from_db()
        assert contract.name == "Original"

    def test_restore_missing_file_raises_command_error(self, tmp_path):
        missing = tmp_path / "does-not-exist.json"

        with pytest.raises(CommandError):
            call_command("restore_contracts", input=str(missing))

    def test_restore_corrupt_json_raises_command_error(self, tmp_path):
        corrupt = tmp_path / "corrupt.json"
        corrupt.write_text("{not valid json", encoding="utf-8")

        with pytest.raises(CommandError):
            call_command("restore_contracts", input=str(corrupt))

    def test_restore_rejects_unsupported_backup_version(self, tmp_path):
        bad_version = tmp_path / "bad-version.json"
        bad_version.write_text(
            json.dumps({"version": 99, "contracts": []}), encoding="utf-8"
        )

        with pytest.raises(CommandError, match="Unsupported backup version"):
            call_command("restore_contracts", input=str(bad_version))

    def test_backup_file_contains_owner_and_alias(self, tmp_path):
        owner = UserFactory()
        contract = TrackedContractFactory(owner=owner)
        backup_path = tmp_path / "backup.json"

        call_command("backup_contracts", output=str(backup_path))

        data = json.loads(backup_path.read_text(encoding="utf-8"))
        assert data["version"] == 1
        backed_up = {c["contract_id"]: c for c in data["contracts"]}
        assert backed_up[contract.contract_id]["owner"] == owner.username
        assert backed_up[contract.contract_id]["alias"] == contract.name


@pytest.mark.django_db
class TestExportContractsCommand:
    def test_export_output_shape(self, tmp_path):
        contracts = TrackedContractFactory.create_batch(2)
        path = tmp_path / "export.json"

        call_command("export_contracts", output=str(path))

        data = json.loads(path.read_text(encoding="utf-8"))
        assert set(data.keys()) == {"contracts"}
        exported_ids = {entry["contract_id"] for entry in data["contracts"]}
        assert exported_ids == {c.contract_id for c in contracts}
        for entry in data["contracts"]:
            assert set(entry.keys()) == {"contract_id", "name"}

    def test_export_pretty_prints_when_requested(self, tmp_path):
        TrackedContractFactory()
        compact_path = tmp_path / "compact.json"
        pretty_path = tmp_path / "pretty.json"

        call_command("export_contracts", output=str(compact_path))
        call_command("export_contracts", output=str(pretty_path), pretty=True)

        assert "\n" not in compact_path.read_text(encoding="utf-8")
        assert "\n" in pretty_path.read_text(encoding="utf-8")
