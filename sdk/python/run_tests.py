#!/usr/bin/env python
"""
Test runner script for SoroScan SDK.

Runs all quality checks: tests, type checking, and linting.
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'=' * 60}")
    print(f"Running: {description}")
    print(f"{'=' * 60}")

    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    success = result.returncode == 0

    if success:
        print(f"✓ {description} passed")
    else:
        print(f"✗ {description} failed")

    return success


def main() -> int:
    """Run all checks and return exit code."""
    checks = [
        (["pytest", "tests/", "-v", "--cov=soroscan"], "Unit Tests"),
        (["mypy", "soroscan/", "--strict"], "Type Checking"),
        (["ruff", "check", "soroscan/", "tests/"], "Linting"),
    ]

    results = []
    for cmd, description in checks:
        results.append(run_command(cmd, description))

    print(f"\n{'=' * 60}")
    print("Summary")
    print(f"{'=' * 60}")

    for (_, description), success in zip(checks, results):
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {description}")

    all_passed = all(results)
    if all_passed:
        print("\n✓ All checks passed!")
        return 0
    else:
        print("\n✗ Some checks failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
