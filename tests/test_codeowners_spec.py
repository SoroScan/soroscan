import fnmatch
from pathlib import Path
import re


def parse_codeowners(content: str):
    rules = []
    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        pattern = parts[0]
        owners = parts[1:]
        rules.append((pattern, owners))
    return rules


def test_codeowners_syntax():
    repo_root = Path(__file__).resolve().parent.parent
    codeowners_file = repo_root / ".github" / "CODEOWNERS"
    assert codeowners_file.is_file(), f"Missing CODEOWNERS at {codeowners_file}"

    content = codeowners_file.read_text(encoding="utf-8")
    rules = parse_codeowners(content)
    assert len(rules) >= 5, "CODEOWNERS must contain rules"

    owner_pattern = re.compile(r"^(@[a-zA-Z0-9_\-\/]+|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)$")

    for pattern, owners in rules:
        assert pattern, "Pattern cannot be empty"
        assert len(owners) >= 1, f"Pattern '{pattern}' must specify at least one owner"
        for owner in owners:
            assert owner_pattern.match(owner), f"Invalid owner format '{owner}' for pattern '{pattern}'"


def test_codeowners_major_directories_coverage():
    repo_root = Path(__file__).resolve().parent.parent
    codeowners_file = repo_root / ".github" / "CODEOWNERS"
    content = codeowners_file.read_text(encoding="utf-8")
    rules = parse_codeowners(content)
    patterns = [r[0] for r in rules]

    required_patterns = [
        "*",
        "/django-backend/",
        "/soroscan-frontend/",
        "/admin/",
        "/soroban-contracts/",
        "/sdk/",
        "/docs/",
        "/k8s/",
        "/.github/workflows/",
    ]

    for req in required_patterns:
        assert req in patterns, f"Required pattern '{req}' missing in CODEOWNERS"


def test_codeowners_matches_sample_files():
    # Verify standard GitHub CODEOWNERS path matching logic
    test_cases = [
        ("django-backend/manage.py", "/django-backend/"),
        ("soroscan-frontend/package.json", "/soroscan-frontend/"),
        ("admin/package.json", "/admin/"),
        ("soroban-contracts/soroscan_core/Cargo.toml", "/soroban-contracts/"),
        ("sdk/python/pyproject.toml", "/sdk/python/"),
        ("docs/overview.md", "/docs/"),
        ("k8s/deployment.yaml", "/k8s/"),
        (".github/workflows/test.yml", "/.github/workflows/"),
        ("unknown-file.txt", "*"),
    ]

    repo_root = Path(__file__).resolve().parent.parent
    codeowners_file = repo_root / ".github" / "CODEOWNERS"
    content = codeowners_file.read_text(encoding="utf-8")
    rules = parse_codeowners(content)

    def find_owner_rule(file_path: str):
        normalized_path = "/" + file_path.lstrip("/")
        matched_rule = None
        for pattern, owners in rules:
            if pattern == "*":
                matched_rule = (pattern, owners)
            elif pattern.startswith("/") and pattern.endswith("/"):
                prefix = pattern
                if normalized_path.startswith(prefix):
                    matched_rule = (pattern, owners)
            elif pattern.startswith("/"):
                if normalized_path == pattern or normalized_path.startswith(pattern + "/"):
                    matched_rule = (pattern, owners)
            elif pattern.endswith("/"):
                if prefix in normalized_path:
                    matched_rule = (pattern, owners)
        return matched_rule

    for sample_file, expected_pattern in test_cases:
        matched = find_owner_rule(sample_file)
        assert matched is not None, f"No matching rule found for {sample_file}"
        assert matched[0] == expected_pattern, f"Expected {expected_pattern} for {sample_file}, got {matched[0]}"
