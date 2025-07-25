# Firefly Instructions

## Overview

**Firefly** is a CLI orchestrator designed for semantic versioning, changelog generation, and automated releases. It enables precise control over release workflows, supports safe rollbacks, and promotes modular task execution. This document defines the development and coding standards for Firefly, ensuring code quality, maintainability, and consistency.

## Architecture

Firefly adopts a **Hexagonal Architecture** to separate pure logic from side effects:

```
src/
├── core/           # Pure domain logic: deterministic, no side effects
├── application/    # Use cases: orchestrates tasks, manages versioning flows
├── infrastructure/ # Integrations: Git, filesystem, GitHub, CLI, etc.
├── shared/         # Utilities: logging, errors, common types, constants
```

### Architectural Guidelines

- `core/`: Contains timeless, pure logic. May reference types from other layers for boundaries or interoperability.
- `application/`: Implements use cases, coordinates tasks, manages rollbacks, and mediates between core and infrastructure.
- `infrastructure/`: Handles side effects such as file I/O, Git operations, and CLI interactions.
- `shared/`: Provides stateless utilities, error definitions, typed results, and constants.

## Task Orchestration Pattern

All business logic flows through the **Task System**:
- Tasks implement `Task` interface (`execute()`, `undo()`, `getName()`, `getDescription()`, `isUndoable?()`)
- `TaskOrchestratorService` runs tasks sequentially with automatic rollback on failure
- `ApplicationContext` carries shared state and configuration between tasks
- Example task sequence: PreflightCheck → DetermineNextVersion → BumpVersion → GenerateChangelog → CreateCommit → CreateTag → PushChanges → CreateRelease

## Operating Principles

- Firefly is **Bun-only**; Node.js is not supported. Use Bun-native APIs where possible.
- CLI arguments (via [`commander`](https://github.com/tj/commander.js)) and file-based configuration (via [`c12`](https://github.com/unjs/c12)) are unified. CLI values override configuration files when both are present.
- Changelog generation uses [`git-cliff`](https://github.com/orhun/git-cliff). Parse its TOML config with [`smol-toml`](https://github.com/akheron/smol-toml).
- Use `conventional-recommended-bump` to infer version changes from commit history. Also support manual version selection.
- Handle errors exclusively through [`neverthrow`](https://github.com/supermacro/neverthrow). No `throw` in coordinated flows.

## Development Workflows

### Running & Building
- **Development**: `bun run dev` (runs `src/infrastructure/cli/main.ts` directly)
- **Build**: `bun run build` (uses `tsdown` + post-build Bun pragma insertion)
- **Linting**: `bun run check` (Biome with ultracite config), `check:write` for fixes
- **Type checking**: `bun run typecheck`

### Path Resolution & Imports
- Use `#/` path alias for all internal imports (mapped to `./src/*` in tsconfig)
- Examples: `#/shared/utils/result.util`, `#/application/context`, `#/core/domain/version`
- JSON imports require `with { type: "json" }` (e.g., `package.json`)

## Design Guidelines

### Class & Function Design

* **Group by Behavior, not by Type**: Co-locate related behaviors rather than abstract by class/interface layers.
* **Small Units**: Prefer functions under 30 LOC. Keep methods single-responsibility and easy to test.
* **Favor Composition**: Model behavior through services, not inheritance trees.
* **Use Guard Clauses**: Reduce nesting by checking edge cases early and returning.

## Development Standards

### Functional Boundaries

- Every module should have a **clear boundary**: know what it owns, what it exposes, and what it depends on.
- Do not write "god files" that accumulate unrelated logic or touch too many layers.
- Avoid circular dependencies, excessive indirection, and nesting more than 3 levels deep.

### Type Safety

* Use `zod`, and `strict interfaces` at integration points.
- Internal modules should assume validated data and rely on the type system, not runtime checks.
- Configuration schema in `infrastructure/config/schema.ts` uses Zod with custom validation logic

### Result Handling

- Use `FireflyResult<T>` and `AsyncFireflyResult<T>` types from `shared/utils/result.util.ts`, derived from `neverthrow` for consistent error handling and result propagation.
    - Use `FireflyResult` for synchronous results, when the value is immediately available and does not require awaiting.
    - Use `AsyncFireflyResult` for asynchronous results, when the value is produced by an async operation and you must await it before accessing the value or error.
- Always map errors to a descriptive domain-specific `FireflyError` (see `shared/utils/error.util.ts` for error hierarchy)
- Never mix `throw` and `try/catch` with `Result` in the same code path.
- DONT USE `trycatch` WHATSOVER, PREFER `neverthrow` RESULT HANDLING.

### Port & Adapter Pattern

- Ports define interfaces in `core/ports/` (e.g., `GitProviderPort`, `PackageJsonPort`)
- Adapters implement ports in `infrastructure/adapters/` with specific technologies
- Services in `infrastructure/services/` provide factory functions and higher-level abstractions

## Coding Principles & Patterns

- Limit the use of comments. Code should read like prose. Code explains how, comments explain why.
- Use defensive programming: validate and check types at boundaries.
- Define interfaces that do only what is needed. Avoid over-abstraction or "god interfaces".
- Avoid mutating state unless explicitly modeling it. Prefer copying or producing new values.
- Structure for navigability. Group related files by feature, not just layer.