# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository type: Node.js monorepo (npm workspaces, TypeScript, Vitest)
Node requirement: >= 20
Primary packages: packages/cli (end-user CLI), packages/core (backend/core runtime), packages/a2a-server (optional service), packages/vscode-ide-companion (VS Code companion)

Common commands
- Install deps (root and all workspaces)
  - npm ci

- Build (generates bundle and builds all workspaces when needed)
  - npm run build
  - Build VS Code companion only: npm run build:vscode
  - Build all (CLI/core + sandbox image + VS Code): npm run build:all
  - Build sandbox container image (skips npm install/build in packages): npm run build:sandbox

- Start CLI in development
  - npm start
  - Debug mode (Node inspector): npm run debug
  - Start the a2a server (on port 41242): npm run start:a2a-server

- Bundle CLI (esbuild + copy assets)
  - npm run bundle

- Lint and format
  - Lint all (TypeScript + integration-tests): npm run lint
  - Lint strict CI mode: npm run lint:ci
  - Auto-fix lint: npm run lint:fix
  - Format: npm run format

- Type checking
  - npm run typecheck

- Tests
  - Run all package unit tests: npm test
  - CI mode with coverage: npm run test:ci
  - Scripts tests (for scripts/*): npm run test:scripts
  - E2E shortcut (no sandbox): npm run test:e2e
  - Integration tests by sandbox target:
    - No sandbox: npm run test:integration:sandbox:none
    - Docker: npm run test:integration:sandbox:docker
    - Podman: npm run test:integration:sandbox:podman

Running a single test
- By workspace name (recommended):
  - CLI package (workspace name: agentic-cli)
    - npm run test -w agentic-cli -- --run packages/cli/src/path/to/file.test.ts
    - With name pattern: npm run test -w agentic-cli -- --run packages/cli/src/path/to/file.test.ts -t "should do X"
  - Core package (workspace name: agentic-cli-core)
    - npm run test -w agentic-cli-core -- --run packages/core/src/path/to/file.test.ts

- Alternatively from the package directory:
  - cd packages/cli && npx vitest run src/path/to/file.test.ts -t "should do X"

Workspace specifics and conventions
- ESM everywhere: type: "module" across packages. Use NodeNext module resolution per tsconfig. Avoid require(); eslint enforces import usage.
- License header enforcement: all ts/tsx/js files must include the Apache-2.0 header (eslint-plugin-license-header). Lint will fail if absent.
- Strict TS config: root tsconfig is strict; workspaces extend it and output to dist/. CLI and core expose dist/index.js as entry points for packaging.
- Engines: { node: ">=20" } enforced in packages.

Dev flows worth knowing
- scripts/start.js boots the CLI from source with DEV=true and passes CLI_VERSION from root package.json. Set DEBUG=1 to enable a Node inspector (adds --inspect-brk appropriately; when sandboxed, uses a bound port via DEBUG_PORT or default 9229).
- scripts/build.js ensures node_modules exists, runs codegen (generate-git-commit-info), builds all workspaces, and optionally builds the sandbox container if BUILD_SANDBOX=1/true.
- Integration tests are configured under integration-tests/ with vitest.config.ts (globalSetup, long timeouts, retries). Use GEMINI_SANDBOX env to control sandbox mode for those tests; npm scripts above set it for you.

High-level architecture and structure
- Monorepo layout (npm workspaces):
  - packages/cli (end-user terminal UI)
    - Purpose: user-facing CLI, input handling, UI rendering (Ink/React), options parsing (yargs), and developer UX.
    - Depends on: agentic-cli-core for model operations and tools execution.
  - packages/core (backend/runtime)
    - Purpose: API client and orchestration for Gemini, prompt/session management, tools registration and execution (FS, shell, web fetch, etc.), telemetry hooks, optional pty support.
    - Provides a clean interface used by the CLI for all model interactions and tool calls.
  - packages/a2a-server (optional service)
    - Purpose: auxiliary server for agent-to-agent or external integration workflows (Express-based), reuses the core runtime.
  - packages/vscode-ide-companion (optional)
    - Purpose: VS Code extension to connect the CLI to the editor workspace, expose commands (accept/cancel diffs, run CLI), and manage a thin local web server for communication.
  - packages/test-utils (internal dev helpers)
    - Purpose: shared testing utilities for unit/integration tests.
  - integration-tests/ (root-level)
    - Purpose: end-to-end and integration coverage. Driven by Vitest with configurable sandbox modes.

Interaction flow (summary)
- CLI (packages/cli) accepts user input and constructs requests to Core.
- Core (packages/core) builds prompts, talks to the Gemini API, and mediates tool execution. When a tool invocation is requested, Core prepares and (when needed) asks for user approval before running effects (filesystem, shell, network). Results are streamed back to the CLI for display.

Repository policies (from configs)
- Lint rules are strict and include:
  - Forbidding require() usage (prefer ESM imports).
  - Enforcing import hygiene (import/no-internal-modules with allowed exceptions), node: protocol usage where appropriate.
  - License header must appear at the top of all source files.
- Formatting is enforced via Prettier; CI runs format then lints (lint:ci) with no warnings allowed.

Notes for Windows (pwsh)
- All commands above work the same in PowerShell 7+. Use cross-env for setting env vars if you need to set them inline on Windows. The provided npm scripts already handle env variables portably where necessary.

Useful workspace script targets (direct)
- CLI (agentic-cli): build, start (node dist/index.js), debug (node --inspect-brk dist/index.js), lint, test, typecheck
- Core (agentic-cli-core): build, lint, test, typecheck
- A2A server (agentic-cli-a2a-server): start, build, lint, test, typecheck
- VS Code companion (agentic-cli-vscode-ide-companion): compile/watch, package, lint, test

Environment variables commonly used
- DEBUG=1: enable Node inspector for local dev (npm run debug)
- DEBUG_PORT: debugger port when running inside a sandbox
- GEMINI_SANDBOX: controls sandbox backend for integration tests (false|docker|podman)
- BUILD_SANDBOX=1 or true: triggers sandbox image build during npm run build

Recent Major Features Added
- Intelligent Ollama Model Selection System:
  - Model catalog with performance characteristics (speed, quality, memory)
  - Automatic task type detection (coding, debugging, creative writing, etc.)
  - Smart model recommendations based on prompt analysis and project context
  - User settings for auto vs manual model selection modes
  - /model command for listing, switching, and configuring models
  - Complete settings schema integration for persistent preferences

Key New Files for Model Selection:
- packages/core/src/config/modelCatalog.ts: Model definitions and task analysis
- packages/core/src/services/modelSelectionService.ts: Intelligent recommendation engine
- packages/cli/src/ui/commands/modelCommand.ts: User interface command
- packages/cli/src/config/settingsSchema.ts: Extended with model.selection settings

Model Selection Usage:
- /model: List all available models with performance indicators
- /model <name>: Switch to specific model (e.g., /model qwen3-coder)
- /model info <name>: Show detailed model information
- /model auto: Enable intelligent auto-selection based on task analysis
- /model manual: Lock to current/preferred model for all tasks

If a WARP.md already existed
- Updated with intelligent Ollama model selection system implementation details.

