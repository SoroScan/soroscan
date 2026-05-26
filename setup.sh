#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ENV_DIR="$ROOT_DIR/django-backend"
ENV_FILE="$ENV_DIR/.env"
ENV_EXAMPLE="$ENV_DIR/.env.example"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
NO_START=false
DRY_RUN=false

function echo_error() {
  echo "ERROR: $*" >&2
}

function echo_info() {
  echo "INFO: $*"
}

function usage() {
  cat <<'EOF'
Usage: ./setup.sh [--help] [--no-start] [--dry-run]

Bootstraps the local SoroScan development environment using Docker Compose.

Options:
  --help      Show this help message and exit.
  --no-start  Prepare configuration files but do not launch Docker Compose.
  --dry-run   Prepare configuration and print the Docker Compose command.
EOF
}

function command_exists() {
  command -v "$1" >/dev/null 2>&1
}

function generate_secret_key() {
  if command_exists python3; then
    python3 - <<'PY'
import secrets, base64
print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))
PY
  elif command_exists python; then
    python - <<'PY'
import secrets, base64
print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('='))
PY
  elif command_exists openssl; then
    openssl rand -base64 32 | tr -d '\n='
  else
    echo_error 'Python or OpenSSL is required to generate a SECRET_KEY.'
    exit 1
  fi
}

function select_docker_compose() {
  if command_exists docker && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
    return 0
  fi

  if command_exists docker-compose; then
    echo "docker-compose"
    return 0
  fi

  echo_error 'Docker Compose is required. Install Docker Compose or use Docker Engine with the Compose plugin.'
  exit 1
}

function ensure_env_file() {
  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo_error "Missing environment example: $ENV_EXAMPLE"
    exit 1
  fi

  if [ ! -f "$ENV_FILE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo_info "Created $ENV_FILE from $ENV_EXAMPLE."
  else
    echo_info "$ENV_FILE already exists. Leaving existing configuration in place."
  fi

  local current_secret
  if grep -qE '^SECRET_KEY=' "$ENV_FILE"; then
    current_secret=$(grep -E '^SECRET_KEY=' "$ENV_FILE" | head -n1 | cut -d'=' -f2-)
  else
    current_secret=""
  fi

  if [ -z "$current_secret" ] || [ "$current_secret" = "django-insecure-change-this-in-production" ]; then
    local secret
    secret="$(generate_secret_key)"
    if grep -qE '^SECRET_KEY=' "$ENV_FILE"; then
      sed -i.bak -E "s|^SECRET_KEY=.*|SECRET_KEY=$secret|" "$ENV_FILE"
      rm -f "$ENV_FILE.bak"
      echo_info "Updated SECRET_KEY in $ENV_FILE."
    else
      echo "SECRET_KEY=$secret" >> "$ENV_FILE"
      echo_info "Appended SECRET_KEY to $ENV_FILE."
    fi
  else
    echo_info "SECRET_KEY already set in $ENV_FILE."
  fi
}

function start_services() {
  if [ ! -f "$COMPOSE_FILE" ]; then
    echo_error "Missing Docker Compose file: $COMPOSE_FILE"
    exit 1
  fi

  local compose_cmd
  compose_cmd="$(select_docker_compose)"

  if [ "$DRY_RUN" = true ]; then
    echo_info "Docker Compose command: $compose_cmd -f $COMPOSE_FILE up -d --build"
    return 0
  fi

  echo_info "Starting services with Docker Compose..."
  eval "$compose_cmd -f '$COMPOSE_FILE' up -d --build"
  echo_info "Services started."
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help)
      usage
      exit 0
      ;;
    --no-start)
      NO_START=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

ensure_env_file

if [ "$NO_START" = true ] || [ "$DRY_RUN" = true ]; then
  echo_info "Bootstrap completed."
  if [ "$NO_START" = true ]; then
    echo_info "Run './setup.sh' again to launch Docker Compose services."
  fi
  exit 0
fi

start_services

echo_info "SoroScan local development environment is ready."
echo_info "- Django API: http://localhost:8000"
echo_info "- Frontend: http://localhost:3000"
echo_info "Run 'docker compose ps' or 'docker-compose ps' to inspect containers."
