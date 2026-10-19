"""
Invariants test suite for Kubernetes manifests in k8s/.

Enforces acceptance criteria from Issue #1734:
1. Health probes (readinessProbe and livenessProbe paths must point to /ready/ and /health/, preventing regression #1632).
2. Resource requests and limits (cpu and memory) on all workload containers.
3. SecurityContext hardening (non-root, privilege escalation disallowed, preventing regression #1633).
4. Explicit imagePullPolicy on all workload containers.
5. Regression detection: verified that violations of these invariants fail assertion.
"""
import glob
from pathlib import Path
import copy
import pytest
import yaml

K8S_DIR = Path(__file__).resolve().parent.parent / "k8s"


def load_all_k8s_documents():
    documents = []
    yaml_files = sorted(glob.glob(str(K8S_DIR / "*.yaml")))
    assert len(yaml_files) > 0, "No yaml files found in k8s directory"
    for file_path in yaml_files:
        with open(file_path, "r", encoding="utf-8") as f:
            for doc_idx, doc in enumerate(yaml.safe_load_all(f)):
                if doc:
                    documents.append((Path(file_path).name, doc_idx, doc))
    return documents


def get_deployments(documents):
    return [
        (file_name, doc["metadata"]["name"], doc)
        for file_name, _, doc in documents
        if doc.get("kind") == "Deployment"
    ]


def validate_container_resources(container, context_name):
    resources = container.get("resources")
    assert resources is not None, f"{context_name} missing resources block"
    requests = resources.get("requests", {})
    limits = resources.get("limits", {})
    assert "cpu" in requests, f"{context_name} missing requests.cpu"
    assert "memory" in requests, f"{context_name} missing requests.memory"
    assert "cpu" in limits, f"{context_name} missing limits.cpu"
    assert "memory" in limits, f"{context_name} missing limits.memory"


def validate_container_security_context(container, context_name):
    sec_ctx = container.get("securityContext")
    assert sec_ctx is not None, f"{context_name} missing securityContext (regression #1633)"
    assert sec_ctx.get("allowPrivilegeEscalation") is False, (
        f"{context_name} must disallow privilege escalation"
    )
    assert sec_ctx.get("runAsNonRoot") is True, f"{context_name} must run as non-root"


def validate_backend_probes(container, context_name):
    readiness = container.get("readinessProbe")
    liveness = container.get("livenessProbe")
    assert readiness is not None, f"{context_name} missing readinessProbe"
    assert liveness is not None, f"{context_name} missing livenessProbe"

    readiness_path = readiness.get("httpGet", {}).get("path")
    liveness_path = liveness.get("httpGet", {}).get("path")

    # Invariant from #1632
    assert readiness_path != "/api/events/", (
        f"{context_name} readinessProbe must not hit /api/events/ (regression #1632)"
    )
    assert liveness_path != "/api/events/", (
        f"{context_name} livenessProbe must not hit /api/events/ (regression #1632)"
    )

    assert readiness_path == "/ready/", f"{context_name} readinessProbe path must be /ready/, got {readiness_path}"
    assert liveness_path == "/health/", f"{context_name} livenessProbe path must be /health/, got {liveness_path}"


def test_all_k8s_manifests_parse_cleanly():
    docs = load_all_k8s_documents()
    assert len(docs) >= 10, f"Expected at least 10 k8s documents, found {len(docs)}"


def test_deployments_have_resource_requests_and_limits():
    docs = load_all_k8s_documents()
    deployments = get_deployments(docs)
    assert len(deployments) > 0

    for file_name, deploy_name, deploy in deployments:
        pod_spec = deploy["spec"]["template"]["spec"]
        containers = pod_spec.get("containers", [])
        assert len(containers) > 0, f"{deploy_name} in {file_name} has no containers"

        for container in containers:
            c_name = container.get("name", "unnamed")
            validate_container_resources(container, f"{deploy_name}/{c_name} in {file_name}")


def test_deployments_security_context_hardening():
    """
    Enforces invariant from #1633: all worker and backend deployments must
    define non-root and least-privilege securityContext.
    """
    docs = load_all_k8s_documents()
    deployments = get_deployments(docs)

    for file_name, deploy_name, deploy in deployments:
        pod_spec = deploy["spec"]["template"]["spec"]
        containers = pod_spec.get("containers", [])

        for container in containers:
            c_name = container.get("name", "unnamed")
            validate_container_security_context(container, f"{deploy_name}/{c_name} in {file_name}")


def test_backend_health_probes_invariants():
    """
    Enforces invariant from #1632: backend probes must hit dedicated endpoints
    (/ready/ and /health/), NOT heavy business logic endpoints (/api/events/).
    """
    docs = load_all_k8s_documents()
    deployments = get_deployments(docs)
    backend_deploys = [d for d in deployments if d[1] == "soroscan-backend"]
    assert len(backend_deploys) == 1, "Expected exactly 1 soroscan-backend deployment"

    file_name, deploy_name, deploy = backend_deploys[0]
    backend_container = next(
        c for c in deploy["spec"]["template"]["spec"]["containers"] if c["name"] == "backend"
    )
    validate_backend_probes(backend_container, f"{deploy_name}/backend in {file_name}")


def test_image_pull_policy_is_explicit():
    docs = load_all_k8s_documents()
    deployments = get_deployments(docs)

    for file_name, deploy_name, deploy in deployments:
        containers = deploy["spec"]["template"]["spec"].get("containers", [])
        for container in containers:
            c_name = container.get("name", "unnamed")
            pull_policy = container.get("imagePullPolicy")
            assert pull_policy in ("IfNotPresent", "Always"), (
                f"{deploy_name}/{c_name} in {file_name} missing explicit imagePullPolicy"
            )


def test_regression_detection_probe_path_fails():
    """Verify that an invalid probe path (such as #1632 /api/events/) is caught."""
    bad_container = {
        "readinessProbe": {"httpGet": {"path": "/api/events/"}},
        "livenessProbe": {"httpGet": {"path": "/health/"}},
    }
    with pytest.raises(AssertionError, match="regression #1632"):
        validate_backend_probes(bad_container, "test-probe")


def test_regression_detection_missing_security_context_fails():
    """Verify that missing securityContext (such as #1633) is caught."""
    bad_container = {"name": "worker"}
    with pytest.raises(AssertionError, match="regression #1633"):
        validate_container_security_context(bad_container, "test-security")


def test_regression_detection_missing_resources_fails():
    """Verify that missing resources block is caught."""
    bad_container = {"name": "worker"}
    with pytest.raises(AssertionError, match="missing resources block"):
        validate_container_resources(bad_container, "test-resources")
