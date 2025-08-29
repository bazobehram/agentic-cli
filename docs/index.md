# Welcome to agentic-cli documentation

This documentation provides a comprehensive guide to installing, using, and developing agentic-cli. This tool lets you interact with AI models through a command-line interface.

## Project Vision

**agentic-cli** aims to transform the original Google Gemini CLI from a cloud-dependent tool into a fully **local, open-source, multi-agent development environment** that works entirely on your own machine without sending data to external services.

### 🎯 Core Goals:

1. **🏠 Local-First Architecture**: Replace Google Gemini API dependency with local LLM adapters (Ollama, etc.)
2. **🤖 Multi-Agent System**: Implement specialized agents (researcher, coder, critic) that can delegate tasks to each other
3. **🖥️ Warp.dev-Style Experience**: Rich Terminal UI (TUI) for monitoring agent workflows and interactions
4. **🔧 Comprehensive Toolset**: File operations, code execution, safe shell commands with user approval
5. **🔓 Fully Open Source**: Extensible architecture where users can easily add custom models, tools, and agents

### ✨ Key Features (Planned):
- **Privacy-First**: All processing happens locally, no data sent to external services
- **Agent Orchestration**: Multiple specialized AI agents working together
- **Visual Workflow**: Real-time TUI showing agent interactions and progress
- **Modular Design**: Easy to swap LLM backends, add new tools, or create custom agents
- **Developer-Friendly**: Built by and for developers who want control and transparency

## Overview

agentic-cli brings the capabilities of AI models to your terminal in an interactive Read-Eval-Print Loop (REPL) environment. The system consists of a client-side application (`packages/cli`) that communicates with a local server (`packages/core`), which manages requests to AI models and provides various tools for tasks such as performing file system operations, running shells, and web fetching.

## Navigating the documentation

This documentation is organized into the following sections:

- **[Execution and Deployment](./deployment.md):** Information for running Gemini CLI.
- **[Architecture Overview](./architecture.md):** Understand the high-level design of Gemini CLI, including its components and how they interact.
- **CLI Usage:** Documentation for `packages/cli`.
  - **[CLI Introduction](./cli/index.md):** Overview of the command-line interface.
  - **[Commands](./cli/commands.md):** Description of available CLI commands.
  - **[Configuration](./cli/configuration.md):** Information on configuring the CLI.
  - **[Checkpointing](./checkpointing.md):** Documentation for the checkpointing feature.
  - **[Extensions](./extension.md):** How to extend the CLI with new functionality.
  - **[IDE Integration](./ide-integration.md):** Connect the CLI to your editor.
  - **[Telemetry](./telemetry.md):** Overview of telemetry in the CLI.
- **Core Details:** Documentation for `packages/core`.
  - **[Core Introduction](./core/index.md):** Overview of the core component.
  - **[Tools API](./core/tools-api.md):** Information on how the core manages and exposes tools.
- **Tools:**
  - **[Tools Overview](./tools/index.md):** Overview of the available tools.
  - **[File System Tools](./tools/file-system.md):** Documentation for the `read_file` and `write_file` tools.
  - **[Multi-File Read Tool](./tools/multi-file.md):** Documentation for the `read_many_files` tool.
  - **[Shell Tool](./tools/shell.md):** Documentation for the `run_shell_command` tool.
  - **[Web Fetch Tool](./tools/web-fetch.md):** Documentation for the `web_fetch` tool.
  - **[Web Search Tool](./tools/web-search.md):** Documentation for the `google_web_search` tool.
  - **[Memory Tool](./tools/memory.md):** Documentation for the `save_memory` tool.
- **[Contributing & Development Guide](../CONTRIBUTING.md):** Information for contributors and developers, including setup, building, testing, and coding conventions.
- **[NPM](./npm.md):** Details on how the project's packages are structured
- **[Troubleshooting Guide](./troubleshooting.md):** Find solutions to common problems and FAQs.
- **[Terms of Service and Privacy Notice](./tos-privacy.md):** Information on the terms of service and privacy notices applicable to your use of Gemini CLI.
- **[Releases](./releases.md):** Information on the project's releases and deployment cadence.

We hope this documentation helps you make the most of the Gemini CLI!
