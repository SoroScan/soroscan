# Contributing to SoroScan 🔍

Thank you for investing your time in contributing to SoroScan!

SoroScan is an open-source indexing layer designed to make Soroban smart contract data accessible and queryable. Whether you're fixing a bug, improving documentation, or building a new feature, we welcome your involvement.

---

## 🚀 Quick Links for Contributors

To make your onboarding process as smooth as possible, we have detailed guidelines for each stage of your contribution journey:

1. 🔰 **Getting Started**: Read the [Developer Onboarding Guide](docs/contributing/developer-onboarding.md) to set up your local environment in under 2 hours.
2. 🎨 **Code Style & Linting**: Adhere to our [Code Style Guidelines](docs/contributing/style-guide.md) (Python/Django, TypeScript/React, Rust, CSS, SQL).
3. 🌿 **Git & PR Workflows**: Follow our [Git & PR Workflow Guide](docs/contributing/git-and-pr-workflow.md) to learn about branching, Conventional Commits, and code reviews.
4. 📄 **Writing Documentation**: Check the [Documentation Contribution Guide](docs/contributing/documentation-guide.md) to learn how to edit docs and run the Docusaurus preview server.
5. 🤝 **Community & Code of Conduct**: Read our [Community Standards](docs/contributing/community-standards.md) to understand our issue labeling, triage workflows, and Code of Conduct.

---

## 🛠️ Overview of Our Development Workflow

For a quick reference, here are the core expectations for contributing:

### 1. Claiming an Issue
Before writing any code, find an issue in the **Issues** tab.
- Filter by `good-first-issue` if you are new.
- Comment **"I'd like to work on this!"** on the issue thread.
- Wait until a maintainer assigns the issue to you before starting work.

### 2. Branching & Commits
- Base your work on the `develop` branch.
- Use **Conventional Commits** for commit messages (e.g. `feat(ingest): add contract event parsing`, `fix(admin): repair network error handling`).

### 3. Running Code Validation
Before staging your commits, run the formatters and tests:

#### Python / Django:
```bash
cd django-backend
black .
ruff check .
pytest
```

#### TypeScript / Next.js:
```bash
cd soroscan-frontend
pnpm install
pnpm lint
pnpm test
```

#### Rust / Soroban:
```bash
cd soroban-contracts/soroscan_core
cargo fmt
cargo clippy -- -D warnings
cargo test
```

### 4. Submitting a Pull Request
- Open your PR against the `develop` branch of the upstream repository.
- Complete the PR description template.
- Ensure all CI workflows pass.
- Address code review comments constructively. Once resolved, the reviewer will approve the PR, and it will be merged via **Squash & Merge**.

---

## 📜 Code of Conduct

📜 Code of Conduct
By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

---

## 🎨 Component Library & Design System

SoroScan uses a **retro-futuristic terminal aesthetic** — phosphor green, deep black backgrounds, monospace fonts, and glowing effects. All frontend UI should be built with the terminal component library.

### Running Storybook

```bash
cd soroscan-frontend
pnpm storybook        # starts on http://localhost:6006
pnpm build-storybook  # static build → storybook-static/
```

### Design Tokens

Defined in `app/globals.css` via Tailwind v4 `@theme`:

| Token | Value | Usage |
|-------|-------|-------|
| `terminal-black` | `#0a0e27` | Default background |
| `terminal-green` | `#00ff41` | Primary text/borders/accents |
| `terminal-cyan` | `#00d4ff` | Secondary accents, labels |
| `terminal-danger` | `#ff3366` | Errors, destructive actions |
| `terminal-warning` | `#ffaa00` | Warnings, processing states |
| `glow-green` | `0 0 20px rgba(0,255,65,0.5)` | Green glow shadow |
| `glow-cyan` | `0 0 20px rgba(0,212,255,0.5)` | Cyan glow shadow |
| `font-terminal-mono` | JetBrains Mono, IBM Plex Mono | All code and UI text |

### Available Components

All components live in `components/terminal/`:

| Component | Description |
|-----------|-------------|
| `Button` | Terminal-style button with `>` prompt prefix on hover |
| `Card` | Box-drawing bordered card with scanline effect |
| `Table` / `TableRow` etc. | Terminal grid data table |
| `Input` | Input field with `>` prompt prefix |
| `Modal` | Modal with `[TITLE]` header bar |
| `Badge` | Glowing status badge with pulse dot |
| `Alert` | Left-bordered alert with `[INFO]` / `[ERR]` prefix |
| `CodeBlock` | Scrollable code block with copy button |
| `TerminalWindow` | Window frame with title bar and status dot |
| `TerminalTabs` (Tabs) | Tab navigation with active indicator |

### Adding a New Component

1. Create `components/terminal/MyComponent.tsx` following existing patterns.
2. Use only design tokens (`terminal-green`, `terminal-black`, etc.) — no hardcoded colors.
3. Create `components/terminal/MyComponent.stories.tsx` with at least a `Default` story.
4. Export from the component file; add `tags: ["autodocs"]` to the meta for auto-documentation.
5. Ensure keyboard focus styles are applied via `:focus-visible` (globally handled in `globals.css`).

### Accessibility Guidelines (WCAG 2.1 AA)

- Minimum 4.5:1 contrast ratio for normal text. Terminal green `#00ff41` on black `#0a0e27` meets this.
- All interactive elements must be keyboard accessible.
- Use semantic HTML (`button`, `input`, `table`, `[role="alert"]`).
- The `@storybook/addon-a11y` addon runs automated checks in Storybook — review the Accessibility panel.
By participating in this project, you agree to abide by our Code of Conduct to ensure SoroScan remains a respectful, safe, and supportive space for everyone. See the [Community Standards Guide](docs/contributing/community-standards.md) for details.
