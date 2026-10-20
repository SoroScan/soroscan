from pathlib import Path
import yaml


def test_pdb_manifest_structure_and_validity():
    repo_root = Path(__file__).resolve().parent.parent
    pdb_file = repo_root / "k8s" / "pdb.yaml"
    assert pdb_file.is_file(), f"Missing pdb.yaml at {pdb_file}"

    with open(pdb_file, "r", encoding="utf-8") as f:
        docs = list(yaml.safe_load_all(f))

    assert len(docs) >= 5, f"Expected at least 5 PDB documents, found {len(docs)}"

    for doc in docs:
        assert doc.get("apiVersion") == "policy/v1", f"Invalid apiVersion in {doc.get('metadata', {}).get('name')}"
        assert doc.get("kind") == "PodDisruptionBudget", f"Invalid kind in {doc.get('metadata', {}).get('name')}"
        assert doc.get("metadata", {}).get("namespace") == "soroscan"

        spec = doc.get("spec", {})
        assert "minAvailable" in spec or "maxUnavailable" in spec, "PDB must define minAvailable or maxUnavailable"
        assert "selector" in spec and "matchLabels" in spec["selector"], "PDB must define selector.matchLabels"


def test_pdb_matches_backend_deployment():
    repo_root = Path(__file__).resolve().parent.parent
    backend_file = repo_root / "k8s" / "backend-deployment.yaml"
    pdb_file = repo_root / "k8s" / "pdb.yaml"

    with open(backend_file, "r", encoding="utf-8") as f:
        backend_doc = yaml.safe_load(f)

    backend_labels = backend_doc["spec"]["selector"]["matchLabels"]

    with open(pdb_file, "r", encoding="utf-8") as f:
        pdb_docs = list(yaml.safe_load_all(f))

    backend_pdb = next((d for d in pdb_docs if d["metadata"]["name"] == "soroscan-backend-pdb"), None)
    assert backend_pdb is not None, "Missing soroscan-backend-pdb in pdb.yaml"
    assert backend_pdb["spec"]["selector"]["matchLabels"] == backend_labels
    assert backend_pdb["spec"].get("minAvailable") == 1 or backend_pdb["spec"].get("maxUnavailable") == 1


def test_pdb_matches_all_worker_deployments():
    repo_root = Path(__file__).resolve().parent.parent
    worker_file = repo_root / "k8s" / "worker-deployment.yaml"
    pdb_file = repo_root / "k8s" / "pdb.yaml"

    with open(worker_file, "r", encoding="utf-8") as f:
        worker_docs = list(yaml.safe_load_all(f))

    with open(pdb_file, "r", encoding="utf-8") as f:
        pdb_docs = list(yaml.safe_load_all(f))

    pdb_by_component = {
        d["spec"]["selector"]["matchLabels"]["component"]: d
        for d in pdb_docs
        if "component" in d["spec"]["selector"]["matchLabels"]
    }

    for worker in worker_docs:
        comp = worker["spec"]["selector"]["matchLabels"]["component"]
        assert comp in pdb_by_component, f"Missing PDB for worker component {comp}"
        pdb = pdb_by_component[comp]
        assert pdb["spec"]["selector"]["matchLabels"] == worker["spec"]["selector"]["matchLabels"]
        assert "maxUnavailable" in pdb["spec"] or "minAvailable" in pdb["spec"]
