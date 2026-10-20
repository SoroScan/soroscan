from pathlib import Path
import yaml


def test_backend_deployment_probes_spec():
    repo_root = Path(__file__).resolve().parent.parent
    deployment_file = repo_root / "k8s" / "backend-deployment.yaml"
    assert deployment_file.is_file(), f"Missing backend-deployment.yaml at {deployment_file}"

    with open(deployment_file, "r", encoding="utf-8") as f:
        doc = yaml.safe_load(f)

    containers = doc["spec"]["template"]["spec"]["containers"]
    backend_container = next((c for c in containers if c["name"] == "backend"), None)
    assert backend_container is not None, "Missing backend container"

    readiness = backend_container.get("readinessProbe", {}).get("httpGet", {})
    liveness = backend_container.get("livenessProbe", {}).get("httpGet", {})

    # Assert readiness probe hits /ready/
    assert readiness.get("path") == "/ready/", f"Expected /ready/ for readiness probe, got {readiness.get('path')}"

    # Assert liveness probe hits /health/
    assert liveness.get("path") == "/health/", f"Expected /health/ for liveness probe, got {liveness.get('path')}"

    # Confirm neither probe hits business endpoint /api/events/
    assert readiness.get("path") != "/api/events/"
    assert liveness.get("path") != "/api/events/"


def test_backend_probes_registered_in_django_urls():
    repo_root = Path(__file__).resolve().parent.parent
    urls_file = repo_root / "django-backend" / "soroscan" / "urls.py"
    assert urls_file.is_file(), f"Missing urls.py at {urls_file}"

    content = urls_file.read_text(encoding="utf-8")
    assert 'path("health/", health_view, name="health")' in content
    assert 'path("ready/", readiness_view, name="readiness")' in content
