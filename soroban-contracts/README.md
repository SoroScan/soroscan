# Soroban Contracts

This folder contains all Soroban smart contracts for SoroScan.

## Contracts

### soroscan_core

The core contract that:
- Accepts event submissions from authorized indexers
- Emits standardized events for off-chain consumption
- Stores event counters and latest events by type

## Building

```bash
cd soroscan_core
cargo build --target wasm32-unknown-unknown --release
```

## Testing

```bash
cargo test
```

## Deploying to Testnet

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroscan_core.wasm \
  --source <YOUR_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```
