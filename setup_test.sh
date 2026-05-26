#!/usr/bin/env bash

set -euo pipefail

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

copy_test_files() {
  mkdir -p "$TMP_DIR/django-backend"
  cp ./setup.sh "$TMP_DIR/setup.sh"
  chmod +x "$TMP_DIR/setup.sh"
  cat > "$TMP_DIR/django-backend/.env.example" <<'EOF'
SECRET_KEY=django-insecure-change-this-in-production
DATABASE_URL=postgresql://postgres:postgres@db:5432/soroscan
REDIS_URL=redis://redis:6379/0
EOF
}

run_test() {
  pushd "$TMP_DIR" >/dev/null
  bash ./setup.sh --no-start

  if [ ! -f django-backend/.env ]; then
    echo 'FAIL: .env file was not created.'
    exit 1
  fi

  local secret
  secret=$(grep -E '^SECRET_KEY=' django-backend/.env | head -n1 | cut -d'=' -f2-)
  if [ -z "$secret" ] || [ "$secret" = "django-insecure-change-this-in-production" ]; then
    echo 'FAIL: SECRET_KEY was not generated correctly.'
    exit 1
  fi

  echo 'PASS: .env created and SECRET_KEY generated.'

  echo 'SECRET_KEY=existing-secret' > django-backend/.env
  bash ./setup.sh --no-start
  local updated_secret
  updated_secret=$(grep -E '^SECRET_KEY=' django-backend/.env | head -n1 | cut -d'=' -f2-)
  if [ "$updated_secret" != "existing-secret" ]; then
    echo 'FAIL: Existing SECRET_KEY should be preserved.'
    exit 1
  fi

  echo 'PASS: Existing SECRET_KEY is preserved.'
  popd >/dev/null
}

copy_test_files
run_test

echo 'All setup script tests passed.'
