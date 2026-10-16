#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
  echo "Stopping local Docker Compose stack..."
  docker compose down -v
  echo "Starting the stack again with clean volumes..."
  docker compose up -d --build
  echo "Stack restart complete. Use 'docker compose ps' to verify services."
  exit 0
fi

echo "docker compose or docker-compose.yml not found."
echo "To reset a local Django database, run this manually from django-backend/"
echo "  source .venv/bin/activate"
echo "  python manage.py flush --no-input"
exit 1
