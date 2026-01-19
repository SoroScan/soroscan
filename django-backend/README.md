# SoroScan Django Backend

REST and GraphQL API for indexing Soroban smart contract events.

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

## Environment Variables

Create a `.env` file:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://user:pass@localhost:5432/soroscan
REDIS_URL=redis://localhost:6379/0

# Stellar
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROSCAN_CONTRACT_ID=CCAAAA...
INDEXER_SECRET_KEY=SCXXXX...
```

## Running Celery Workers

```bash
# Start worker
celery -A soroscan worker -l info

# Start beat scheduler
celery -A soroscan beat -l info
```

## API Endpoints

- `POST /api/ingest/record/` - Record a new event
- `GET /api/events/` - List events
- `GET /api/contracts/` - List tracked contracts
- `POST /graphql/` - GraphQL endpoint
