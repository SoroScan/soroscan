from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

import pytest

from soroscan.pact_provider import apply_provider_state

REPO_ROOT = Path(__file__).resolve().parents[3]
PACTS_DIR = REPO_ROOT / "pacts"


def _handle_provider_state(
    state: str,
    action: Literal["setup", "teardown"],
    parameters: dict[str, Any] | None,
) -> None:
    if action == "setup":
        apply_provider_state(state)
    elif action == "teardown":
        # Provider states are reset at the start of each setup call.
        pass


@pytest.mark.django_db
def test_provider_honours_pact_contracts(live_server, settings):
    pytest.importorskip("pact")
    from pact import Verifier

    settings.PACT_PROVIDER_STATES_ENABLED = True

    pact_files = sorted(PACTS_DIR.glob("*.json"))
    assert pact_files, f"No pact files found in {PACTS_DIR}"

    verifier = (
        Verifier("soroscan-api")
        .add_source(str(PACTS_DIR))
        .add_transport(url=live_server.url)
        .state_handler(_handle_provider_state, teardown=True)
    )

    verifier.verify()
