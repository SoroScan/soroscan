.PHONY: install test lint type-check format clean build publish

install:
	pip install -e ".[dev]"

test:
	pytest tests/ -v --cov=soroscan --cov-report=html --cov-report=term

lint:
	ruff check soroscan/ tests/

format:
	ruff format soroscan/ tests/

type-check:
	mypy soroscan/ --strict

clean:
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache .coverage htmlcov/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

build: clean
	python -m build

publish: build
	python -m twine upload dist/*

all: format lint type-check test
