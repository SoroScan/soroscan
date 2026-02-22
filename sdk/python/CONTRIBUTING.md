# Contributing to SoroScan SDK

Thank you for your interest in contributing to the SoroScan Python SDK!

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/soroscan/soroscan.git
cd soroscan/sdk/python
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install development dependencies:
```bash
pip install -e ".[dev]"
```

## Development Workflow

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=soroscan --cov-report=html

# Run specific test file
pytest tests/test_client.py -v
```

### Type Checking

We maintain 100% type hint coverage with strict mypy checking:

```bash
mypy soroscan/ --strict
```

### Linting and Formatting

We use Ruff for both linting and formatting:

```bash
# Check for issues
ruff check soroscan/ tests/

# Auto-fix issues
ruff check soroscan/ tests/ --fix

# Format code
ruff format soroscan/ tests/
```

### Running All Checks

```bash
make all
```

## Code Standards

1. **Type Hints**: All functions must have complete type hints
2. **Docstrings**: Public APIs require docstrings with parameter descriptions
3. **Testing**: New features require corresponding tests
4. **No `Any` Types**: Avoid using `Any` in return types or parameters
5. **Pydantic Models**: Use Pydantic v2 for all data models

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run all checks: `make all`
5. Commit with clear messages
6. Push and create a pull request

## Testing Guidelines

- Mock HTTP requests using `pytest-httpx`
- No live API calls in tests
- Test both success and error cases
- Maintain high test coverage (>90%)

## Questions?

Open an issue or reach out to team@soroscan.io
