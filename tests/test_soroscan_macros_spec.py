import subprocess
from pathlib import Path


def get_repo_root() -> Path:
    cur = Path(__file__).resolve()
    for parent in cur.parents:
        if (parent / ".git").exists() or (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Repository root could not be located")


def test_soroscan_macros_handles_tuple_payloads():
    repo_root = get_repo_root()
    lib_rs = repo_root / "soroban-contracts" / "soroscan_macros" / "src" / "lib.rs"
    cargo_toml = repo_root / "soroban-contracts" / "soroscan_macros" / "Cargo.toml"

    assert lib_rs.exists(), "soroscan_macros/src/lib.rs must exist"
    assert cargo_toml.exists(), "soroscan_macros/Cargo.toml must exist"

    content = lib_rs.read_text(encoding="utf-8")

    # 1. Ensure naive comma splitting was removed
    assert "input_str.split(',')" not in content, (
        "Naive comma splitting input_str.split(',') must be replaced with token-based expression parser"
    )

    # 2. Token-based parsing with Punctuated<Expr, Token![,]> is present
    assert "Punctuated::<Expr, Token![,]>::parse_terminated" in content

    # 3. Dedicated unit tests for tuple payloads and batch expansion exist
    assert "test_emit_soroscan_event_tuple_payload" in content
    assert "test_emit_soroscan_batch_success" in content

    # 4. Cargo test runs and passes
    res = subprocess.run(
        ["cargo", "test", "--manifest-path", str(cargo_toml)],
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0, f"cargo test failed:\n{res.stderr}\n{res.stdout}"
    assert "0 failed" in res.stdout and "passed" in res.stdout
