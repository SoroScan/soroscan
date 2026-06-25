#!/usr/bin/env bash
# coverage.sh — Generate code coverage for soroscan_core Soroban contract
#
# Requirements:
#   cargo-tarpaulin  →  cargo install cargo-tarpaulin
#
# Usage:
#   ./scripts/coverage.sh            # full HTML + XML + lcov report
#   ./scripts/coverage.sh --check    # fail if coverage < threshold
#
# Environment variables:
#   COVERAGE_THRESHOLD  minimum line coverage % (default: 70)

set -euo pipefail

THRESHOLD="${COVERAGE_THRESHOLD:-70}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "🦀  SoroScan Core — Coverage Report"
echo "    threshold : ${THRESHOLD}%"
echo "    directory : ${PROJECT_DIR}"
echo ""

# Verify cargo-tarpaulin is installed
if ! command -v cargo-tarpaulin &>/dev/null; then
  echo "📦  Installing cargo-tarpaulin …"
  cargo install cargo-tarpaulin
fi

# Run tarpaulin
# --skip-clean  speeds up CI by not cleaning between runs
# --exclude-files  removes soroban testutils scaffolding from stats
cargo tarpaulin \
  --verbose \
  --all-features \
  --workspace \
  --timeout 120 \
  --skip-clean \
  --exclude-files "*/target/*" \
  --out Html \
  --out Xml \
  --out Lcov \
  --output-dir coverage/ \
  -- --test-threads=1

echo ""
echo "✅  Reports written to ${PROJECT_DIR}/coverage/"
echo "    HTML : coverage/tarpaulin-report.html"
echo "    XML  : coverage/cobertura.xml"
echo "    lcov : coverage/lcov.info"

# Parse the coverage percentage from tarpaulin's XML output and enforce threshold
if command -v python3 &>/dev/null; then
  COVERAGE=$(python3 - <<'EOF'
import xml.etree.ElementTree as ET, sys
try:
    tree = ET.parse("coverage/cobertura.xml")
    root = tree.getroot()
    rate = float(root.attrib.get("line-rate", 0)) * 100
    print(f"{rate:.2f}")
except Exception as e:
    print("0.00")
    sys.exit(0)
EOF
)
  echo "    line  : ${COVERAGE}%"

  # Compare using python to avoid bc dependency
  PASS=$(python3 -c "import sys; sys.exit(0 if float('${COVERAGE}') >= float('${THRESHOLD}') else 1)" && echo "yes" || echo "no")
  if [ "$PASS" = "no" ]; then
    echo ""
    echo "❌  Coverage ${COVERAGE}% is below the required threshold of ${THRESHOLD}%."
    exit 1
  fi
  echo ""
  echo "✅  Coverage threshold met (${COVERAGE}% ≥ ${THRESHOLD}%)."
fi
