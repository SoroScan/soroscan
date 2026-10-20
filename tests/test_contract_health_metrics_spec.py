"""
Specification test for issue #1665:
feat(metrics): emit contract health gauge in check_contract_health
"""

import ast
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def test_metrics_definitions_and_exports():
    backend_metrics = BASE_DIR / "django-backend" / "soroscan" / "ingest" / "metrics.py"
    assert backend_metrics.exists(), f"metrics.py must exist at {backend_metrics}"

    content = backend_metrics.read_text(encoding="utf-8")
    tree = ast.parse(content)

    # 1. Assert __all__ export
    all_exports = []
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    if isinstance(node.value, (ast.List, ast.Tuple)):
                        all_exports = [elt.value for elt in node.value.elts if isinstance(elt, ast.Constant)]

    assert "contract_health_status_gauge" in all_exports
    assert "contract_health_transitions_total" in all_exports
    assert "CONTRACT_HEALTH_STATUS_MAP" in all_exports

    # 2. Check metric registrations
    assert '"soroscan_contract_health_status"' in content
    assert '"soroscan_contract_health_transitions_total"' in content
    assert '"contract_id"' in content
    assert '"from_status"' in content
    assert '"to_status"' in content


def test_contract_health_mapping_spec():
    backend_metrics = BASE_DIR / "django-backend" / "soroscan" / "ingest" / "metrics.py"
    content = backend_metrics.read_text(encoding="utf-8")

    # Verify map contains healthy=0, degraded=1, failed=2
    assert '"healthy": 0' in content
    assert '"degraded": 1' in content
    assert '"failed": 2' in content


def test_tasks_emission_in_check_single_contract_health():
    tasks_file = BASE_DIR / "django-backend" / "soroscan" / "ingest" / "tasks.py"
    assert tasks_file.exists(), f"tasks.py must exist at {tasks_file}"

    content = tasks_file.read_text(encoding="utf-8")
    assert "contract_health_status_gauge" in content
    assert "contract_health_transitions_total" in content
    assert "CONTRACT_HEALTH_STATUS_MAP" in content
    assert "_short_contract_id" in content

    # Check function exists and contains metric calls
    tree = ast.parse(content)
    func_names = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
    assert "_check_single_contract_health" in func_names
    assert "check_contract_health" in func_names
