# Deployment: Docker Compose

Running SoroScan locally or in a simple production environment is easiest with **Docker Compose**. This setup includes the Django backend, Celery workers, Redis, PostgreSQL, and the React frontend.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

## Quick Start

### 1. Bootstrap the environment

Run the supplied setup script from the repository root:
```bash
./setup.sh
```

This command will create `django-backend/.env` from `django-backend/.env.example`, generate a secure `SECRET_KEY` if needed, and launch the Docker Compose services.

If you prefer not to start services immediately, use:
```bash
./setup.sh --no-start
```

This will start:
- **db**: PostgreSQL database.
- **redis**: Task queue broker.
- **web**: Main Django API server (available at port `8000`).
- **worker**: Celery worker for background indexing tasks.
- **beat**: Celery beat for scheduled tasks.
- **frontend**: SoroScan Dashboard (available at port `3000`).

### 3. Verify Deployment

Check the status of the containers:
```bash
docker-compose ps
```

Visit `http://localhost:3000` to access the dashboard.

## Management Commands

### Run Migrations
```bash
docker-compose exec web python manage.py migrate
```

### Create Superuser
```bash
docker-compose exec web python manage.py createsuperuser
```

### View Logs
```bash
docker-compose logs -f web
```

## Troubleshooting

- **Database Connection Errors**: Ensure the `db` container is healthy before the `web` container starts.
- **Port Conflicts**: If port `8000` or `3000` is already in use, modify the `ports` section in `docker-compose.yml`.
- **Environment Variables**: Double-check `.env` for incorrect database URLs or missing secrets.
