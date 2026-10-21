from __future__ import annotations

import re
from pathlib import Path
import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
PLAYBOOKS_DIR = REPO_ROOT / "docs" / "deployment" / "playbooks"
PLAYBOOKS_README = PLAYBOOKS_DIR / "README.md"
CELERY_PLAYBOOK = PLAYBOOKS_DIR / "celery-queue-backlog.md"


def test_playbooks_readme_links_exist_and_non_empty():
    assert PLAYBOOKS_README.is_file(), "Playbooks README.md must exist"
    readme_content = PLAYBOOKS_README.read_text(encoding="utf-8")

    # Match all markdown links like [event-ingestion-lag.md](./event-ingestion-lag.md)
    links = re.findall(r"\[([^\]]+)\]\(\./([^)]+\.md)\)", readme_content)
    assert len(links) >= 5, "README should link to at least 5 playbooks"

    for link_text, relative_path in links:
        target_file = PLAYBOOKS_DIR / relative_path
        assert target_file.is_file(), f"Linked playbook {relative_path} does not exist"
        assert target_file.stat().st_size > 100, f"Linked playbook {relative_path} is empty or too short"


def test_celery_queue_backlog_playbook_structure_and_sections():
    assert CELERY_PLAYBOOK.is_file(), "celery-queue-backlog.md must exist"
    content = CELERY_PLAYBOOK.read_text(encoding="utf-8")

    assert "# Playbook: Celery Queue Backlog" in content
    assert "SoroScanCeleryQueueDepthHigh" in content
    assert "celery_queue_backlog" in content

    # Check required core sections
    required_sections = [
        "## Detection",
        "## Triage",
        "## Alert → action mapping",
        "## Investigation commands",
        "## Remediation",
        "## Automation",
        "## Resolution checklist",
    ]
    for section in required_sections:
        assert section in content, f"Playbook missing required section: {section}"

    # Check key Celery queues mentioned
    assert "high_priority" in content
    assert "default" in content
    assert "low_priority" in content
    assert "backfill" in content

    # Check key investigation and remediation commands
    assert "redis-cli" in content
    assert "celery -A soroscan inspect" in content
    assert "kubectl scale" in content


def test_incident_playbooks_service_mapping_consistency():
    service_file = (
        REPO_ROOT
        / "django-backend"
        / "soroscan"
        / "ingest"
        / "services"
        / "incident_playbooks.py"
    )
    assert service_file.is_file(), "incident_playbooks.py must exist"
    text = service_file.read_text(encoding="utf-8")

    # Assert celery backlog constant and path defined
    assert 'ALERT_CELERY_BACKLOG = "celery_queue_backlog"' in text
    assert 'ALERT_CELERY_BACKLOG: "docs/deployment/playbooks/celery-queue-backlog.md"' in text
    assert '"prometheus_alert": "SoroScanCeleryQueueDepthHigh"' in text

    # Extract all playbook paths from PLAYBOOK_PATHS dictionary
    path_matches = re.findall(r'"docs/deployment/playbooks/[^"]+\.md"', text)
    assert len(path_matches) >= 5

    for rel_path_quoted in path_matches:
        rel_path = rel_path_quoted.strip('"')
        full_path = REPO_ROOT / rel_path
        assert full_path.is_file(), f"Path referenced in incident_playbooks.py does not exist: {rel_path}"
