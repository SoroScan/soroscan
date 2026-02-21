# SoroScan: Soroban Event Indexer 🔍

![Rust](https://img.shields.io/badge/Soroban-Rust-orange?style=for-the-badge&logo=rust) ![Django](https://img.shields.io/badge/Backend-Django-green?style=for-the-badge&logo=django) ![GraphQL](https://img.shields.io/badge/API-GraphQL-e535ab?style=for-the-badge&logo=graphql) ![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

[![Django CI](https://github.com/SoroScan/soroscan/actions/workflows/django.yml/badge.svg)](https://github.com/SoroScan/soroscan/actions/workflows/django.yml) [![Soroban CI](https://github.com/SoroScan/soroscan/actions/workflows/soroban.yml/badge.svg)](https://github.com/SoroScan/soroscan/actions/workflows/soroban.yml)

> **The Graph for Soroban — index, query, and subscribe to smart contract events.**

**SoroScan** is a developer-focused indexing service for Soroban smart contract events on the Stellar blockchain. It combines a Rust-based Soroban smart contract with a Django backend to provide real-time event ingestion, GraphQL/REST APIs, and webhook notifications.

Built for developers who need reliable event data without running their own infrastructure.

---

## ✨ Key Features

- **🦀 Soroban Native**: Rust smart contract with admin-controlled indexer whitelist and standardized event emission.
- **🐍 Django Backend**: Production-ready REST API with Django Rest Framework and PostgreSQL storage.
- **📊 GraphQL Playground**: Flexible event queries with Strawberry GraphQL — filter by contract, event type, ledger, or time range.
- **🔔 Webhook Subscriptions**: Real-time event notifications with HMAC-signed payloads via Celery + Redis.
- **⚡ Horizon Integration**: Stream ledger events directly from Stellar's Horizon API using `stellar-sdk`.

---

## 🏗️ Architecture Overview

SoroScan follows a **hybrid on-chain/off-chain pattern** for maximum flexibility and reliability.

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Soroban Contract  │────▶│   Django Backend     │────▶│   PostgreSQL    │
│   (Event Emitter)   │     │   (Ingestion Layer)  │     │   (Storage)     │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              REST API          GraphQL API       Webhooks
```

1. **Smart Contract**: Emits structured `EventRecord` events with admin-controlled access.
2. **Ingestion Layer**: Streams events from Horizon/Soroban RPC and persists to PostgreSQL.
3. **Query Layer**: Exposes data via REST, GraphQL, and push-based webhooks.

---

## 🗂️ Project Structure

```
soroscan/
├── soroban-contracts/        # Rust smart contracts
│   └── soroscan_core/        # Core indexing contract
│       └── src/lib.rs        # Contract logic & event emission
└── django-backend/           # Python backend API
    └── soroscan/
        └── ingest/           # Ingestion & API module
            ├── models.py     # TrackedContract, ContractEvent, WebhookSubscription
            ├── views.py      # REST API viewsets
            ├── schema.py     # GraphQL schema (Strawberry)
            ├── stellar_client.py  # Soroban RPC interaction
            └── tasks.py      # Celery webhook dispatcher
```

---

## 🚀 Quick Start

Get SoroScan running locally in under 5 minutes with Docker Compose.

### Prerequisites

- Docker and Docker Compose
- (Optional) Rust + Soroban CLI for contract development

### Using Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/SoroScan/soroscan.git
cd soroscan

# 2. Copy environment file and configure if needed
cp django-backend/.env.example django-backend/.env

# 3. Start all services (PostgreSQL, Redis, Django, Celery)
docker-compose up --build

# The backend will be available at:
# - REST API: http://localhost:8000/api/events/
# - GraphQL Playground: http://localhost:8000/graphql/
# - Django Admin: http://localhost:8000/admin/
```

That's it! The stack auto-runs migrations on startup and supports live code reloading.

**Port Conflicts?** Edit `django-backend/.env` and uncomment the port override variables.

### Manual Setup (Advanced)

<details>
<summary>Click to expand manual installation steps</summary>

#### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

#### 1. Set up the backend

```bash
cd django-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL to your local PostgreSQL instance

# Run migrations and start server
python manage.py migrate
python manage.py runserver
```

#### 2. Start Celery worker (separate terminal)

```bash
cd django-backend
source venv/bin/activate
celery -A soroscan worker --loglevel=info
```

#### 3. (Optional) Start Celery beat scheduler

```bash
cd django-backend
source venv/bin/activate
celery -A soroscan beat --loglevel=info
```

</details>

### Deploy the Smart Contract (Optional)

```bash
cd soroban-contracts/soroscan_core
cargo build --target wasm32-unknown-unknown --release

# Deploy to testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/soroscan_core.wasm \
  --network testnet

# Update SOROSCAN_CONTRACT_ID in django-backend/.env
```

---

## 🤝 Contributing

1. Fork the repository and create your feature branch.
2. Look for issues labeled `good-first-issue` or `help-wanted`.
3. Submit a PR referencing the issue.

---

## 🗺️ Roadmap

### Phase 1: Core Infrastructure (Current)
- [x] Soroban smart contract with event emission
- [x] Django backend with REST API
- [x] GraphQL schema with Strawberry
- [x] Webhook subscriptions with Celery

### Phase 2: Production Readiness
- [x] Docker Compose setup for local development
- [x] Kubernetes manifests for production deployment
- [ ] Rate limiting and API authentication
- [ ] Comprehensive test suite

### Phase 3: Advanced Features
- [ ] Multi-contract indexing dashboard
- [ ] Historical backfill from Horizon archives
- [ ] Real-time WebSocket subscriptions
- [ ] SDK packages (Python, JavaScript)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
