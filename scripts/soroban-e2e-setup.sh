#!/usr/bin/env bash
# Deploy soroscan_core to a local standalone quickstart node and emit a test event.
#
# Issue #1218 — ci: add integration test workflow against local Soroban RPC node
#
# When STELLAR_QUICKSTART_CONTAINER is set, stellar commands run inside the
# quickstart container (which already ships the Stellar CLI).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTAINER="${STELLAR_QUICKSTART_CONTAINER:-}"
RPC_URL="${SOROBAN_RPC_URL:-http://localhost:8000/soroban/rpc}"
NETWORK="${STELLAR_NETWORK_PASSPHRASE:-Standalone Network ; February 2017}"
HORIZON="${HORIZON_URL:-http://localhost:8000}"
IDENTITY="${STELLAR_IDENTITY:-e2e-admin}"
CONTRACT_FILE="$REPO_ROOT/.soroban-e2e-contract-id"

run_stellar() {
  if [ -n "${CONTAINER}" ]; then
    docker exec "${CONTAINER}" stellar "$@"
  else
    stellar "$@"
  fi
}

echo "[soroban-e2e] Waiting for quickstart health at ${HORIZON}/health ..."
for _ in $(seq 1 90); do
  if curl -sf "${HORIZON}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -sf "${HORIZON}/health" >/dev/null

echo "[soroban-e2e] Ensuring Stellar identity ${IDENTITY}"
if ! run_stellar keys address "${IDENTITY}" >/dev/null 2>&1; then
  run_stellar keys generate "${IDENTITY}"
fi
ADDR="$(run_stellar keys address "${IDENTITY}")"

echo "[soroban-e2e] Funding ${ADDR} via friendbot"
curl -sf "${HORIZON}/friendbot?addr=${ADDR}" >/dev/null || true

echo "[soroban-e2e] Building soroscan_core.wasm"
cd "${REPO_ROOT}/soroban-contracts/soroscan_core"
cargo build --target wasm32-unknown-unknown --release

WASM="target/wasm32-unknown-unknown/release/soroscan_core.wasm"
CONTAINER_WASM="/tmp/soroscan_core.wasm"

if [ -n "${CONTAINER}" ]; then
  docker cp "${WASM}" "${CONTAINER}:${CONTAINER_WASM}"
  WASM="${CONTAINER_WASM}"
fi

echo "[soroban-e2e] Deploying contract"
DEPLOY_OUTPUT="$(run_stellar contract deploy \
  --wasm "${WASM}" \
  --source "${IDENTITY}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK}")"
CONTRACT_ID="$(echo "${DEPLOY_OUTPUT}" | awk '{print $NF}')"
echo "${CONTRACT_ID}" > "${CONTRACT_FILE}"
echo "[soroban-e2e] Deployed contract id: ${CONTRACT_ID}"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "SOROSCAN_CONTRACT_ID=${CONTRACT_ID}" >> "${GITHUB_ENV}"
fi

echo "[soroban-e2e] Initializing contract"
run_stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source "${IDENTITY}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK}" \
  -- init --admin "${ADDR}"

echo "[soroban-e2e] Authorizing indexer"
run_stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source "${IDENTITY}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK}" \
  -- add_indexer --admin "${ADDR}" --indexer "${ADDR}"

PAYLOAD_HASH="0000000000000000000000000000000000000000000000000000000000000000"

echo "[soroban-e2e] Recording live Soroban event"
run_stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source "${IDENTITY}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${NETWORK}" \
  -- record_event \
  --indexer "${ADDR}" \
  --contract_id "${ADDR}" \
  --event_type transfer \
  --payload_hash "${PAYLOAD_HASH}"

echo "[soroban-e2e] Setup complete"
