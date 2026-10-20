from pathlib import Path
import yaml


def test_all_workers_have_hardened_security_context():
    repo_root = Path(__file__).resolve().parent.parent
    worker_file = repo_root / "k8s" / "worker-deployment.yaml"
    assert worker_file.is_file(), f"Missing worker-deployment.yaml at {worker_file}"

    with open(worker_file, "r", encoding="utf-8") as f:
        docs = list(yaml.safe_load_all(f))

    assert len(docs) == 4, f"Expected 4 worker deployments, found {len(docs)}"

    expected_names = {
        "soroscan-worker-high",
        "soroscan-worker-default",
        "soroscan-worker-low",
        "soroscan-worker-backfill",
    }
    actual_names = {d["metadata"]["name"] for d in docs}
    assert expected_names == actual_names

    for doc in docs:
        name = doc["metadata"]["name"]
        pod_spec = doc["spec"]["template"]["spec"]

        # Pod-level securityContext
        pod_sc = pod_spec.get("securityContext", {})
        assert pod_sc.get("fsGroup") == 1000, f"Pod securityContext.fsGroup missing or not 1000 in {name}"

        # Container-level securityContext
        container = pod_spec["containers"][0]
        container_sc = container.get("securityContext", {})

        assert container_sc.get("allowPrivilegeEscalation") is False, f"allowPrivilegeEscalation not False in {name}"
        assert container_sc.get("runAsNonRoot") is True, f"runAsNonRoot not True in {name}"
        assert container_sc.get("runAsUser") == 1000, f"runAsUser not 1000 in {name}"
        assert "ALL" in container_sc.get("capabilities", {}).get("drop", []), f"ALL capabilities not dropped in {name}"
